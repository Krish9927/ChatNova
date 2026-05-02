# ChatNova — Group Chat Feature Flow

---

## What Was Added

| File | Purpose |
|------|---------|
| `backend/src/models/Group.js` | Group schema (name, admin, members[]) |
| `backend/src/models/Message.js` | Added `groupId` field (null for DMs, set for group messages) |
| `backend/src/controllers/group.controller.js` | All group CRUD + message send/receive |
| `backend/src/routes/group.route.js` | All group API routes |
| `backend/src/server.js` | Registered `/api/groups` route |
| `frontend/src/store/useGroupStore.js` | Zustand store for groups + socket subscriptions |
| `frontend/src/components/CreateGroupModal.jsx` | Modal to create group + pick members |
| `frontend/src/components/GroupChatContainer.jsx` | Group chat UI with messages, translation, voice input |
| `frontend/src/components/GroupsList.jsx` | Sidebar groups list + "New Group" button |
| `frontend/src/pages/ChatPage.jsx` | Added Groups tab, wired GroupChatContainer |

---

## Group Schema

```javascript
Group {
  name: String,           // "Study Group"
  description: String,    // optional
  avatar: String,         // Cloudinary URL, optional
  admin: ObjectId → User, // creator, has special powers
  members: [ObjectId],    // includes admin
  createdAt, updatedAt
}
```

---

## Message Schema (Updated)

```javascript
Message {
  senderId: ObjectId → User,   // always set
  receiverId: ObjectId → User, // set for DMs, null for group
  groupId: ObjectId → Group,   // set for group, null for DMs
  text: String,
  image: String,
  audio: String,
  createdAt, updatedAt
}
```

DM message:    `{ senderId, receiverId, text }`  — groupId = null
Group message: `{ senderId, groupId, text }`     — receiverId = null

> **Bug fixed:** `getChatPartners` was calling `msg.receiverId.toString()` on group
> messages where `receiverId = null` → `Cannot read properties of null`.
> Fix: query with `{ groupId: null }` to exclude group messages, plus a
> `.filter(msg => msg.receiverId != null)` guard before mapping.

---

## API Routes

```
POST   /api/groups                    → create group
GET    /api/groups                    → get my groups
GET    /api/groups/:id                → get single group
PUT    /api/groups/:id                → update (admin only)
DELETE /api/groups/:id                → delete (admin only)

POST   /api/groups/:id/members        → add members (admin only)
DELETE /api/groups/:id/members        → remove member / leave

GET    /api/groups/:id/messages       → get group messages
POST   /api/groups/:id/messages       → send text/image
POST   /api/groups/:id/messages/audio → send voice message
```

---

## 1. Create Group Flow

```
User clicks "New Group" button
        ↓
CreateGroupModal opens
  - Enter group name
  - Optional description
  - Pick members from contacts list
        ↓
Click "Create"
        ↓
POST /api/groups
  { name, description, memberIds: ["id1", "id2"] }
        ↓
SERVER:
  admin = req.user._id
  uniqueMembers = [admin, ...memberIds]  ← admin always included
  new Group({ name, description, admin, members })
  group.save() → MongoDB
        ↓
  Populate members + admin
        ↓
  For each member:
    getReceiverSocketId(memberId)
    → io.to(socketId).emit("groupCreated", group)
        ↓
  res.status(201).json(group)
        ↓
CLIENT (all members):
  socket.on("groupCreated", group)
  → groups.unshift(group)
  → toast "Added to group: Study Group"
```

---

## 2. Send Group Message Flow

```
User types in group chat → clicks Send
        ↓
useGroupStore.sendGroupMessage(groupId, { text })
        ↓
OPTIMISTIC UPDATE:
  tempMessage = { _id: "temp-123", senderId: { ...authUser }, text, ... }
  groupMessages.push(tempMessage)
        ↓
POST /api/groups/:id/messages
  { text: "hello everyone!" }
        ↓
SERVER:
  1. Find group, verify sender is member
  2. new Message({ senderId, groupId, text })
  3. message.save() → MongoDB
  4. Populate senderId (username, profilePic)
  5. For each member EXCEPT sender:
       io.to(memberSocketId).emit("newGroupMessage", message)
  6. Also emit to sender's own socket (other tabs)
  7. res.status(201).json(message)
        ↓
CLIENT (sender):
  Replace tempMessage with real message
        ↓
CLIENT (other members):
  socket.on("newGroupMessage", msg)
  → if selectedGroup._id === msg.groupId:
      groupMessages.push(msg)
  → play notification.mp3
```

---

## 3. Socket Events for Groups

```
SERVER → CLIENT events:

"groupCreated"    { group }         → new group, add to list
"groupUpdated"    { group }         → name/avatar changed, update in list
"groupDeleted"    { groupId }       → group removed, remove from list
"removedFromGroup" { groupId }      → you were kicked, remove from list
"newGroupMessage" { message }       → new message in a group
```

---

## 4. Admin Powers

```
Admin can:
  ✓ Update group name, description, avatar
  ✓ Add new members
  ✓ Remove any member
  ✓ Delete the entire group

Regular member can:
  ✓ Send messages
  ✓ Leave the group (remove themselves)
  ✗ Cannot add/remove others
  ✗ Cannot update group info
  ✗ Cannot delete group

If admin leaves:
  → group.members[0] becomes new admin automatically
```

---

## 5. Leave Group Flow

```
Member clicks "Leave Group"
        ↓
DELETE /api/groups/:id/members
  { memberId: req.user._id }
        ↓
SERVER:
  isSelf = true → allowed
  group.members = members.filter(m !== memberId)
  if admin left && members remain:
    group.admin = group.members[0]  ← promote first member
  group.save()
        ↓
  emit "removedFromGroup" to the leaving user
  emit "groupUpdated" to remaining members
        ↓
CLIENT (leaving user):
  groups.filter(g !== groupId)
  selectedGroup = null
  toast "You were removed from a group"
```

---

## 6. Group vs DM — Key Differences

| Feature | DM | Group |
|---------|-----|-------|
| Recipients | 1 person | N people |
| Message field | `receiverId` | `groupId` |
| Socket event | `newMessage` | `newGroupMessage` |
| Optimistic update | Yes | Yes |
| Sender shown | No (it's you) | Yes (username shown) |
| Admin concept | No | Yes |
| Leave/kick | N/A | Yes |

---

## 7. Zustand Store Shape

```javascript
useGroupStore = {
  groups: [],           // all groups I'm in
  selectedGroup: null,  // currently open group
  groupMessages: [],    // messages of selectedGroup
  isGroupsLoading: false,
  isGroupMessagesLoading: false,

  // actions
  fetchGroups()
  createGroup({ name, description, memberIds })
  updateGroup(groupId, data)
  addMembers(groupId, memberIds)
  removeMember(groupId, memberId)
  deleteGroup(groupId)
  fetchGroupMessages(groupId)
  sendGroupMessage(groupId, { text, image })
  sendGroupAudioMessage(groupId, audioBlob)

  // socket
  subscribeToGroupEvents()
  unsubscribeFromGroupEvents()
}
```

---

## 8. Full End-to-End: Group Message

```
[User A]              [Server]              [User B]  [User C]
   |                     |                     |         |
   | type "hello"        |                     |         |
   | optimistic update   |                     |         |
   |                     |                     |         |
   |── POST /groups/id/messages ──────────────>|         |
   |                     | verify member       |         |
   |                     | save to MongoDB     |         |
   |                     |── emit newGroupMessage ──────>|
   |                     |── emit newGroupMessage ──────────────>|
   |                     |── emit newGroupMessage (A's tabs)     |
   |<── 201 { message } ─|                     |         |
   | replace optimistic  |                     |         |
   |                     |         append msg  |         |
   |                     |         play sound  |         |
   |                     |                     | append msg
   |                     |                     | play sound
```

---

## Translation in Groups

Translation works identically to DMs — uses the same `useTranslationStore`.

```
Key used: groupId  (same store, different key from DM userId)

useTranslationStore.getLang(groupId)       → current language for this group
useTranslationStore.setLang(groupId, "hi") → set Hindi for this group
```

- `TranslationSelector` shown in group header (right side, next to members button)
- Each group has its own independent language setting
- Only received messages are translated (not your own)
- Original text shown as italic hint below translated text
- Language preference saved in localStorage per groupId
- Translation cache works the same: `msgId_lang` key

```
Group header:
  [Avatar] [Group Name / N members]    [Translate ▾] [👥]
                                             ↓
                                   Region → Language picker
                                             ↓
                              translateMessages(groupMessages, lang)
                                             ↓
                              Each received msg → translated text
                              Original shown as italic hint
```
