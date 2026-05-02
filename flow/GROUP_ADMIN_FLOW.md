# ChatNova — Group Admin & Message Flow (Detailed)

---

## Why Duplicate Messages Happened (Root Cause)

```
WRONG (old code):
  Server emits "newGroupMessage" to ALL members including sender
        ↓
  Sender receives socket event → appends message (duplicate #1)
  Sender also gets REST 201 response → optimistic replaced (duplicate #2)
  Result: 2 messages shown

CORRECT (fixed):
  Server emits "newGroupMessage" only to OTHER members (skip sender)
        ↓
  Sender gets message ONLY via REST 201 response
  Other members get message ONLY via socket event
  Result: 1 message each ✓
```

---

## Message Send Flow (Fixed)

```
[Sender types "hello" → clicks Send]
        ↓
sendGroupMessage(groupId, { text: "hello" })
        ↓
OPTIMISTIC UPDATE:
  tempMessage = { _id: "temp-123", text: "hello", ... }
  groupMessages.push(tempMessage)   ← shows instantly
        ↓
POST /api/groups/:id/messages  { text: "hello" }
        ↓
─────────────── SERVER ───────────────
  1. Verify sender is member
  2. new Message({ senderId, groupId, text })
  3. message.save() → MongoDB
  4. Populate senderId (username, profilePic)
  5. For each member WHERE memberId !== senderId:
       io.to(memberSocketId).emit("newGroupMessage", msg)
     ← sender is SKIPPED intentionally
  6. res.status(201).json(populated)
─────────────────────────────────────
        ↓
[Sender] REST 201 response:
  groupMessages.map: replace temp-123 with real message
  → 1 message shown ✓

[Other members] socket.on("newGroupMessage"):
  alreadyExists check (safety net)
  → groupMessages.push(msg)
  → 1 message shown ✓
```

---

## Group Creation Flow

```
Admin clicks "New Group"
        ↓
CreateGroupModal opens
  - Enter name (required)
  - Enter description (optional)
  - Pick members from contacts list
        ↓
POST /api/groups
  { name, description, memberIds: ["id1", "id2"] }
        ↓
SERVER:
  uniqueMembers = [adminId, ...memberIds]  ← admin always included
  new Group({ name, description, admin, members })
  group.save()
        ↓
  Populate members + admin
        ↓
  For EACH member (including admin):
    io.to(socketId).emit("groupCreated", group)
        ↓
  res.status(201).json(group)
        ↓
CLIENT (admin):
  REST response → groups.unshift(group)
  Socket "groupCreated" → alreadyExists check prevents duplicate
        ↓
CLIENT (other members):
  Socket "groupCreated" → groups.unshift(group)
  toast "Added to group: Study Group 👥"
```

---

## Add Members Flow (Admin Only)

```
Admin opens members panel → clicks "Add"
        ↓
Contact picker shows (filtered: non-members only)
Admin selects contacts → clicks "Add (N)"
        ↓
addMembers(groupId, selectedIds)
        ↓
POST /api/groups/:id/members
  { memberIds: ["newId1", "newId2"] }
        ↓
SERVER:
  Verify requester is admin
  Filter out already-members
  group.members.push(...newMembers)
  group.save()
        ↓
  Populate updated group
        ↓
  For ALL members (including new ones):
    io.to(socketId).emit("groupUpdated", group)
        ↓
  res.status(200).json(group)
        ↓
CLIENT (admin):
  REST response → update group in store
        ↓
CLIENT (new members):
  Socket "groupUpdated" → group updated in list
  (they can now see the group and its messages)
```

---

## Remove Member Flow (Admin Only)

```
Admin clicks × on a member chip
        ↓
window.confirm("Remove this member?")
        ↓
removeMember(groupId, memberId)
        ↓
DELETE /api/groups/:id/members
  { memberId: "targetId" }
        ↓
SERVER:
  isAdmin = requester is group admin
  isSelf = memberId === requester._id
  if (!isAdmin && !isSelf) → 403 Forbidden
        ↓
  group.members = members.filter(m !== memberId)
        ↓
  If admin removed themselves AND members remain:
    group.admin = group.members[0]  ← promote first member
        ↓
  io.to(removedSocket).emit("removedFromGroup", { groupId })
  For remaining members:
    io.to(socketId).emit("groupUpdated", group)
        ↓
  res.status(200).json(updatedGroup)
        ↓
CLIENT (removed member):
  Socket "removedFromGroup"
  → groups.filter(g !== groupId)
  → selectedGroup = null (if they had it open)
  → toast "You were removed from a group 👋"
        ↓
CLIENT (remaining members):
  Socket "groupUpdated"
  → group updated in store (member count decreases)
```

---

## Leave Group Flow (Any Member)

```
Member clicks × on their own chip
        ↓
window.confirm("Remove this member?")
        ↓
removeMember(groupId, authUser._id)
        ↓
Same flow as Remove Member above
isSelf = true → allowed even for non-admin
        ↓
Member is removed from group
Socket "removedFromGroup" fires for them
→ group disappears from their list
```

---

## Delete Group Flow (Admin Only)

```
Admin clicks "Delete Group" button
        ↓
window.confirm("Delete group? Cannot be undone.")
        ↓
deleteGroup(groupId)
        ↓
DELETE /api/groups/:id
        ↓
SERVER:
  Verify requester is admin
        ↓
  For ALL members:
    io.to(socketId).emit("groupDeleted", { groupId })
        ↓
  Message.deleteMany({ groupId })  ← all messages deleted
  Group.findByIdAndDelete(groupId)
        ↓
  res.status(200).json({ message: "Group deleted" })
        ↓
CLIENT (all members):
  Socket "groupDeleted"
  → groups.filter(g !== groupId)
  → selectedGroup = null
  → toast "A group was deleted 🗑️"
```

---

## Admin Powers Summary

| Action | Admin | Member |
|--------|-------|--------|
| Send messages | ✓ | ✓ |
| Send voice messages | ✓ | ✓ |
| View members | ✓ | ✓ |
| Leave group | ✓ | ✓ |
| Add members | ✓ | ✗ |
| Remove members | ✓ | ✗ |
| Update group name/avatar | ✓ | ✗ |
| Delete group | ✓ | ✗ |

---

## Socket Events Reference

```
SERVER → CLIENT:

"newGroupMessage"   { message }     → new message in a group (sent to non-senders only)
"groupCreated"      { group }       → new group created, add to list
"groupUpdated"      { group }       → group info changed (name, members, avatar)
"groupDeleted"      { groupId }     → group deleted, remove from list
"removedFromGroup"  { groupId }     → you were kicked/left, remove from list
```

---

## Duplicate Message Prevention

```
LAYER 1 (backend): Don't emit to sender
  group.members.forEach(m => {
    if (m.toString() === senderId.toString()) return;  ← skip sender
    io.to(socketId).emit("newGroupMessage", msg);
  });

LAYER 2 (frontend): alreadyExists check
  socket.on("newGroupMessage", (msg) => {
    const alreadyExists = groupMessages.some(m => m._id === msg._id);
    if (alreadyExists) return;  ← safety net
    ...
  });

LAYER 3 (frontend): groupCreated dedup
  socket.on("groupCreated", (group) => {
    if (s.groups.some(g => g._id === group._id)) return {};  ← skip if exists
    return { groups: [group, ...s.groups] };
  });
```

---

## Socket Subscription — Single Registration

```
WRONG (caused duplicates):
  GroupsList mounts → subscribeToGroupEvents() → socket.on("newGroupMessage", handler1)
  ChatsList mounts  → subscribeToGroupEvents() → socket.on("newGroupMessage", handler2)
  Message arrives   → handler1 fires + handler2 fires → 2 appends

CORRECT (fixed):
  ChatPage mounts → subscribeToGroupEvents() → socket.on("newGroupMessage", handler)
  GroupsList/ChatsList do NOT call subscribe
  Message arrives → handler fires once → 1 append
```
