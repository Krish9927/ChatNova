# ChatNova — UI Redesign & Chat Background Flow

---

## Design Reference

Dark navy professional chat app.
Colors: `#0d1117` (sidebar/header), `#111827` (chat area), `#1a3a5c` (received bubbles), `#06b6d4` (cyan accent).

---

## Files Changed

| File | What Changed |
|------|-------------|
| `frontend/src/pages/ChatPage.jsx` | Full-screen fixed layout, navy bg |
| `frontend/src/components/ProfileHeader.jsx` | Compact header, ring avatar, emerald online dot |
| `frontend/src/components/ActiveTabSwitch.jsx` | Underline tab style |
| `frontend/src/components/ChatsList.jsx` | Search bar, cleaner items, unread badges |
| `frontend/src/components/ChatHeader.jsx` | Compact header, inline online dot |
| `frontend/src/components/MessageInput.jsx` | Rounded pill input, sticker button, send button |
| `frontend/src/components/ChatContainer.jsx` | New bubble style + bg.png background |
| `frontend/src/components/GroupChatContainer.jsx` | Same bubble style, matching header/input |
| `frontend/src/App.jsx` | Auth pages render without wrapper |
| `frontend/src/index.css` | `html, body, #root { height: 100%; overflow: hidden }` |

---

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  fixed inset-0  bg-[#0d1117]                        │
│                                                     │
│  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │   Sidebar    │  │       Main Panel             │ │
│  │   w-80       │  │       flex-1                 │ │
│  │  #0d1117     │  │       #111827                │ │
│  │              │  │                              │ │
│  │ ProfileHeader│  │  ChatHeader                  │ │
│  │ TabSwitch    │  │  ─────────────────────────── │ │
│  │ SearchBar    │  │  bg.png (fixed)              │ │
│  │ ChatsList    │  │    Messages (scroll)         │ │
│  │              │  │  ─────────────────────────── │ │
│  └──────────────┘  │  MessageInput                │ │
│                    └──────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Chat Background (bg.png)

```
Structure:
  <div flex-col h-full>
    <ChatHeader />                    ← fixed, no bg
    <div relative overflow-hidden     ← bg image lives here
      backgroundImage: url('/bg.png')
      backgroundSize: cover
    >
      <div absolute overlay />        ← #111827/55 dark tint
      <div overflow-y-auto z-10>      ← ONLY this scrolls
        messages...
      </div>
    </div>
    <MessageInput />                  ← fixed at bottom, no bg
  </div>
```

Key: background is on the **parent** div which has `overflow-hidden`.
The scroll container is a **child** — only messages move, bg stays fixed.

Place `bg.png` in `frontend/public/` — Vite serves it at `/bg.png`.

---

## Message Bubble Colors

| Bubble | Color | Notes |
|--------|-------|-------|
| Sent (mine) | `bg-cyan-500` | Bright cyan |
| Received (DM) | `bg-[#1a3a5c]/90` | Deep blue shade, 90% opacity |
| Received (Group) | `bg-[#1a3a5c]/90` | Same blue shade |

The blue shade (`#1a3a5c`) gives received messages a distinct blue tint
that contrasts well against any background image.

---

## Full-Screen No-Scroll Fix

```css
/* index.css */
html, body, #root {
  height: 100%;
  overflow: hidden;
}
```

```jsx
/* App.jsx — chat page */
<div className="fixed inset-0 overflow-hidden">
  <ChatPage />
</div>

/* ChatPage */
<div className="flex h-full w-full overflow-hidden">
  <aside className="w-80 h-full overflow-hidden" />
  <main className="flex-1 h-full overflow-hidden" />
</div>
```

Only the messages list and sidebar list scroll internally.
Nothing at the page level scrolls.

---

## Color Palette

| Token | Value | Used for |
|-------|-------|---------|
| Sidebar bg | `#0d1117` | Sidebar, header, input area |
| Chat bg | `#111827` | Main message area base |
| Received bubble | `#1a3a5c` at 90% | Received message bubbles |
| Sent bubble | `#06b6d4` (cyan-500) | Sent message bubbles |
| Border | `rgba(255,255,255,0.05)` | Dividers, input borders |
| Online dot | `#10b981` (emerald-500) | Online status indicator |
| Unread badge | `#06b6d4` (cyan-500) | Unread count pill |
