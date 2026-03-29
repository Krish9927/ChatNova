import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import NoConversationPlaceholder from "./NoConversationPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";

function ChatContainer() {
  const { selectedUser, getMessagesByUserId, messages, isMessagesLoading } = useChatStore();
  const { authUser } = useAuthStore();
  const messagesContainerRef = useRef(null);

  const formatTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    try {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return d.toISOString().slice(11, 16);
    }
  };
  useEffect(() => {
    if (!selectedUser) return;
    if (typeof getMessagesByUserId === "function") {
      getMessagesByUserId(selectedUser._id);
    }
  }, [selectedUser, getMessagesByUserId]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    // scroll the inner container to the bottom (smooth)
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } catch (e) {
      // fallback
      el.scrollTop = el.scrollHeight;
    }
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
          {messages.length > 0 && !isMessagesLoading ? (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`chat ${msg.senderId === authUser?._id ? "chat-end" : "chat-start"}`}
                >
                  <div
                    className={`chat-bubble relative ${msg.senderId === authUser?._id
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-800 text-slate-200"
                      }`}
                  >
                    {msg.image && (
                      <img src={msg.image} alt="Shared" className="rounded-lg h-48 object-cover" />
                    )}
                    {msg.text && <p className="mt-2">{msg.text}</p>}
                    <p className="text-xs mt-1 opacity-75 flex items-center gap-1">
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              {/* spacer removed; container ref handles scrolling */}
            </div>
          ) : isMessagesLoading ? (
            <MessagesLoadingSkeleton />
          ) : (
            <NoChatHistoryPlaceholder name={selectedUser?.fullName ?? ""} />
          )}
        </div>
      )}

      {selectedUser && <MessageInput />}
    </>
  );
}

export default ChatContainer;