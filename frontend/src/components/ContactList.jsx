import { useEffect, useState } from "react";
import { useFriendStore } from "../store/useFriendStore";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { Search, UserPlus, Check, X, Clock, Users } from "lucide-react";

function ContactList() {
  const {
    friends, pendingRequests, sentRequests, searchResults, isSearching,
    fetchFriends, fetchPending, fetchSent, searchUsers, clearSearch,
    sendRequest, acceptRequest, rejectRequest,
  } = useFriendStore();
  const { setSelectedUser } = useChatStore();
  const { setSelectedGroup } = useGroupStore();
  const { onlineUsers } = useAuthStore();

  const [tab, setTab] = useState("friends"); // "friends" | "requests" | "find"
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchFriends();
    fetchPending();
    fetchSent();
  }, []);

  // debounce search
  useEffect(() => {
    if (tab !== "find") return;
    const t = setTimeout(() => searchUsers(query), 350);
    return () => clearTimeout(t);
  }, [query, tab]);

  const handleOpenChat = (friend) => {
    setSelectedGroup(null);
    setSelectedUser(friend);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Sub-tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 pt-3 pb-2">
        {[
          { id: "friends", label: "Friends", count: friends.length },
          { id: "requests", label: "Requests", count: pendingRequests.length },
          { id: "find", label: "Find People", count: null },
        ].map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => { setTab(id); if (id !== "find") clearSearch(); }}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === id
              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              }`}
          >
            {label}
            {count > 0 && (
              <span className={`min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${tab === id ? "bg-cyan-500 text-white" : "bg-slate-700 text-slate-400"
                }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Friends tab ───────────────────────────────────────────── */}
      {tab === "friends" && (
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 min-h-0">
          {friends.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-700" />
              <p className="text-slate-600 text-sm">No contacts yet</p>
              <p className="text-slate-700 text-xs mt-1">Find people to add as contacts</p>
            </div>
          ) : (
            friends.map((friend) => {
              const isOnline = onlineUsers.includes(friend._id);
              return (
                <div
                  key={friend._id}
                  onClick={() => handleOpenChat(friend)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer hover:bg-white/5 border border-transparent transition-all"
                >
                  <div className="relative shrink-0">
                    <img src={friend.profilePic || "/avatar.png"} alt="" className="w-10 h-10 rounded-full object-cover" />
                    {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0d1117]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 truncate">{friend.username}</p>
                    <p className={`text-xs ${isOnline ? "text-emerald-400" : "text-slate-600"}`}>
                      {isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Requests tab ──────────────────────────────────────────── */}
      {tab === "requests" && (
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-0">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-10">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-700" />
              <p className="text-slate-600 text-sm">No pending requests</p>
            </div>
          ) : (
            pendingRequests.map((req) => (
              <div key={req._id} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/3 border border-white/5">
                <img src={req.sender.profilePic || "/avatar.png"} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200 truncate">{req.sender.username}</p>
                  <p className="text-xs text-slate-600">wants to connect</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => acceptRequest(req._id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all"
                    title="Accept"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => rejectRequest(req._id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                    title="Reject"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Find People tab ───────────────────────────────────────── */}
      {tab === "find" && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/8 rounded-xl px-3.5 py-2.5">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by username or email..."
                className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
                autoFocus
              />
              {isSearching && <span className="text-xs text-slate-600 animate-pulse">...</span>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 min-h-0">
            {!query && (
              <p className="text-center text-slate-700 text-xs py-8">Type a name or email to search</p>
            )}
            {query && searchResults.length === 0 && !isSearching && (
              <p className="text-center text-slate-600 text-sm py-8">No users found</p>
            )}
            {searchResults.map((user) => {
              const alreadySent = sentRequests.some((r) => r.receiver._id?.toString() === user._id?.toString());
              return (
                <div key={user._id} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/3 border border-white/5">
                  <img src={user.profilePic || "/avatar.png"} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 truncate">{user.username}</p>
                    <p className="text-xs text-slate-600 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => !alreadySent && sendRequest(user._id)}
                    disabled={alreadySent}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${alreadySent
                      ? "bg-slate-700/50 text-slate-500 cursor-default"
                      : "bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 border border-cyan-500/20"
                      }`}
                  >
                    {alreadySent ? (
                      <><Clock className="w-3 h-3" /> Sent</>
                    ) : (
                      <><UserPlus className="w-3 h-3" /> Add</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactList;
