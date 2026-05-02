# ChatNova — Chat Scroll Behavior

---

## Problem

When opening a chat with many messages, the browser was smoothly scrolling
from the top all the way to the bottom — visibly animating through every
previous message. This felt slow and wrong.

---

## Solution: Two-Mode Scroll

```
isInitialLoad ref = true  (reset every time conversation changes)
        ↓
Messages load from API
        ↓
useEffect fires on [messages, isMessagesLoading]
        ↓
isInitialLoad.current === true?
  ├── YES → el.scrollTop = el.scrollHeight   ← INSTANT jump, no animation
  │         isInitialLoad.current = false
  └── NO  → el.scrollTo({ behavior: "smooth" })  ← smooth for new messages
```

---

## Files Changed

| File | Change |
|------|--------|
| `ChatContainer.jsx` | Added `isInitialLoad` ref, split scroll into instant/smooth modes |
| `GroupChatContainer.jsx` | Same fix, replaced `messagesEndRef` with container ref approach |

---

## Why `isInitialLoad` ref (not state)

Using `useRef` instead of `useState` because:
- Changing a ref does NOT trigger a re-render
- We only need it as a flag, not as UI state
- `useState` would cause an extra render cycle

---

## Scroll Logic Detail

```javascript
// Reset when conversation changes
useEffect(() => {
  isInitialLoad.current = true;
}, [selectedUser]); // or [selectedGroup._id] for groups

// Scroll on message changes
useEffect(() => {
  const el = messagesContainerRef.current;
  if (!el || isMessagesLoading) return;  // wait for messages to render

  if (isInitialLoad.current) {
    el.scrollTop = el.scrollHeight;      // instant — no animation
    isInitialLoad.current = false;
  } else {
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); // smooth
  }
}, [messages, isMessagesLoading]);
```

---

## Behavior Summary

| Trigger | Scroll Type | Why |
|---------|-------------|-----|
| Open a chat | Instant jump to bottom | Don't show scroll animation through history |
| New message arrives | Smooth scroll | Natural feel for live messages |
| Send a message | Smooth scroll | Optimistic message appears smoothly |
| Switch to another chat | Instant jump | Same as opening fresh |
