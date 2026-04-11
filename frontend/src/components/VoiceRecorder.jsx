/**
 * VoiceRecorder.jsx
 *
 * Renders a mic button in MessageInput.
 * States:
 *   idle      → show mic icon, click to start recording
 *   recording → show animated red dot + timer + stop button
 *   preview   → show audio player + send / discard buttons
 *
 * Props:
 *   onSend(audioBase64: string)  — called with base64 data URL when user sends
 *   onTranscribe(blob: Blob)     — called when user clicks the "speech→text" button
 */

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Send, Trash2, FileAudio } from "lucide-react";
import toast from "react-hot-toast";

function VoiceRecorder({ onSend, onTranscribe }) {
    const [state, setState] = useState("idle"); // idle | recording | preview
    const [seconds, setSeconds] = useState(0);
    const [audioUrl, setAudioUrl] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const streamRef = useRef(null);

    // cleanup on unmount
    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            streamRef.current?.getTracks().forEach((t) => t.stop());
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            chunksRef.current = [];

            // pick the first supported mime type (Safari needs mp4, Firefox prefers ogg)
            const mimeType = [
                "audio/webm;codecs=opus",
                "audio/webm",
                "audio/ogg;codecs=opus",
                "audio/mp4",
            ].find((t) => MediaRecorder.isTypeSupported(t)) || "";

            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
                if (blob.size === 0) {
                    toast.error("Recording was empty, please try again.");
                    setState("idle");
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioUrl(url);
                setState("preview");
                stream.getTracks().forEach((t) => t.stop());
            };

            recorder.start(100); // collect data every 100ms
            setState("recording");
            setSeconds(0);
            timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
        } catch {
            toast.error("Microphone access denied.");
        }
    };

    const stopRecording = () => {
        clearInterval(timerRef.current);
        mediaRecorderRef.current?.stop();
    };

    const discard = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setAudioBlob(null);
        setState("idle");
        setSeconds(0);
    };

    const handleSend = () => {
        if (!audioBlob || audioBlob.size === 0) {
            toast.error("Recording is empty.");
            return;
        }
        onSend(audioBlob); // pass raw Blob — FormData built in MessageInput
        discard();
    };

    const handleTranscribe = () => {
        if (!audioBlob) return;
        onTranscribe(audioBlob);
    };

    const formatTime = (s) =>
        `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    // ── idle ──────────────────────────────────────────────────────────────────
    if (state === "idle") {
        return (
            <button
                type="button"
                onClick={startRecording}
                className="bg-slate-800/50 text-slate-400 hover:text-cyan-400 rounded-lg px-3 py-2 transition-colors"
                title="Record voice message"
            >
                <Mic className="w-5 h-5" />
            </button>
        );
    }

    // ── recording ─────────────────────────────────────────────────────────────
    if (state === "recording") {
        return (
            <div className="flex items-center gap-2 bg-slate-800/50 border border-red-500/40 rounded-lg px-3 py-2">
                {/* pulsing red dot */}
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-red-400 font-mono w-12">{formatTime(seconds)}</span>
                <button
                    type="button"
                    onClick={stopRecording}
                    className="text-slate-400 hover:text-white transition-colors"
                    title="Stop recording"
                >
                    <Square className="w-4 h-4 fill-current" />
                </button>
            </div>
        );
    }

    // ── preview ───────────────────────────────────────────────────────────────
    return (
        <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-600/40 rounded-lg px-3 py-2">
            <FileAudio className="w-4 h-4 text-cyan-400 shrink-0" />
            <audio src={audioUrl} controls className="h-7 w-36 sm:w-48" />

            {/* speech-to-text button */}
            <button
                type="button"
                onClick={handleTranscribe}
                className="text-xs text-slate-400 hover:text-cyan-400 transition-colors px-1"
                title="Convert speech to text"
            >
                STT
            </button>

            {/* send */}
            <button
                type="button"
                onClick={handleSend}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
                title="Send voice message"
            >
                <Send className="w-4 h-4" />
            </button>

            {/* discard */}
            <button
                type="button"
                onClick={discard}
                className="text-slate-500 hover:text-red-400 transition-colors"
                title="Discard"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

export default VoiceRecorder;
