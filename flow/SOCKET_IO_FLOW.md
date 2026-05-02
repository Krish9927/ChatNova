# ChatNova — Socket.IO Flow

---

## Overview

Socket.IO is used for two things:
1. Real-time online presence (who is currently online)
2. Real-time message delivery (push new messages without polling)

---

## Files Involved

| File | Role |
|------|------|
| `backend/src/lib/socket.js` | Creates the Socket.IO server, manages `userSocketMap`, emits online users |
| `backend/src/middleware/socket.auth.middleware.js` | Authenticates every socket connection via JWT cookie |
| `backend/src/controllers/message.controller.js` | Emits `newMessage` to receiver (and sender's other tabs) after saving to DB |
| `frontend/src/store/useAuthStore.js` | Creates the client socket, connects/disconnects, listens for `getOnlineUsers` |
| `frontend/src/store/useChatStore.js` | Subscribes/unsubscribes to `newMessage` per active conversation |

---

## 1. Connection Flow

```
User logs in / page loads (checkAuth)
        ↓
useAuthStore.connectSocket()
        ↓
io(BASE_URL, { withCredentials: true })   ← sends JWT cookie automatically
        ↓
─────────────── SERVER ───────────────
socketAuthMiddleware runs:
  1. Extract JWT from cookie header
  2. jwt.verify(token, JWT_SECRET)
  3. User.findById(decoded.userId)
  4. Attach socket.user & socket.userId
  5. next()  ← allow connection
─────────────────────────────────────
        ↓
io.on("connection", socket => ...)
  userSocketMap[userId] = socket.id
  io.emit("getOnlineUsers", [...userIds])
        ↓
─────────────── CLIENT ───────────────
socket.on("getOnlineUsers", userIds)
  → useAuthStore.onlineUsers = userIds
  → Online dot shown in UI
```

---

## 2. Disconnection Flow

```
User logs out / closes tab
        ↓
useAuthStore.disconnectSocket()
  socket.removeAllListeners()
  socket.disconnect()
  set({ socket: null, onlineUsers: [] })
        ↓
─────────────── SERVER ───────────────
socket.on("disconnect")
  delete userSocketMap[userId]
  io.emit("getOnlineUsers", [...remaining])
─────────────────────────────────────
        ↓
All other clients update their online list
```

---

## 3. Send Message Flow

```
User types message → clicks Send
        ↓
useChatStore.sendMessage(messageData)
        ↓
Optimistic update:
  tempMessage added to messages[] immediately
  (UI shows message instantly, no waiting)
        ↓
POST /api/messages/send/:receiverId
        ↓
─────────────── SERVER ───────────────
message.controller.sendMessage()
  1. Validate text/image + receiverId
  2. Upload image to Cloudinary (if any)
  3. new Message({ senderId, receiverId, text, image })
  4. message.save() → MongoDB
        ↓
  getReceiverSocketId(receiverId)
  → io.to(receiverSocketId).emit("newMessage", message)

  getReceiverSocketId(senderId)
  → io.to(senderSocketId).emit("newMessage", message)
     (covers sender's other open tabs/devices)
        ↓
  res.status(201).json(newMessage)
─────────────────────────────────────
        ↓
Client receives 201 response:
  Replace tempMessage with real message from server
  (real _id, createdAt, etc.)
```

---

## 4. Receive Message Flow (Receiver's Side)

```
─────────────── SERVER ───────────────
io.to(receiverSocketId).emit("newMessage", message)
─────────────────────────────────────
        ↓
─────────────── CLIENT ───────────────
socket.on("newMessage", newMessage)   ← subscribeToMessages()
        ↓
Is newMessage.senderId === selectedUser._id?
  ├── NO  → ignore (different conversation open)
  └── YES →
        set({ messages: [...messages, newMessage] })
        ↓
        isSoundEnabled?
          └── YES → play notification.mp3
```

---

## 5. Subscribe / Unsubscribe Lifecycle

```
User opens a conversation
        ↓
ChatContainer mounts
  useChatStore.subscribeToMessages()
  → socket.on("newMessage", handler)
        ↓
User switches to another conversation
        ↓
ChatContainer unmounts (useEffect cleanup)
  useChatStore.unsubscribeFromMessages()
  → socket.off("newMessage")
        ↓
New conversation mounts
  subscribeToMessages() re-runs with new selectedUser
```

---

## 6. userSocketMap — Online Presence Store

```
Server memory (not DB):

userSocketMap = {
  "userId_A": "socketId_abc",
  "userId_B": "socketId_xyz",
  ...
}

Used by getReceiverSocketId(userId)
  → returns socketId or undefined (user offline)

If undefined → message saved to DB only
             → receiver gets it on next load (no real-time push)
```

---

## 7. Authentication — How JWT Reaches the Socket

```
Browser stores JWT as httpOnly cookie
        ↓
socket.io client connects with { withCredentials: true }
        ↓
Cookie is sent automatically in the handshake headers
        ↓
socketAuthMiddleware reads:
  socket.handshake.headers.cookie
    → split by "; "
    → find row starting with "jwt="
    → extract token value
        ↓
jwt.verify(token, JWT_SECRET)
        ↓
User.findById(decoded.userId)
        ↓
socket.user = user
socket.userId = user._id.toString()
```

---

## 8. Full End-to-End Sequence

```
[User A]                    [Server]                   [User B]
   |                           |                           |
   |── login ─────────────────>|                           |
   |<─ JWT cookie ─────────────|                           |
   |                           |                           |
   |── socket connect ────────>|                           |
   |   (cookie auto-sent)      |── verify JWT             |
   |                           |── userSocketMap[A]=sid_A  |
   |                           |── emit getOnlineUsers ───>| (all clients)
   |<─ getOnlineUsers ─────────|                           |
   |                           |                           |
   |── POST /messages/send/B ─>|                           |
   |                           |── save to MongoDB         |
   |                           |── emit newMessage ───────>| (to B's socket)
   |                           |── emit newMessage ────────| (to A's other tabs)
   |<─ 201 { message } ────────|                           |
   |   replace optimistic msg  |                           |
   |                           |           socket.on("newMessage")
   |                           |           append to messages[]
   |                           |           play notification.mp3
```
