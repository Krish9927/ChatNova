/*
 * CHANGED: ChatContainer.jsx
 * Date: 2025
 * Changes:
 *  - Imported useTranslationStore for per-conversation language support
 *  - Added useEffect to translate all messages when language changes or messages load
 *  - Render logic: only translates received messages (not sender's own)
 *  - Shows translated text from cache; falls back to original while translating
 *  - Shows original text as italic hint below translated message
 *  - Fixed optimistic update comment that was accidentally disabling the set() call
 */
import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useTranslationStore } from "../store/useTranslationStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import NoConversationPlaceholder from "./NoConversationPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";

function ChatContainer() {
  const {
    selectedUser, getMessagesByUserId, messages,
    isMessagesLoading, subscribeToMessages, unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const { getLang, translateMessages, getTranslated, isTranslating } = useTranslationStore();
  const messagesContainerRef = useRef(null);

  const targetLang = selectedUser ? getLang(selectedUser._id) : "default";

  const formatTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    try { return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
    catch { return d.toISOString().slice(11, 16); }
  };

  // load messages + subscribe
  useEffect(() => {
    if (!selectedUser) return;
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser, getMessagesByUserId, subscribeToMessages, unsubscribeFromMessages]);

  // translate all messages when language changes or messages load
  useEffect(() => {
    if (targetLang !== "default" && messages.length > 0) {
      translateMessages(messages, targetLang);
    }
  }, [targetLang, messages, translateMessages]);

  // auto-scroll
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    try { el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }
    catch { el.scrollTop = el.scrollHeight; }
  }, [messages]);

  return (
    <>
      <ChatHeader />
      {!selectedUser ? (
        <div className="flex-1 px-6 overflow-y-auto py-8" ref={messagesContainerRef}>
          <NoConversationPlaceholder />
        </div>
      ) : (
        <div className="flex-1 px-6 overflow-y-auto py-8" ref={messagesContainerRef}>
          {isMessagesLoading ? (
            <MessagesLoadingSkeleton />
          ) : messages.length === 0 ? (
            <NoChatHistoryPlaceholder name={selectedUser?.fullName ?? ""} />
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => {
                const isMine = msg.senderId === authUser?._id;
                // only translate received messages, not your own sent messages
                const displayText = (!isMine && msg.text && targetLang !== "default")
                  ? getTranslated(msg._id, msg.text, targetLang)
                  : msg.text;
                const translatingNow = !isMine && isTranslating(msg._id, targetLang);

                return (
                  <div
                    key={msg._id}
                    className={`chat ${isMine ? "chat-end" : "chat-start"}`}
                  >
                    <div
                      className={`chat-bubble relative ${isMine ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-200"
                        }`}
                    >
                      {msg.image && (
                        <img src={msg.image} alt="Shared" className="rounded-lg h-48 object-cover" />
                      )}
                      {msg.text && (
                        <p className={`mt-2 ${translatingNow ? "opacity-50" : ""}`}>
                          {displayText}
                        </p>
                      )}
                      {/* show original text hint when translated */}
                      {!isMine && targetLang !== "default" && msg.text && displayText !== msg.text && (
                        <p className="text-xs mt-1 opacity-50 italic">
                          Original: {msg.text}
                        </p>
                      )}
                      <p className="text-xs mt-1 opacity-75">
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {selectedUser && <MessageInput />}
    </>
  );
}

export default ChatContainer;
