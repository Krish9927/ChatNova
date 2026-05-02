# ChatNova — Voice Recording & Audio Message Flow

---

## Why Base64 Failed

```
Old approach (broken):
  MediaRecorder → Blob → FileReader.readAsDataURL()
  → "data:audio/webm;codecs=opus;base64,GkXfo..."
  → sent as JSON body to /api/messages/send
  → cloudinary.uploader.upload("data:audio/webm;codecs=opus;base64,...")
  → ERROR: Unsupported source URL
```

Cloudinary's `upload()` accepts:
- A file path
- A plain URL (https://...)
- A base64 data URL **without codec params**: `data:audio/webm;base64,...`

But `MediaRecorder` produces `audio/webm;codecs=opus` as the MIME type.
The codec part (`codecs=opus`) in the data URL prefix breaks Cloudinary's parser.

---

## New Approach: FormData + Multer + Stream Upload

```
New approach (working):
  MediaRecorder → Blob (binary)
  → FormData.append("audio", blob, "voice-message.webm")
  → POST /api/messages/send-audio/:id  (multipart/form-data)
  → multer reads binary into req.file.buffer
  → streamifier.createReadStream(buffer).pipe(cloudinary.upload_stream())
  → Cloudinary stores it, returns secure_url
  → Message saved with audio: secure_url
  → Socket emits newMessage to receiver
```

No base64 conversion. No codec string issues. Pure binary stream.

---

## Files Changed

| File | What Changed |
|------|-------------|
| `backend/src/controllers/message.controller.js` | Added `sendAudioMessage` with stream upload; removed broken base64 audio from `sendMessage` |
| `backend/src/routes/message.route.js` | Added `POST /send-audio/:id` and `POST /send-audio` with multer middleware |
| `frontend/src/components/VoiceRecorder.jsx` | `handleSend` now passes raw `Blob` to `onSend` instead of base64 string |
| `frontend/src/components/MessageInput.jsx` | `handleVoiceSend` builds `FormData` and posts to `/messages/send-audio/:id` |
| `frontend/src/store/useChatStore.js` | Added `addMessage()` helper to push confirmed message into state |

## Packages Added

```bash
# backend/
npm install multer streamifier
```

---

## Full Audio Send Flow

```
[User clicks 🎙️]
      ↓
navigator.mediaDevices.getUserMedia({ audio: true })
      ↓
MediaRecorder.start(100ms chunks)
  mimeType: audio/webm;codecs=opus  (Chrome)
           audio/mp4                (Safari)
           audio/ogg;codecs=opus    (Firefox)
      ↓
[User clicks ■ stop]
      ↓
recorder.onstop:
  new Blob(chunks, { type: recorder.mimeType })
  URL.createObjectURL(blob) → local preview URL
  state = "preview"
      ↓
[User clicks Send ▶]
      ↓
VoiceRecorder.handleSend():
  onSend(audioBlob)   ← raw Blob, no FileReader, no base64
      ↓
MessageInput.handleVoiceSend(audioBlob):
  const formData = new FormData()
  formData.append("audio", audioBlob, "voice-message.webm")
      ↓
axiosInstance.post("/messages/send-audio/:id", formData, {
  headers: { "Content-Type": "multipart/form-data" }
})
      ↓
─────────────── SERVER ───────────────
POST /api/messages/send-audio/:id
  arcjetProtection → protectedRoute → sendAudioMessage
      ↓
multer({ storage: memoryStorage() }).single("audio")
  req.file.buffer = <binary audio data>
  req.file.mimetype = "audio/webm"
      ↓
streamUploadToCloudinary(req.file.buffer):
  cloudinary.uploader.upload_stream({
    resource_type: "video",
    folder: "chat_audio",
    public_id: "audio_1234567890"
  })
  streamifier.createReadStream(buffer).pipe(stream)
      ↓
Cloudinary processes binary stream
  → result.secure_url = "https://res.cloudinary.com/.../chat_audio/audio_123.webm"
      ↓
new Message({ senderId, receiverId, audio: secure_url })
message.save() → MongoDB
      ↓
getReceiverSocketId(receiverId)
  → io.to(receiverSocketId).emit("newMessage", message)
getReceiverSocketId(senderId)
  → io.to(senderSocketId).emit("newMessage", message)
      ↓
res.status(201).json(newMessage)
─────────────────────────────────────
      ↓
MessageInput receives 201:
  useChatStore.addMessage(res.data)
  → message appears in chat with <audio> player
      ↓
Receiver's socket.on("newMessage"):
  msg.audio exists → <audio src={cloudinaryUrl} controls />
  notification.mp3 plays (if sound enabled)
```

---

## Why Stream Upload (not base64)

| Method | Problem |
|--------|---------|
| `cloudinary.upload(base64)` | Fails if MIME has codec params (`audio/webm;codecs=opus`) |
| `cloudinary.upload(cleanBase64)` | Fragile — requires stripping codec string manually |
| `upload_stream` + binary buffer | Works with any MIME type, no string manipulation needed |

`upload_stream` takes a Node.js `Readable` stream and pipes it directly to Cloudinary.
`streamifier.createReadStream(buffer)` converts a `Buffer` into a `Readable` stream.

---

## multer memoryStorage

```
multer({ storage: multer.memoryStorage() })
```

- Does NOT write to disk
- Stores file in `req.file.buffer` as a `Buffer`
- Perfect for cloud uploads — no temp files to clean up
- `req.file.size` — byte size
- `req.file.mimetype` — e.g. "audio/webm"
- `req.file.originalname` — "voice-message.webm"

---

## Route Order (important)

```
router.post('/send-audio/:id', upload.single('audio'), sendAudioMessage)
router.post('/send-audio',     upload.single('audio'), sendAudioMessage)
router.post('/send/:id',       sendMessage)
router.post('/send',           sendMessage)
router.get('/:id',             getMessagesByUserId)   ← must be last
```

`/send-audio` must come before `/:id` otherwise Express would match
"send-audio" as a userId parameter.

---

## Optimistic UI for Audio

Audio messages don't use optimistic updates (unlike text) because:
- We need the Cloudinary URL to render the `<audio>` player
- The upload takes ~1-3 seconds
- A loading spinner in VoiceRecorder is cleaner than a broken audio element

The confirmed message from the server response is added via `addMessage(res.data)`.
