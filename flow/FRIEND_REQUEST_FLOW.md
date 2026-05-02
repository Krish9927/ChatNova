# ChatNova — Friend Request System

---

## Why This Change

Before: Contacts tab showed ALL users in the database — anyone could message anyone.
After: You can only chat with people who have accepted your friend request (or vice versa).

---

## New Files

| File | Purpose |
|------|---------|
| `backend/src/models/FriendRequest.js` | FriendRequest schema (sender, receiver, status) |
| `backend/src/controllers/friend.controller.js` | All friend request logic |
| `backend/src/routes/friend.route.js` | API routes for friend system |
| `frontend/src/store/useFriendStore.js` | Zustand store for friends, requests, search |

## Modified Files

| File | Change |
|------|--------|
| `backend/src/server.js` | Registered `/api/friends` route |
| `frontend/src/components/ContactList.jsx` | Replaced flat list with 3-tab friend system |
| `frontend/src/pages/ChatPage.jsx` | Subscribe to friend socket events on mount |

---

## FriendRequest Schema

```javascript
FriendRequest {
  sender:   ObjectId → User,
  receiver: ObjectId → User,
  status:   "pending" | "accepted" | "rejected",
  createdAt, updatedAt
}

// Unique index prevents duplicate requests:
{ sender: 1, receiver: 1 } unique
```

---

## API Routes

```
GET  /api/friends              → get accepted friends list
GET  /api/friends/pending      → get incoming pending requests
GET  /api/friends/sent         → get outgoing pending requests
GET  /api/friends/search?q=... → search users (excludes friends + pending)
POST /api/friends/request      → send friend request { receiverId }
PUT  /api/friends/request/:id  → accept/reject { action: "accept"|"reject" }
```

---

## Send Request Flow

```
User opens Contacts → "Find People" tab
        ↓
Types username/email in search box
        ↓
GET /api/friends/search?q=krishna
  → excludes: self, existing friends, pending requests
  → returns matching users
        ↓
User clicks "Add" button
        ↓
POST /api/friends/request { receiverId }
  → check not already friends/pending
  → new FriendRequest({ sender, receiver, status: "pending" })
  → save to MongoDB
        ↓
  getReceiverSocketId(receiverId)
  → io.to(socket).emit("friendRequest", request)
        ↓
res.status(201).json(request)
        ↓
Sender: button changes to "Sent ⏱" (sentRequests updated)
Receiver: toast "Krishna sent you a friend request 👋"
          Requests tab badge increments
```

---

## Accept/Reject Flow

```
Receiver opens Contacts → "Requests" tab
        ↓
Sees pending request with Accept ✓ / Reject ✗ buttons
        ↓
Clicks Accept ✓
        ↓
PUT /api/friends/request/:id { action: "accept" }
  → request.status = "accepted"
  → request.save()
        ↓
  getReceiverSocketId(sender._id)
  → io.to(socket).emit("friendRequestAccepted", request)
        ↓
res.status(200).json(request)
        ↓
Receiver:
  pendingRequests.filter(r !== requestId)
  friends.push(newFriend)
  → friend appears in Friends tab
  → can now open chat

Sender (via socket):
  sentRequests.filter(r !== requestId)
  friends.push(newFriend)
  toast "Krishna accepted your request ✓"
  → can now open chat
```

---

## Contacts Tab — 3 Sub-tabs

```
┌──────────────────────────────────────────┐
│  [Friends 3]  [Requests 1]  [Find People] │
└──────────────────────────────────────────┘

Friends tab:
  - List of accepted contacts
  - Click → opens DM chat
  - Online dot shown

Requests tab:
  - Incoming pending requests
  - Accept ✓ / Reject ✗ buttons
  - Badge shows count

Find People tab:
  - Search input (debounced 350ms)
  - Results exclude: self, friends, pending
  - "Add" button → sends request
  - "Sent ⏱" shown if already sent
```

---

## Socket Events

```
SERVER → CLIENT:

"friendRequest"         { request }   → new incoming request
"friendRequestAccepted" { request }   → your sent request was accepted
```

---

## Search Exclusion Logic

```javascript
// Users excluded from search results:
1. Self (myId)
2. Already accepted friends
3. Users with pending requests (sent OR received)

// Only shows verified users
// Matches username OR email (case-insensitive regex)
// Limit: 20 results
```

---

## Before vs After

```
BEFORE:
  Contacts tab → shows ALL users in DB
  Anyone can message anyone immediately

AFTER:
  Contacts tab → shows only accepted friends
  To chat with someone:
    1. Find them in "Find People"
    2. Send request
    3. They accept
    4. Both can now chat
```
