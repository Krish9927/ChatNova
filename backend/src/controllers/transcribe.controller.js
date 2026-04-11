import { ENV } from "../lib/env.js";

const BASE = "https://api.assemblyai.com";

function aaiHeaders() {
    return {
        authorization: ENV.ASSEMBLYAI_API_KEY,
        "content-type": "application/json",
    };
}

async function submit(audioUrl) {
    const res = await fetch(`${BASE}/v2/transcript`, {
        method: "POST",
        headers: aaiHeaders(),
        body: JSON.stringify({
            audio_url: audioUrl,
            language_detection: true,
            speech_models: ["universal-3-pro", "universal-2"],
        }),
    });
    const body = await res.json();
    if (!res.ok) {
        console.error("[AssemblyAI] submit error:", JSON.stringify(body));
        throw new Error(body?.error || `Submit failed ${res.status}`);
    }
    return body.id;
}

async function poll(id) {
    const url = `${BASE}/v2/transcript/${id}`;
    for (let i = 0; i < 120; i++) {
        const res = await fetch(url, { headers: aaiHeaders() });
        const body = await res.json();
        if (body.status === "completed") return body.text || "(no speech detected)";
        if (body.status === "error") throw new Error(body.error || "Transcription error");
        await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error("Transcription timed out");
}

export const transcribeAudio = async (req, res) => {
    try {
        const { audioUrl } = req.body;
        if (!audioUrl) return res.status(400).json({ message: "audioUrl is required" });

        console.log("[transcribe] url:", audioUrl?.slice(0, 80));
        console.log("[transcribe] key loaded:", !!ENV.ASSEMBLYAI_API_KEY);

        const id = await submit(audioUrl);
        const transcript = await poll(id);
        res.status(200).json({ transcript });
    } catch (err) {
        console.error("[transcribe] error:", err.message);
        res.status(500).json({ message: err.message });
    }
};
