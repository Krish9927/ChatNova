# ChatNova — Data Flow (What travels where)

Understanding exactly what data moves between frontend, backend, and external services.

---

## 1. What lives where

```
BROWSER (Frontend)
├── React state (Zustand stores) — lost on refresh
│   ├── authUser object
│   ├── messages array
│   ├── onlineUsers array
│   └── translation cache { msgId_lang: text }
│
├── localStorage — persists across refresh
│   ├── chatnova_translation_prefs { userId: "hi" }
│   └── isSoundEnabled "true"/"false"
│
└── Cookies (httpOnly — browser manages, JS can't read)
    └── jwt=<token>   ← sent automatically with every request

SERVER (Backend)
├── Memory (lost on restart)
│   └── userSocketMap { userId: socketId }
│
└── MongoDB (permanent)
    ├── users collection
    └── messages collection

CLOUDINARY (External)
└── Media files
    ├── Profile pictures
    ├── Chat images
    └── Voice messages (audio/webm)

ASSEMBLYAI (External)
└── Transcription jobs (temporary, not stored by us)
```

---

## 2. Message Object — What's in it

```javascript
// In MongoDB (Message.js schema)
{
  _id: ObjectId("64abc..."),
  senderId: ObjectId("64def..."),   // ref to User
  receiverId: ObjectId("64ghi..."), // ref to User
  text: "hello how are you",        // optional
  image: "https://res.cloudinary.com/.../img.jpg",  // optional
  audio: "https://res.cloudinary.com/.../audio.webm", // optional
  createdAt: ISODate("2025-01-01T10:00:00Z"),
  updatedAt: ISODate("2025-01-01T10:00:00Z")
}

// Optimistic message (frontend only, before server confirms)
{
  _id: "temp-1234567890",   ← fake ID
  senderId: "64def...",
  receiverId: "64ghi...",
  text: "hello",
  image: null,
  audio: null,
  createdAt: "2025-01-01T10:00:00.000Z",
  isOptimistic: true        ← flag to identify it
}
```

---

## 3. User Object — What's in it

```javascript
// In MongoDB (User.js schema)
{
  _id: ObjectId,
  fullName: "Krishna Patel",
  username: "krishna",
  email: "krishna@example.com",
  password: "$2b$10$...",     // bcrypt hash, NEVER sent to frontend
  profilePic: "https://res.cloudinary.com/.../pic.jpg",
  isVerified: true,
  otp: "$2b$10$...",          // hashed OTP, cleared after use
  otpExpiry: Date,
  createdAt: Date
}

// What frontend receives (password stripped by .select("-password"))
{
  _id: "64abc...",
  fullName: "Krishna Patel",
  username: "krishna",
  email: "krishna@example.com",
  profilePic: "https://...",
  isVerified: true
}
```

---

## 4. JWT Token — What's inside

```javascript
// Created in utils.js
jwt.sign(
  { userId: user._id },    ← payload
  JWT_SECRET,
  { expiresIn: "7d" }
)

// Decoded in protectedRoute
{
  userId: "64abc...",
  iat: 1704067200,   // issued at (unix timestamp)
  exp: 1704672000    // expires at (7 days later)
}
```

---

## 5. Socket Events — What data travels

```
CLIENT → SERVER:
  (none currently — all actions go via REST API)

SERVER → CLIENT:
  "getOnlineUsers"  payload: ["userId1", "userId2", ...]
  "newMessage"      payload: { _id, senderId, receiverId, text, image, audio, createdAt }
```

---

## 6. API Endpoints — Full List

```
AUTH routes (/api/auth/*)
  POST /signup              { fullName, username, email, password }
  POST /verify-email-otp    { email, otp }
  POST /resend-verify-otp   { email }
  POST /login               { email, password }
  POST /logout              (no body)
  GET  /check-auth          (no body — reads cookie)
  POST /forgot-password     { email }
  POST /verify-reset-otp    { email, otp }
  POST /reset-password      { email, otp, password }
  PUT  /update-profile      { profilePic }

MESSAGE routes (/api/messages/*)
  GET  /contacts            → all users except self
  GET  /chat                → users you've chatted with
  GET  /:id                 → messages between you and user :id
  POST /send/:id            { text?, image? }
  POST /send                { text?, image?, receiverId }
  POST /send-audio/:id      FormData: audio file
  POST /send-audio          FormData: audio file + receiverId
  POST /transcribe          { audioUrl }
```

---

## 7. Request/Response Examples

### Send text message
```
REQUEST:
  POST /api/messages/send/64ghi...
  Cookie: jwt=eyJhbGc...
  Content-Type: application/json
  { "text": "hello!" }

RESPONSE 201:
  {
    "_id": "64xyz...",
    "senderId": "64def...",
    "receiverId": "64ghi...",
    "text": "hello!",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
```

### Send voice message
```
REQUEST:
  POST /api/messages/send-audio/64ghi...
  Cookie: jwt=eyJhbGc...
  Content-Type: multipart/form-data
  [audio field: binary webm data]

RESPONSE 201:
  {
    "_id": "64xyz...",
    "senderId": "64def...",
    "receiverId": "64ghi...",
    "audio": "https://res.cloudinary.com/dhs43xtqx/video/upload/chat_audio/audio_123.webm",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
```

### Transcribe audio
```
REQUEST:
  POST /api/messages/transcribe
  Cookie: jwt=eyJhbGc...
  { "audioUrl": "https://res.cloudinary.com/.../audio_123.webm" }

RESPONSE 200:
  { "transcript": "hey how are you doing today" }
```

---

## 8. Error Response Format

```javascript
// All errors follow this format:
{ "message": "Human readable error description" }

// Common status codes:
400 → Bad request (missing fields, validation failed)
401 → Unauthorized (no JWT, invalid JWT)
403 → Forbidden (Arcjet blocked the request)
404 → Not found (user/message doesn't exist)
500 → Internal server error (DB error, Cloudinary error, etc.)
```

---

## 9. Translation Cache — How it works

```javascript
// In memory (useTranslationStore)
cache = {
  "64abc_hi": "नमस्ते कैसे हो",      // msgId_lang: translated text
  "64abc_es": "hola cómo estás",
  "64def_hi": "मैं ठीक हूं",
}

// Key format: `${msgId}_${langCode}`
// Built in translateMessage():
const cacheKey = `${msgId}_${targetLang}`;
if (cache[cacheKey]) return cache[cacheKey];  // instant
// else: call API, store result, return
```

Why cache?
- Translation APIs have rate limits
- Switching languages back and forth would re-fetch everything
- Cache makes it instant after first translation

---

## 10. audioManager — How it works

```javascript
// frontend/src/lib/audioManager.js
let currentAudio = null;  // tracks the currently playing <audio> element

// Called when each AudioMessagePlayer mounts:
registerAudio(audioEl):
  audioEl.addEventListener("play", () => {
    if (currentAudio && currentAudio !== audioEl) {
      currentAudio.pause();   // stop previous audio
    }
    currentAudio = audioEl;   // track new one
  });

// Called when "To Text" is clicked:
stopCurrent():
  currentAudio.pause();
  currentAudio.currentTime = 0;
  currentAudio = null;
```

This is a singleton pattern — one shared variable across all component instances.
When any audio starts playing, all others stop automatically.
