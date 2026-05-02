import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupStore } from "../store/useGroupStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import { Users, Search } from "lucide-react";

function UnreadBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-cyan-500 text-white text-[11px] font-bold flex items-center justify-center leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ChatsList() {
  const { getMyChatPartners, chats, isUsersLoading, setSelectedUser, selectedUser, unreadDM } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const { groups, fetchGroups, isGroupsLoading, setSelectedGroup, selectedGroup, unreadGroup } = useGroupStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    getMyChatPartners();
    fetchGroups();
  }, [getMyChatPartners]);

  const q = search.toLowerCase();
  const filteredChats = chats.filter((c) =>
    (c.fullName || c.username || "").toLowerCase().includes(q)
  );
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(q)
  );

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

  return (
    <div className="flex flex-col h-full">
      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5 bg-white/5 border border-white/8 rounded-xl px-3.5 py-2.5">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats & groups..."
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── List ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 min-h-0">
        {filteredChats.length === 0 && filteredGroups.length === 0 && (
          <NoChatsFound />
        )}

        {/* DM chats */}
        {filteredChats.length > 0 && (
          <>
            {/* Section label */}
            <p className="px-1 pt-1 pb-0.5 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
              Direct Messages
            </p>
            {filteredChats.map((chat) => {
              const isOnline = onlineUsers.includes(chat._id);
              const isActive = selectedUser?._id === chat._id;
              const unread = unreadDM[chat._id] || 0;

              return (
                <div
                  key={chat._id}
                  onClick={() => handleSelectUser(chat)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${isActive
                      ? "bg-cyan-500/15 border border-cyan-500/25"
                      : "hover:bg-white/5 border border-transparent"
                    }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={chat.profilePic || "/avatar.png"}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0d1117]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${unread > 0 ? "text-white" : "text-slate-200"}`}>
                        {chat.fullName || chat.username}
                      </p>
                      <p className={`text-xs truncate ${isOnline ? "text-emerald-400" : "text-slate-600"}`}>
                        {isOnline ? "Online" : "Offline"}
                      </p>
                    </div>
                    <UnreadBadge count={unread} />
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Groups */}
        {filteredGroups.length > 0 && (
          <>
            <p className={`px-1 pb-0.5 text-[10px] font-semibold text-slate-600 uppercase tracking-widest ${filteredChats.length > 0 ? "pt-3" : "pt-1"}`}>
              Groups
            </p>
            {filteredGroups.map((group) => {
              const isActive = selectedGroup?._id === group._id;
              const unread = unreadGroup[group._id] || 0;

              return (
                <div
                  key={group._id}
                  onClick={() => handleSelectGroup(group)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${isActive
                      ? "bg-cyan-500/15 border border-cyan-500/25"
                      : "hover:bg-white/5 border border-transparent"
                    }`}
                >
                  <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden border border-white/5">
                    {group.avatar
                      ? <img src={group.avatar} className="w-full h-full object-cover" alt="" />
                      : <Users className="w-5 h-5 text-slate-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${unread > 0 ? "text-white" : "text-slate-200"}`}>
                        {group.name}
                      </p>
                      <p className="text-xs text-slate-600">{group.members.length} members</p>
                    </div>
                    <UnreadBadge count={unread} />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

export default ChatsList;
