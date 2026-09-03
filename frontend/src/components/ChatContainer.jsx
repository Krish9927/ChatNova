import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useTranslationStore } from "../store/useTranslationStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import AudioMessagePlayer from "./AudioMessagePlayer";

function ChatContainer() {
  const {
    selectedUser, getMessagesByUserId, messages,
    isMessagesLoading, subscribeToMessages, unsubscribeFromMessages,
    subscribeToTyping, unsubscribeFromTyping, typingUsers,
  } = useChatStore();
  const { authUser } = useAuthStore();
  // Subscribe to cache so component re-renders when translations finish
  const { getLang, getTranslated, isTranslating, cache } = useTranslationStore();
  const messagesContainerRef = useRef(null);
  const isInitialLoad = useRef(true);

  const targetLang = selectedUser ? getLang(selectedUser._id) : "default";

  const formatTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    try { return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
    catch { return d.toISOString().slice(11, 16); }
  };

  useEffect(() => {
    if (!selectedUser) return;
    // When the message load results in a 404 (ghost contact), the store will
    // call removeFriendById + toast, then the selectedUser will be cleared
    // by the parent once friends list updates. Nothing extra needed here.
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();
    subscribeToTyping();
    return () => {
      unsubscribeFromMessages();
      unsubscribeFromTyping();
    };
  }, [selectedUser, getMessagesByUserId, subscribeToMessages, unsubscribeFromMessages, subscribeToTyping, unsubscribeFromTyping]);

  useEffect(() => {
    if (targetLang !== "default" && messages.length > 0) {
      // use getState() to avoid stale closure and prevent infinite loop
      // (translateMessages from store would change reference on every render)
      useTranslationStore.getState().translateMessages(messages, targetLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLang, messages]);

  useEffect(() => {
    isInitialLoad.current = true;
  }, [selectedUser]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el || isMessagesLoading) return;
    if (isInitialLoad.current) {
      el.scrollTop = el.scrollHeight;
      isInitialLoad.current = false;
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isMessagesLoading]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ChatHeader />

      {/* Background stays fixed — only the scroll container moves */}
      <div
        className="flex-1 min-h-0 relative overflow-hidden"
        style={{
          backgroundImage: "url('/bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "local",
        }}
      >
        {/* Subtle dark overlay for readability */}
        <div className="absolute inset-0 bg-[#111827]/55 pointer-events-none" />

        {/* Scrollable messages — sits on top of the fixed bg */}
        <div
          ref={messagesContainerRef}
          className="relative z-10 h-full overflow-y-auto px-4 py-4"
        >
          {isMessagesLoading ? (
            <MessagesLoadingSkeleton />
          ) : messages.length === 0 ? (
            <NoChatHistoryPlaceholder name={selectedUser?.fullName ?? ""} />
          ) : (
            <div className="max-w-3xl mx-auto space-y-1">
              {messages.map((msg) => {
                const isMine = msg.senderId === authUser?._id;
                const displayText = (!isMine && msg.text && targetLang !== "default")
                  ? getTranslated(msg._id, msg.text, targetLang)
                  : msg.text;
                const translatingNow = !isMine && isTranslating(msg._id, targetLang);

                return (
                  <div
                    key={msg._id}
                    className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {!isMine && (
                      <img
                        src={selectedUser.profilePic || "/avatar.png"}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover shrink-0 mb-1"
                      />
                    )}
                    <div className={`flex flex-col max-w-[70%] ${isMine ? "items-end" : "items-start"}`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMine
                        ? "bg-cyan-500 text-white rounded-br-sm"
                        : "bg-[#1a3a5c]/90 text-slate-100 rounded-bl-sm"
                        }`}>
                        {msg.image && (
                          <img src={msg.image} alt="Shared" className="rounded-xl max-h-48 object-cover mb-1" />
                        )}
                        {msg.audio && <AudioMessagePlayer src={msg.audio} isMine={isMine} />}
                        {msg.sticker && (
                          <span className="text-5xl leading-none block">{msg.sticker}</span>
                        )}
                        {msg.text && (
                          <p className={translatingNow ? "opacity-50" : ""}>{displayText}</p>
                        )}
                        {!isMine && targetLang !== "default" && msg.text && displayText !== msg.text && (
                          <p className="text-[10px] mt-1 opacity-40 italic">Original: {msg.text}</p>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 px-1">{formatTime(msg.createdAt)}</p>
                    </div>
                    {isMine && <div className="w-7 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Input always at bottom, outside the bg div */}
      {typingUsers[selectedUser?._id] && (
        <div className="px-6 py-1.5 bg-[#111827]/80 border-t border-white/5 flex items-center gap-2">
          <div className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
          </div>
          <span className="text-xs text-slate-400 italic">
            {selectedUser?.fullName || selectedUser?.username} is typing…
          </span>
        </div>
      )}
      <MessageInput />
    </div>
  );
}

export default ChatContainer;
