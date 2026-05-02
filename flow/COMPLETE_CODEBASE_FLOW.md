# ChatNova — Complete Codebase Flow

Everything in one place. Read this to understand how the entire app works.

---

## Project Structure

```
ChatNova/
├── backend/                    ← Node.js + Express + Socket.IO
│   └── src/
│       ├── server.js           ← Entry point, starts server AFTER DB connects
│       ├── lib/
│       │   ├── db.js           ← MongoDB connection
│       │   ├── socket.js       ← Socket.IO server + userSocketMap
│       │   ├── cloudinary.js   ← Cloudinary config
│       │   ├── env.js          ← All env vars in one place
│       │   └── utils.js        ← JWT token generator
│       ├── models/
│       │   ├── User.js         ← User schema
│       │   └── Message.js      ← Message schema (text, image, audio)
│       ├── controllers/
│       │   ├── auth.controller.js       ← signup/login/OTP/logout
│       │   ├── message.controller.js    ← send text/image/audio messages
│       │   └── transcribe.controller.js ← AssemblyAI speech-to-text
│       ├── middleware/
│       │   ├── auth.middleware.js        ← protectedRoute (JWT verify)
│       │   ├── socket.auth.middleware.js ← socket JWT verify
│       │   └── arcjet.middleware.js      ← rate limiting / bot protection
│       └── routes/
│           ├── auth.route.js    ← /api/auth/*
│           └── message.route.js ← /api/messages/*
│
└── frontend/                   ← React + Vite + Zustand + TailwindCSS
    └── src/
        ├── App.jsx             ← Routes: login/signup/verify/chat
        ├── store/
        │   ├── useAuthStore.js       ← auth state + socket connect/disconnect
        │   ├── useChatStore.js       ← messages, contacts, send/receive
        │   └── useTranslationStore.js ← per-chat language prefs + cache
        ├── lib/
        │   ├── axios.js        ← axios instance with base URL
        │   ├── translator.js   ← 3-API translation fallback + LANGUAGE_REGIONS
        │   ├── speechToText.js ← Web Speech API / Vosk factory
        │   └── audioManager.js ← singleton: only one audio plays at a time
        ├── components/
        │   ├── ChatContainer.jsx      ← message list + translation + audio
        │   ├── ChatHeader.jsx         ← user info + TranslationSelector
        │   ├── MessageInput.jsx       ← text/image/voice input
        │   ├── VoiceRecorder.jsx      ← mic button, recording UI, preview
        │   ├── AudioMessagePlayer.jsx ← audio player + "To Text" button
        │   └── TranslationSelector.jsx ← region → language dropdown
        └── pages/
            ├── LoginPage.jsx
            ├── SignUpPage.jsx
            ├── VerifyEmailPage.jsx
            ├── ForgotPasswordPage.jsx
            └── ChatPage.jsx
```

---

## 1. App Startup Flow

```
User opens browser → http://localhost:5173
        ↓
App.jsx renders
        ↓
useAuthStore.checkAuth() called
        ↓
GET /api/auth/check-auth
  → protectedRoute reads JWT cookie
  → User.findById() → returns user
        ↓
authUser set in store
        ↓
connectSocket() called
  → io(BASE_URL, { withCredentials: true })
  → JWT cookie sent automatically
  → socketAuthMiddleware verifies JWT
  → userSocketMap[userId] = socketId
  → io.emit("getOnlineUsers", [...])
        ↓
App renders ChatPage
```

---

## 2. Authentication Flow

```
SIGNUP:
  User fills form → POST /api/auth/signup
    → bcrypt.hash(password)
    → new User saved (isVerified: false)
    → OTP generated → email sent via Nodemailer/Resend
    → redirect to VerifyEmailPage
        ↓
  User enters OTP → POST /api/auth/verify-email-otp
    → OTP matches + not expired
    → user.isVerified = true
    → JWT cookie set (httpOnly, secure)
    → connectSocket()

LOGIN:
  POST /api/auth/login
    → User.findOne({ email })
    → bcrypt.compare(password, hash)
    → if !isVerified → return { needsVerification: true }
    → JWT cookie set
    → connectSocket()

LOGOUT:
  POST /api/auth/logout
    → cookie cleared
    → disconnectSocket()
    → userSocketMap entry deleted
    → io.emit("getOnlineUsers", [...remaining])
```

---

## 3. JWT Cookie Flow

```
Why httpOnly cookie (not localStorage)?

localStorage:
  - Accessible by JavaScript → XSS attack can steal it
  - Must manually attach to every request

httpOnly cookie:
  - NOT accessible by JavaScript → XSS safe
  - Browser sends it automatically with every request
  - Works with socket.io (sent in handshake headers too)

Flow:
  Login → res.cookie("jwt", token, { httpOnly: true, secure: true })
  Every request → cookie sent automatically
  protectedRoute → reads cookie → jwt.verify() → req.user = user
  Socket connect → cookie in handshake → socketAuthMiddleware
```

---

## 4. Message Send Flow (Text/Image)

```
User types "hello" → clicks Send
        ↓
useChatStore.sendMessage({ text: "hello" })
        ↓
OPTIMISTIC UPDATE:
  tempMessage = { _id: "temp-123", text: "hello", ... }
  messages.push(tempMessage)   ← UI shows instantly
        ↓
POST /api/messages/send/:receiverId
  { text: "hello" }
        ↓
SERVER:
  1. Validate text/image present
  2. Upload image to Cloudinary (if any)
  3. new Message({ senderId, receiverId, text })
  4. message.save() → MongoDB
  5. getReceiverSocketId(receiverId)
     → io.to(receiverSocketId).emit("newMessage", msg)
  6. getReceiverSocketId(senderId)
     → io.to(senderSocketId).emit("newMessage", msg)
     (sender's other tabs update too)
  7. res.status(201).json(newMessage)
        ↓
CLIENT:
  Replace tempMessage with real message (real _id, createdAt)
        ↓
RECEIVER:
  socket.on("newMessage") fires
  → append to messages[]
  → play notification.mp3 (if sound on)
```

---

## 5. Voice Message Flow

```
RECORDING:
  Click 🎙️ → getUserMedia({ audio: true })
  MediaRecorder.start(100ms chunks)
  Click ■ → recorder.stop()
  → Blob created from chunks
  → state = "preview" (audio player shown)

SENDING:
  Click Send ▶
  → FormData.append("audio", blob, "voice-message.webm")
  → POST /api/messages/send-audio/:id (multipart/form-data)
  → multer reads blob into req.file.buffer
  → streamifier.createReadStream(buffer).pipe(cloudinary.upload_stream())
  → Cloudinary returns secure_url
  → Message saved with audio: secure_url
  → Socket emits newMessage to receiver
  → Receiver sees <audio> player

TRANSCRIPTION (receiver clicks "To Text"):
  → audio pauses
  → POST /api/messages/transcribe { audioUrl }
  → AssemblyAI downloads audio from Cloudinary
  → Transcribes speech → returns text
  → Transcript shown inside chat bubble
```

---

## 6. Translation Flow

```
Receiver opens chat with User A
        ↓
Clicks "Translate" in header
        ↓
TranslationSelector opens:
  Region list → click "South Asia" → language list
  Click "Hindi"
        ↓
useTranslationStore.setLang(userId, "hi")
  → saved to localStorage
        ↓
ChatContainer useEffect detects targetLang change
        ↓
translateMessages(messages, "hi")
  For each message:
    cacheKey = msgId + "_hi"
    if cache hit → use cached (instant)
    if miss → translateText(text, "hi")
      → try MyMemory API (5s timeout)
      → try Lingva API (5s timeout)
      → try LibreTranslate API (5s timeout)
      → fallback: show original
    → cache result
        ↓
Re-render: show translated text
           show original as italic hint below
```

---

## 7. Zustand Store Architecture

```
useAuthStore
  authUser        ← logged in user object
  socket          ← Socket.IO client instance
  onlineUsers     ← array of online user IDs
  connectSocket() ← called after login/checkAuth
  disconnectSocket() ← called on logout

useChatStore
  messages[]      ← current conversation messages
  selectedUser    ← who you're chatting with
  sendMessage()   ← optimistic update + POST
  subscribeToMessages()   ← socket.on("newMessage")
  unsubscribeFromMessages() ← socket.off("newMessage")
  addMessage()    ← used by audio send (no optimistic)

useTranslationStore
  langPrefs{}     ← { userId: "hi" } persisted in localStorage
  cache{}         ← { "msgId_hi": "translated text" }
  translateMessages() ← batch translate
  getTranslated() ← sync read from cache (safe in render)
```

---

## 8. Middleware Chain

Every API request goes through:

```
Request arrives
      ↓
arcjetProtection   ← rate limiting, bot detection, IP blocking
      ↓
protectedRoute     ← reads JWT cookie → User.findById() → req.user
      ↓
Controller function
```

Socket connections go through:

```
Socket connect attempt
      ↓
socketAuthMiddleware
  → read JWT from cookie header
  → jwt.verify()
  → User.findById()
  → socket.user = user
  → socket.userId = user._id
      ↓
io.on("connection") handler
```

---

## 9. Cloudinary Usage

```
Images (profile pics, chat images):
  cloudinary.uploader.upload(base64DataUrl)
  → resource_type: "image" (default)
  → returns secure_url

Audio (voice messages):
  cloudinary.uploader.upload_stream({
    resource_type: "video",   ← Cloudinary uses "video" for audio too
    folder: "chat_audio"
  })
  streamifier.createReadStream(buffer).pipe(stream)
  → returns secure_url
```

Why `resource_type: "video"` for audio?
Cloudinary categorizes media as: image / video / raw
Audio files (mp3, webm, ogg) fall under "video" category.
Using "image" or "raw" would fail or not play in browsers.

---

## 10. OTP Email Flow

```
Signup / Forgot Password
        ↓
generateOTP() → 6-digit code
        ↓
user.otp = hash(otp)
user.otpExpiry = Date.now() + 10 minutes
user.save()
        ↓
emailHandler.sendEmail()
  → try Resend API first
  → fallback to Nodemailer (Gmail SMTP)
        ↓
User receives email with OTP
        ↓
POST /api/auth/verify-email-otp { email, otp }
  → User.findOne({ email })
  → bcrypt.compare(otp, user.otp)
  → check Date.now() < user.otpExpiry
  → user.isVerified = true
  → user.otp = undefined (clear it)
  → JWT cookie set
```

---

## 11. Key Concepts Summary

### Why optimistic updates?
Text messages show instantly without waiting for server response.
If server fails, the temp message is removed and error shown.
Makes the app feel fast even on slow connections.

### Why socket.io instead of polling?
Polling = frontend asks "any new messages?" every N seconds → wasteful.
Socket.io = server PUSHES new messages instantly → real-time, efficient.

### Why Zustand instead of Redux?
Zustand is simpler — no actions/reducers/dispatch boilerplate.
Just a function that returns state + setters. Works great for this scale.

### Why httpOnly cookies instead of localStorage for JWT?
httpOnly cookies can't be read by JavaScript → safe from XSS attacks.
localStorage is accessible by any JS on the page → vulnerable.

### Why multer memoryStorage for audio?
Disk storage writes temp files → need cleanup logic.
Memory storage keeps file in RAM as Buffer → upload directly to Cloudinary → no cleanup needed.

### Why AssemblyAI polls instead of webhooks?
Webhooks need a public URL to receive callbacks.
In local development there's no public URL.
Polling works everywhere and is simple to implement.
