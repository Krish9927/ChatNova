# ChatNova — Sticker Feature Flow

---

## What Was Added

| File | Change |
|------|--------|
| `frontend/src/lib/stickers.js` | 5 sticker packs, 20 stickers each (emoji-based, no CDN needed) |
| `frontend/src/components/StickerPicker.jsx` | Popup panel with pack tabs + sticker grid |
| `frontend/src/components/MessageInput.jsx` | Added 😊 sticker button, opens StickerPicker |
| `backend/src/models/Message.js` | Added `sticker: String` field |
| `backend/src/controllers/message.controller.js` | Accepts `sticker` in request body |
| `backend/src/controllers/group.controller.js` | Accepts `sticker` in group messages |
| `frontend/src/components/ChatContainer.jsx` | Renders sticker as large emoji |
| `frontend/src/components/GroupChatContainer.jsx` | Same sticker rendering |

---

## Sticker Packs

| Pack | Icon | Count |
|------|------|-------|
| Emotions | 😊 | 20 |
| Gestures | 👋 | 20 |
| Animals | 🐶 | 20 |
| Food | 🍕    | 20 |
| Celebrate | 🎉 | 20 |

All stickers are emoji characters — no external CDN, no npm packages, works offline.

---

## Send Sticker Flow

```
User clicks 😊 button in MessageInput
        ↓
StickerPicker opens (above input, right-aligned)
  - Pack tabs at top (emoji icons)
  - 5×4 grid of stickers
        ↓
User clicks a sticker (e.g. 😂)
        ↓
onSelect({ id: "e1", type: "emoji", value: "😂" })
        ↓
sendMessage({ sticker: "😂" })
        ↓
POST /api/messages/send/:id
  { sticker: "😂" }
        ↓
SERVER:
  new Message({ senderId, receiverId, sticker: "😂" })
  message.save()
  io.emit("newMessage", message)
        ↓
ChatContainer renders:
  <span className="text-5xl leading-none block">😂</span>
```

---

## StickerPicker UI

```
┌──────────────────────────────┐
│  😊  👋  🐶  🍕  🎉          │  ← pack tabs
├──────────────────────────────┤
│  Emotions                    │  ← pack label
│                              │
│  😂  😍  🥺  😭  😤          │
│  🤩  😎  🥳  😴  🤔          │
│  😏  🙄  😬  🤯  😇          │
│  🥰  😡  😱  🤗  😜          │
└──────────────────────────────┘
```

- Opens above the input bar
- Closes on outside click
- Closes after selecting a sticker
- Active pack tab has subtle background highlight

---

## Message Schema

```javascript
Message {
  senderId, receiverId, groupId,
  text: String,
  image: String,    // Cloudinary URL
  audio: String,    // Cloudinary URL
  sticker: String,  // emoji char or image URL  ← NEW
}
```

A message can have only one of: text, image, audio, sticker.
(Technically multiple can coexist but UI sends one at a time.)

---

## Why Emoji (not image stickers)

| Approach | Pros | Cons |
|----------|------|------|
| Emoji chars | Zero bandwidth, works offline, universal | Limited to OS emoji set |
| Image URLs (CDN) | Custom art, animated | Requires CDN, may go offline |
| Uploaded images | Full control | Storage cost, upload time |

Emoji approach chosen: instant, no dependencies, renders on all devices.
Can be extended later with image stickers by adding `type: "img"` entries to `stickers.js`.
