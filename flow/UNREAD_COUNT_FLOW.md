# ChatNova — Unread Message Count Flow

---

## What Was Added

| File | Change |
|------|--------|
| `frontend/src/store/useChatStore.js` | Added `unreadDM: {}`, updated `setSelectedUser` to clear count, updated `subscribeToMessages` to increment count |
| `frontend/src/store/useGroupStore.js` | Added `unreadGroup: {}`, updated `setSelectedGroup` to clear count, updated `newGroupMessage` handler to increment count |
| `frontend/src/components/ChatsList.jsx` | Shows cyan badge on DM and group items |
| `frontend/src/components/GroupsList.jsx` | Shows cyan badge on group items |
| `frontend/src/pages/ChatPage.jsx` | Subscribes to DM messages globally on mount |

---

## State Shape

```javascript
// useChatStore
unreadDM = {
  "userId_A": 3,   // 3 unread messages from User A
  "userId_B": 1,   // 1 unread from User B
}

// useGroupStore
unreadGroup = {
  "groupId_X": 5,  // 5 unread in Group X
  "groupId_Y": 2,  // 2 unread in Group Y
}
```

---

## DM Unread Count Flow

```
User B sends message to User A
        ↓
SERVER: io.to(userA_socketId).emit("newMessage", msg)
        ↓
CLIENT (User A):
  socket.on("newMessage", msg)
        ↓
  Is msg.senderId === selectedUser._id?
  ├── YES (chat is open) → append to messages[], no count change
  └── NO  (chat not open) →
        unreadDM[senderId] += 1
        → badge shows on User B's item in sidebar
        ↓
User A clicks on User B in sidebar
        ↓
setSelectedUser(userB)
  → delete unreadDM[userB._id]
  → badge disappears ✓
```

---

## Group Unread Count Flow

```
Member sends message to Group X
        ↓
SERVER: emit "newGroupMessage" to all members EXCEPT sender
        ↓
CLIENT (other members):
  socket.on("newGroupMessage", msg)
        ↓
  Is selectedGroup._id === msg.groupId?
  ├── YES (group is open) → append to groupMessages[], no count change
  └── NO  (group not open) →
        unreadGroup[groupId] += 1
        → badge shows on Group X in sidebar
        ↓
Member clicks on Group X
        ↓
setSelectedGroup(groupX)
  → delete unreadGroup[groupX._id]
  → badge disappears ✓
```

---

## Badge UI

```
Layout (WhatsApp-style):
  [Avatar]  [Name          ] [🔵 3]
            [Online/Offline]

Cyan pill badge, right side of each item:
  1-99  → shows exact number
  100+  → shows "99+"

Bold name when unread > 0 (text-white instead of text-slate-200)

Styling:
  min-w-[20px] h-5 px-1.5
  rounded-full bg-cyan-500
  text-white text-xs font-bold
  flex items-center justify-center
```

---

## Why Subscribe Globally (not per-conversation)

```
OLD approach (broken for unread counts):
  subscribeToMessages() called only when ChatContainer mounts
  → only works when a conversation is open
  → if no conversation open, socket events are missed
  → unread counts never increment

NEW approach (correct):
  subscribeToMessages() called from ChatPage on mount
  → always listening, regardless of which conversation is open
  → unread counts work even when sidebar is showing
```

---

## Clear on Open

```javascript
// useChatStore
setSelectedUser: (user) => {
  if (user) {
    const unreadDM = { ...s.unreadDM };
    delete unreadDM[user._id];          // ← clear count
    return { selectedUser: user, unreadDM };
  }
  return { selectedUser: user };
}

// useGroupStore
setSelectedGroup: (group) => {
  if (group) {
    const unreadGroup = { ...s.unreadGroup };
    delete unreadGroup[group._id];      // ← clear count
    return { selectedGroup: group, groupMessages: [], unreadGroup };
  }
  return { selectedGroup: group, groupMessages: [] };
}
```

Counts are cleared the moment the user clicks — no server round-trip needed.
Counts reset on page reload (stored in memory only, not localStorage).
