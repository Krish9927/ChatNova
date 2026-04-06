/*
 * CHANGED: ChatHeader.jsx
 * Date: 2025
 * Changes:
 *  - Imported TranslationSelector component
 *  - Added TranslationSelector to the right side of the header
 *  - Fixed layout to use min-h and gap instead of max-h to prevent clipping
 *  - Fixed online status using real onlineUsers from useAuthStore
 */
import { XIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import TranslationSelector from "./TranslationSelector";
import { useEffect } from "react";

function ChatHeader() {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  const isOnline = onlineUsers.includes(selectedUser._id);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  return (
    <div className="flex justify-between items-center bg-slate-800/50 border-b border-slate-700/50 min-h-[64px] px-6 gap-3">
      {/* Left — avatar + name */}
      <div className="flex items-center space-x-3 min-w-0">
        <div className={`avatar shrink-0 ${isOnline ? "avatar-online" : "avatar-offline"}`}>
          <div className="w-10 rounded-full">
            <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.username} />
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="text-slate-200 font-medium truncate">
            {selectedUser.fullName || selectedUser.username}
          </h3>
          <p className={`text-xs ${isOnline ? "text-green-400" : "text-slate-400"}`}>
            {isOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Right — translation selector + close */}
      <div className="flex items-center gap-3 shrink-0">
        <TranslationSelector userId={selectedUser._id} />
        <button onClick={() => setSelectedUser(null)}>
          <XIcon className="w-5 h-5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer" />
        </button>
      </div>
    </div>
  );
}

export default ChatHeader;
