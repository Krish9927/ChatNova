# ChatNova — AssemblyAI Speech-to-Text Flow

---

## What is AssemblyAI?

AssemblyAI is a cloud API that converts audio files into text.
You send it an audio URL, it downloads and processes the audio,
and returns the transcript. It supports 99+ languages automatically.

---

## Why AssemblyAI (not Web Speech API or Vosk)?

| Method | Problem |
|--------|---------|
| Web Speech API | Only listens to mic — can't process a pre-recorded file |
| Vosk WASM | 40MB model download, complex setup, limited accuracy |
| AssemblyAI | Processes actual audio file, high accuracy, 99 languages, free tier |

---

## Files Involved

| File | Role |
|------|------|
| `backend/src/controllers/transcribe.controller.js` | Calls AssemblyAI API, polls for result |
| `backend/src/routes/message.route.js` | Exposes POST /api/messages/transcribe |
| `frontend/src/components/AudioMessagePlayer.jsx` | "To Text" button, calls backend, shows transcript |
| `backend/.env` | Stores ASSEMBLYAI_API_KEY |

---

## How AssemblyAI Works (Concept)

```
You → POST /v2/transcript { audio_url, speech_models }
         ↓
AssemblyAI queues the job
         ↓
Returns { id: "abc123", status: "queued" }
         ↓
You poll GET /v2/transcript/abc123 every 3 seconds
         ↓
status: "processing" → keep polling
status: "completed"  → read .text field
status: "error"      → something went wrong
```

AssemblyAI is ASYNC — it doesn't return the transcript immediately.
You must poll until it's done (usually 5-15 seconds for short audio).

---

## speech_models Parameter

```json
{
  "speech_models": ["universal-3-pro", "universal-2"],
  "language_detection": true
}
```

- `speech_models` is an ARRAY (required, no default)
- System tries models in order:
  - `universal-3-pro` → best accuracy for EN/ES/FR/DE/IT/PT
  - `universal-2` → fallback for all other 99 languages
- `language_detection: true` → auto-detects spoken language

---

## Full Flow

```
[Receiver sees voice message]
        ↓
Clicks "To Text" button
        ↓
AudioMessagePlayer.handleTranscribe()
  audioRef.current.pause()   ← stops the audio player
  stopCurrent()              ← stops any other playing audio
  setLoading(true)
        ↓
axiosInstance.post("/messages/transcribe", { audioUrl: src })
        ↓
─────────────── SERVER ───────────────
POST /api/messages/transcribe
  protectedRoute → transcribeAudio()
        ↓
submit(audioUrl):
  POST https://api.assemblyai.com/v2/transcript
  {
    audio_url: "https://res.cloudinary.com/.../audio_123.webm",
    language_detection: true,
    speech_models: ["universal-3-pro", "universal-2"]
  }
  headers: { authorization: ASSEMBLYAI_API_KEY }
        ↓
AssemblyAI downloads audio from Cloudinary
  → queues transcription job
  → returns { id: "abc123xyz", status: "queued" }
        ↓
poll(id):
  loop:
    GET /v2/transcript/abc123xyz
    body.status === "queued"      → wait 3s, retry
    body.status === "processing"  → wait 3s, retry
    body.status === "completed"   → return body.text ✓
    body.status === "error"       → throw error
        ↓
res.status(200).json({ transcript: "hey how are you doing today" })
─────────────────────────────────────
        ↓
AudioMessagePlayer receives transcript
  setTranscript("hey how are you doing today")
  setLoading(false)
        ↓
Transcript shown inside the chat bubble:
  🗣 hey how are you doing today   [×]
```

---

## API Key Security

```
WRONG (never do this):
  Frontend calls AssemblyAI directly
  → API key exposed in browser network tab
  → Anyone can steal your key and use your quota

CORRECT (what we do):
  Frontend → Backend → AssemblyAI
  API key only lives in backend/.env
  Never sent to the browser
```

---

## Error Cases

| Error | Cause | What happens |
|-------|-------|-------------|
| 400 Bad Request | Wrong params (e.g. `speech_model` instead of `speech_models`) | Error toast |
| 401 Unauthorized | Wrong/missing API key | Error toast |
| 500 from AssemblyAI | Audio file not accessible | Error toast |
| Timeout (120 polls × 3s = 6min) | Very long audio | "Transcription timed out" |

---

## Polling Logic Explained

```javascript
for (let i = 0; i < 120; i++) {        // max 120 attempts
    const res = await fetch(url);
    const body = await res.json();

    if (body.status === "completed")    // done!
        return body.text;
    if (body.status === "error")        // failed
        throw new Error(body.error);

    await new Promise(r => setTimeout(r, 3000));  // wait 3s
}
// if we get here, 6 minutes passed — give up
throw new Error("Transcription timed out");
```

Why polling and not webhooks?
- Webhooks require a public URL (not available in local dev)
- Polling is simpler and works everywhere
- For short voice messages (< 30s), polling completes in ~5-10 seconds
