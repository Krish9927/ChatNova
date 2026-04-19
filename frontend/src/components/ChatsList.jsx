import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupStore } from "../store/useGroupStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import { Users } from "lucide-react";

function UnreadBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-cyan-500 text-white text-xs font-bold flex items-center justify-center">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ChatsList() {
  const { getMyChatPartners, chats, isUsersLoading, setSelectedUser, selectedUser, unreadDM } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { groups, fetchGroups, isGroupsLoading, setSelectedGroup, selectedGroup, unreadGroup } = useGroupStore();

  useEffect(() => {
    getMyChatPartners();
    fetchGroups();
  }, [getMyChatPartners]);

  const handleSelectUser = (chat) => {
    setSelectedGroup(null);
    setSelectedUser(chat);
  };

  const handleSelectGroup = (group) => {
    setSelectedUser(null);
    setSelectedGroup(group);
  };

  const loading = isUsersLoading || isGroupsLoading;
  if (loading) return <UsersLoadingSkeleton />;
  if (chats.length === 0 && groups.length === 0) return <NoChatsFound />;

  return (
    <>
      {/* ── DM chats ─────────────────────────────────────────────────────── */}
      {chats.map((chat) => {
        const isOnline = onlineUsers.includes(chat._id);
        const isActive = selectedUser?._id === chat._id;
        const unread = unreadDM[chat._id] || 0;

        return (
          <div
            key={chat._id}
            onClick={() => handleSelectUser(chat)}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${isActive
                ? "bg-cyan-500/20 border border-cyan-500/30"
                : "bg-cyan-500/10 hover:bg-cyan-500/20"
              }`}
          >
            {/* Avatar with online dot */}
            <div className={`avatar shrink-0 ${isOnline ? "avatar-online" : "avatar-offline"}`}>
              <div className="w-11 h-11 rounded-full overflow-hidden">
                <img src={chat.profilePic || "/avatar.png"} alt="" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Name + status row */}
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className={`font-medium truncate ${unread > 0 ? "text-white" : "text-slate-200"}`}>
                  {chat.fullName || chat.username}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {isOnline ? "Online" : "Offline"}
                </p>
              </div>
              <UnreadBadge count={unread} />
            </div>
          </div>
        );
      })}

      {/* ── Groups separator ─────────────────────────────────────────────── */}
      {groups.length > 0 && (
        <>
          {chats.length > 0 && (
            <div className="flex items-center gap-2 px-1 py-1">
              <div className="flex-1 h-px bg-slate-700/60" />
              <span className="text-xs text-slate-500 shrink-0">Groups</span>
              <div className="flex-1 h-px bg-slate-700/60" />
            </div>
          )}

          {/* ── Group items ───────────────────────────────────────────────── */}
          {groups.map((group) => {
            const isActive = selectedGroup?._id === group._id;
            const unread = unreadGroup[group._id] || 0;

            return (
              <div
                key={group._id}
                onClick={() => handleSelectGroup(group)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${isActive
                    ? "bg-cyan-500/20 border border-cyan-500/30"
                    : "bg-cyan-500/10 hover:bg-cyan-500/20"
                  }`}
              >
                {/* Group avatar */}
                <div className="w-11 h-11 rounded-full bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                  {group.avatar
                    ? <img src={group.avatar} className="w-full h-full object-cover" alt="" />
                    : <Users className="w-5 h-5 text-cyan-400" />
                  }
                </div>

                {/* Name + member count + badge */}
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`font-medium truncate ${unread > 0 ? "text-white" : "text-slate-200"}`}>
                      {group.name}
                    </p>
                    <p className="text-xs text-slate-500">{group.members.length} members</p>
                  </div>
                  <UnreadBadge count={unread} />
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

export default ChatsList;
