/**
 * AudioMessagePlayer.jsx
 *
 * - Native audio player (only one plays at a time via audioManager)
 * - "To Text" button on received messages
 * - Calls backend POST /api/messages/transcribe with the Cloudinary URL
 * - Backend uses AssemblyAI to transcribe the actual audio content
 * - Transcript shown inside the same bubble
 */

import { useState, useRef, useEffect } from "react";
import { FileAudio, Captions, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { registerAudio, stopCurrent } from "../lib/audioManager";

function AudioMessagePlayer({ src, isMine }) {
    const [transcript, setTranscript] = useState(null);
    const [loading, setLoading] = useState(false);
    const audioRef = useRef(null);

    useEffect(() => {
        if (audioRef.current) registerAudio(audioRef.current);
    }, []);

    const handleTranscribe = async () => {
        if (loading || transcript !== null) return;

        // pause audio before transcribing
        if (audioRef.current) audioRef.current.pause();
        stopCurrent();

        setLoading(true);
        try {
            const res = await axiosInstance.post("/messages/transcribe", { audioUrl: src });
            setTranscript(res.data.transcript || "(no speech detected)");
        } catch (err) {
            toast.error(err.response?.data?.message || "Transcription failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-1 flex flex-col gap-1.5">
            {/* player + button */}
            <div className="flex items-center gap-2 flex-wrap">
                <FileAudio className="w-4 h-4 text-cyan-400 shrink-0" />
                <audio ref={audioRef} src={src} controls className="h-8 w-44 sm:w-56" />

                {!isMine && transcript === null && (
                    <button
                        type="button"
                        onClick={handleTranscribe}
                        disabled={loading}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-700/60 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition-colors disabled:opacity-50 shrink-0"
                        title="Convert voice to text"
                    >
                        {loading
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Captions className="w-3 h-3" />
                        }
                        <span>{loading ? "Transcribing..." : "To Text"}</span>
                    </button>
                )}
            </div>

            {/* transcript inside the bubble */}
            {transcript !== null && (
                <div className="flex items-start gap-1.5 bg-slate-700/40 rounded-lg px-2.5 py-1.5">
                    <Captions className="w-3 h-3 text-cyan-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-200 leading-relaxed flex-1">{transcript}</p>
                    <button
                        onClick={() => setTranscript(null)}
                        className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                        title="Clear"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default AudioMessagePlayer;
