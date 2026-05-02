# ChatNova — Auth Pages & Contact Search UI

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/pages/LoginPage.jsx` | Full redesign — split layout, professional dark theme |
| `frontend/src/pages/SignUpPage.jsx` | Matching redesign — same layout as login |
| `frontend/src/components/ContactList.jsx` | Added search bar, online dot on avatar, cleaner items |
| `frontend/src/App.jsx` | Auth pages now render without wrapper (own full-screen layout) |

---

## Login / Signup Layout

```
┌─────────────────────────────────────────────────────┐
│  min-h-screen  bg-[#0d1117]  flex                   │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │   Form Panel     │  │   Illustration Panel     │ │
│  │   max-w-md       │  │   flex-1  bg-[#111827]   │ │
│  │   px-10 py-12    │  │   (hidden on mobile)     │ │
│  │                  │  │                          │ │
│  │  Logo            │  │  Glow effects            │ │
│  │  Heading         │  │  Illustration image      │ │
│  │  Form fields     │  │  Tagline + feature tags  │ │
│  │  Submit button   │  │                          │ │
│  │  Footer link     │  │                          │ │
│  └──────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Login Page Features

- Password show/hide toggle (Eye/EyeOff icon)
- "Forgot password?" link inline next to password label
- Cyan submit button with loading spinner
- Feature tags: Real-time, Encrypted, Free
- No BorderAnimatedContainer — clean flat dark design

---

## Contact Search

```
User opens Contacts tab
        ↓
ContactList renders with search input at top
        ↓
User types in search box
        ↓
allContacts.filter(c =>
  (c.fullName || c.username).toLowerCase().includes(query)
)
        ↓
Filtered list re-renders instantly (no API call)
        ↓
Contact count shown: "N contacts"
        ↓
Click contact → setSelectedGroup(null) + setSelectedUser(contact)
```

---

## App.jsx Routing

```
authUser exists + not auth page:
  → fixed inset-0 overflow-hidden
  → ChatPage (full viewport)

not logged in:
  → Auth pages render directly (no wrapper)
  → LoginPage / SignUpPage have own full-screen layout
  → No rounded card, no gradient background wrapper
```
