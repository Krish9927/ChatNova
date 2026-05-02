# ChatNova — MongoDB Connection Flow

---

## The Bug: "buffering timed out after 10000ms"

### What was happening

```
server.listen(PORT, () => {
    connectDB();   ← DB connects AFTER server is already accepting requests
})
```

      The server started listening on the port immediately.
      Any request that arrived in the first ~2-5 seconds (before MongoDB connected)
would try to run a Mongoose query — but Mongoose buffers operations until
connected. If the connection takes longer than 10 seconds, it throws:

  MongooseError: Operation `users.findOne()` buffering timed out after 10000ms

This caused login, auth checks, and message sends to all fail on startup.

---

## The Fix

```
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
```

DB connects first. Server only starts accepting requests after MongoDB is ready.
No request can arrive before Mongoose is connected.

---

## Connection Flow (Fixed)

```
npm run dev
      ↓
Node.js starts
      ↓
connectDB() called
      ↓
mongoose.connect(MONGO_URI)
      ↓
  ┌── waiting for Atlas cluster response ──┐
  │  (can take 2-8 seconds on cold start)  │
  └────────────────────────────────────────┘
      ↓
"MongoDB Connected ac-r1syj0z-shard-00-00..."
      ↓
.then() fires
      ↓
server.listen(PORT)
      ↓
"Server is running on port 3001"
      ↓
NOW accepting requests ← safe, DB is ready
```

---

## Why Mongoose Buffers

Mongoose has a built-in command buffering system.
When you call `User.findOne()` before the connection is established,
Mongoose doesn't throw immediately — it queues the operation and waits.

The default buffer timeout is **10 seconds**.
If the connection isn't established within 10s, it throws the timeout error.

```
Request arrives at 0ms
  → User.findOne() called
  → Mongoose: "not connected yet, buffering..."
  → 10,000ms passes
  → MongooseError: buffering timed out
```

With the fix, no request can arrive until after `mongoose.connect()` resolves,
so the buffer is never used.

---

## Audio Message Fix

### Root cause of "Text or image required"

The error was triggered by two things happening together:

1. Server started before DB was ready
2. `protectedRoute` middleware called `User.findById()` → buffering timeout
3. Request failed in middleware, never reached `sendMessage` controller
4. Frontend showed the error from a previous failed request

### What the controller now logs

```
[sendMessage] text: false | image: false | audio: true | receiverId: 64abc...
```

This confirms `audio` is arriving correctly once the DB is connected.

### Audio upload path

```
VoiceRecorder records audio
      ↓
MediaRecorder chunks → Blob
  mimeType priority: webm;opus → webm → ogg;opus → mp4
      ↓
FileReader.readAsDataURL(blob)
  → "data:audio/webm;base64,GkXfo..."
      ↓
sendMessage({ audio: base64DataUrl })
      ↓
POST /api/messages/send/:id
  req.body.audio = "data:audio/webm;base64,..."
      ↓
cloudinary.uploader.upload(audio, {
  resource_type: "video",   ← Cloudinary uses "video" for all audio
  folder: "chat_audio"
})
      ↓
audioUrl = "https://res.cloudinary.com/.../chat_audio/xyz.webm"
      ↓
Message saved with audio: audioUrl
      ↓
Receiver gets <audio src={audioUrl} controls />
```

---

## Startup Order (Before vs After)

### Before (broken)
```
[0ms]   server.listen() → port open, accepting requests
[0ms]   connectDB() starts (async, not awaited)
[500ms] User hits the app, sends request
[500ms] protectedRoute: User.findById() → buffered
[2000ms] MongoDB connects
[10000ms] Buffer timeout → MongooseError
```

### After (fixed)
```
[0ms]   connectDB() starts
[2000ms] MongoDB connects → "MongoDB Connected"
[2000ms] server.listen() → port open
[2500ms] User hits the app, sends request
[2500ms] protectedRoute: User.findById() → instant, DB ready
```
