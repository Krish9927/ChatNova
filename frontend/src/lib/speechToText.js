/**
 * speechToText.js
 *
 * Strategy:
 *  1. If browser is ONLINE  → use Web Speech API (SpeechRecognition)
 *     - Built into Chrome/Edge/Safari, no install needed
 *     - Streams results in real-time while speaking
 *
 *  2. If browser is OFFLINE → use Vosk (via vosk-browser WASM package)
 *     - Fully offline, runs in a Web Worker
 *     - Requires `npm install vosk-browser` in frontend
 *     - Model is downloaded once and cached in IndexedDB
 *
 * Usage:
 *   const stt = createSTT({ onResult, onEnd, onError });
 *   stt.start(audioBlob?)   // pass blob for file transcription, or nothing for live mic
 *   stt.stop()
 */

// ─── Web Speech API (online) ──────────────────────────────────────────────────

function createWebSpeechSTT({ onResult, onEnd, onError }) {
    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        onError?.("Web Speech API not supported in this browser.");
        return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) final += t;
            else interim += t;
        }
        onResult?.({ final, interim });
    };

    recognition.onerror = (e) => onError?.(e.error);
    recognition.onend = () => onEnd?.();

    return {
        start: () => recognition.start(),
        stop: () => recognition.stop(),
    };
}

// ─── Vosk (offline WASM) ──────────────────────────────────────────────────────

async function createVoskSTT({ onResult, onEnd, onError }) {
    try {
        // dynamically import so it doesn't break if not installed
        const { createModel } = await import("vosk-browser");

        // small English model (~40MB), cached after first download
        const MODEL_URL = "/vosk-model-small-en-us-0.15.tar.gz";

        const model = await createModel(MODEL_URL);
        const recognizer = new model.KaldiRecognizer(16000);

        recognizer.on("result", (msg) => {
            const text = msg.result?.text || "";
            if (text) onResult?.({ final: text, interim: "" });
        });

        recognizer.on("partialresult", (msg) => {
            const text = msg.result?.partial || "";
            onResult?.({ final: "", interim: text });
        });

        return {
            start: async (audioBlob) => {
                if (!audioBlob) {
                    onError?.("Vosk requires an audio blob for offline transcription.");
                    return;
                }
                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioCtx = new AudioContext({ sampleRate: 16000 });
                const decoded = await audioCtx.decodeAudioData(arrayBuffer);
                const channelData = decoded.getChannelData(0);
                // feed PCM data in chunks
                const chunkSize = 4000;
                for (let i = 0; i < channelData.length; i += chunkSize) {
                    const chunk = channelData.slice(i, i + chunkSize);
                    recognizer.acceptWaveform(chunk);
                }
                recognizer.retrieveFinalResult();
                onEnd?.();
            },
            stop: () => {
                recognizer.retrieveFinalResult();
                onEnd?.();
            },
        };
    } catch (err) {
        onError?.(`Vosk failed to load: ${err.message}. Install with: npm install vosk-browser`);
        return null;
    }
}

// ─── Public factory ───────────────────────────────────────────────────────────

/**
 * createSTT({ onResult, onEnd, onError })
 *
 * Auto-selects Web Speech API (online) or Vosk (offline).
 * Returns { start, stop } or null on failure.
 *
 * onResult({ final: string, interim: string })
 * onEnd()
 * onError(message: string)
 */
export async function createSTT(callbacks) {
    const isOnline = navigator.onLine;

    if (isOnline) {
        const stt = createWebSpeechSTT(callbacks);
        if (stt) return stt;
        // fallthrough to Vosk if Web Speech not supported
    }

    // offline or Web Speech unavailable
    return await createVoskSTT(callbacks);
}
