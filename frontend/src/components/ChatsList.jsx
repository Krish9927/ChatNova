import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";

function ChatsList() {
  const { getMyChatPartners, chats, isUsersLoading, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getMyChatPartners();
  }, [getMyChatPartners]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;
  if (chats.length === 0) return <NoChatsFound />;

  return (
    <>
      {chats.map((chat) => {
        const isOnline = onlineUsers.includes(chat._id);
        return (
          <div
            key={chat._id}
            className="bg-cyan-500/10 p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors"
            onClick={() => setSelectedUser(chat)}
          >
            <div className="flex items-center gap-3">
              <div className={`avatar ${isOnline ? "avatar-online" : "avatar-offline"}`}>
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img src={chat.profilePic || "/avatar.png"} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <h4 className="text-slate-200 font-medium truncate">{chat.fullName || chat.username}</h4>
                {isOnline && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
export default ChatsList;