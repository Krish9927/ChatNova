import { useRef, useState } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon } from "lucide-react";
import VoiceRecorder from "./VoiceRecorder";
import { createSTT } from "../lib/speechToText";

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const fileInputRef = useRef(null);
  const sttRef = useRef(null);

  const { sendMessage, isSoundEnabled } = useChatStore();

  const handleSendMessage = (e) => {
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
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Called by VoiceRecorder when user clicks Send — receives raw Blob
  const handleVoiceSend = async (audioBlob) => {
    const { selectedUser } = useChatStore.getState();
    if (!selectedUser) return;

    const formData = new FormData();
    formData.append("audio", audioBlob, "voice-message.webm");

    try {
      // use axiosInstance but override Content-Type so axios sets multipart boundary
      const res = await axiosInstance.post(
        `/messages/send-audio/${selectedUser._id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      // add the confirmed message to the store
      useChatStore.getState().addMessage(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send voice message");
    }
  };

  // Called by VoiceRecorder when user clicks STT button
  const handleTranscribe = async (audioBlob) => {
    setIsTranscribing(true);
    toast("Transcribing...", { icon: "🎙️", id: "stt" });

    try {
      let finalText = "";

      const stt = await createSTT({
        onResult: ({ final, interim }) => {
          if (final) finalText += final + " ";
          // show interim in input as live preview
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

      if (!stt) {
        setIsTranscribing(false);
        toast.dismiss("stt");
        return;
      }

      sttRef.current = stt;

      // If online → Web Speech API does live mic, no blob needed
      // If offline → Vosk needs the blob
      if (navigator.onLine) {
        stt.start();
        // auto-stop after 30s safety limit
        setTimeout(() => stt.stop(), 30000);
      } else {
        await stt.start(audioBlob);
      }
    } catch (err) {
      setIsTranscribing(false);
      toast.dismiss("stt");
      toast.error("Transcription failed");
      console.error(err);
    }
  };

  return (
    <div className="p-4 border-t border-slate-700/50">
      {imagePreview && (
        <div className="max-w-3xl mx-auto mb-3 flex items-center">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-slate-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 hover:bg-slate-700"
              type="button"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            isSoundEnabled && playRandomKeyStrokeSound();
          }}
          className={`flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg py-2 px-4 ${isTranscribing ? "border-cyan-500/60 text-cyan-300" : ""
            }`}
          placeholder={isTranscribing ? "Listening..." : "Type your message..."}
        />

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
        />

        {/* image picker */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg px-3 py-2 transition-colors ${imagePreview ? "text-cyan-500" : ""
            }`}
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        {/* voice recorder */}
        <VoiceRecorder onSend={handleVoiceSend} onTranscribe={handleTranscribe} />

        {/* send text/image */}
        <button
          type="submit"
          disabled={!text.trim() && !imagePreview}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg px-4 py-2 font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

export default MessageInput;
