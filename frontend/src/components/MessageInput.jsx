import { useRef, useState } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { Paperclip, Send, X, Smile } from "lucide-react";
import VoiceRecorder from "./VoiceRecorder";
import StickerPicker from "./StickerPicker";
import { createSTT } from "../lib/speechToText";

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showStickers, setShowStickers] = useState(false);

  const fileInputRef = useRef(null);
  const sttRef = useRef(null);
  const { sendMessage, isSoundEnabled } = useChatStore();

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();
    sendMessage({ text: text.trim(), image: imagePreview });
    setText("");
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file?.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Send sticker as a message
  const handleStickerSelect = (sticker) => {
    sendMessage({ sticker: sticker.value });
    setShowStickers(false);
  };

  const handleVoiceSend = async (audioBlob) => {
    const { selectedUser } = useChatStore.getState();
    if (!selectedUser) return;
    const formData = new FormData();
    formData.append("audio", audioBlob, "voice-message.webm");
    try {
      const res = await axiosInstance.post(`/messages/send-audio/${selectedUser._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      useChatStore.getState().addMessage(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send voice message");
    }
  };

  const handleTranscribe = async (audioBlob) => {
    setIsTranscribing(true);
    toast("Transcribing...", { icon: "🎙️", id: "stt" });
    try {
      let finalText = "";
      const stt = await createSTT({
        onResult: ({ final, interim }) => {
          if (final) finalText += final + " ";
          setText(finalText + interim);
        },
        onEnd: () => {
          setText(finalText.trim());
          setIsTranscribing(false);
          toast.dismiss("stt");
          toast.success("Transcription done");
        },
        onError: (msg) => {
          setIsTranscribing(false);
          toast.dismiss("stt");
          toast.error(`STT error: ${msg}`);
        },
      });
      if (!stt) { setIsTranscribing(false); toast.dismiss("stt"); return; }
      sttRef.current = stt;
      if (navigator.onLine) { stt.start(); setTimeout(() => stt.stop(), 30000); }
      else await stt.start(audioBlob);
    } catch {
      setIsTranscribing(false);
      toast.dismiss("stt");
      toast.error("Transcription failed");
    }
  };

  return (
    <div className="px-4 py-3 border-t border-white/5 bg-[#0d1117]/60">
      {/* Image preview */}
      {imagePreview && (
        <div className="mb-2 flex items-center">
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-white/10" />
            <button
              onClick={() => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-600"
              type="button"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2">
        {/* Text input */}
        <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/8 rounded-2xl px-4 py-2.5">
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              isSoundEnabled && playRandomKeyStrokeSound();
            }}
            placeholder={isTranscribing ? "Listening..." : "Type a message..."}
            className={`flex-1 bg-transparent text-sm outline-none placeholder-slate-500 ${isTranscribing ? "text-cyan-300" : "text-slate-100"
              }`}
          />
          {/* Attachment */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`shrink-0 text-slate-500 hover:text-slate-300 transition-colors ${imagePreview ? "text-cyan-400" : ""}`}
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>

        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />

        {/* Sticker button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowStickers((v) => !v)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${showStickers
                ? "bg-cyan-500/20 text-cyan-400"
                : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/8"
              }`}
            title="Stickers"
          >
            <Smile className="w-5 h-5" />
          </button>

          {showStickers && (
            <StickerPicker
              onSelect={handleStickerSelect}
              onClose={() => setShowStickers(false)}
            />
          )}
        </div>

        {/* Voice recorder */}
        <VoiceRecorder onSend={handleVoiceSend} onTranscribe={handleTranscribe} />

        {/* Send button */}
        <button
          type="submit"
          disabled={!text.trim() && !imagePreview}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default MessageInput;
