import { useEffect, useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";
import { Users, Plus, Search } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";

function GroupsList() {
    const { groups, isGroupsLoading, fetchGroups, setSelectedGroup, selectedGroup, unreadGroup } = useGroupStore();
    const { setSelectedUser } = useChatStore();
    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleSelectGroup = (group) => {
        setSelectedUser(null);
        setSelectedGroup(group);
    };

    const filtered = groups.filter((g) =>
        g.name.toLowerCase().includes(search.toLowerCase())
    );

    if (isGroupsLoading) {
        return (
            <div className="px-4 pt-3 space-y-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* ── Search + New Group ──────────────────────────────────────── */}
            <div className="px-4 pt-3 pb-2 space-y-2">
                <div className="flex items-center gap-2.5 bg-white/5 border border-white/8 rounded-xl px-3.5 py-2.5">
                    <Search className="w-4 h-4 text-slate-500 shrink-0" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search groups..."
                        className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="text-slate-600 hover:text-slate-400 text-xs transition-colors">✕</button>
                    )}
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/8 transition-all text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    New Group
                </button>
            </div>

            {/* ── Group list ──────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 min-h-0">
                {filtered.length === 0 && (
                    <div className="text-center py-10 text-slate-600 text-sm">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        {search ? "No groups match your search" : "No groups yet"}
                    </div>
                )}

                {filtered.map((group) => {
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
                                {unread > 0 && (
                                    <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-cyan-500 text-white text-[11px] font-bold flex items-center justify-center leading-none">
                                        {unread > 99 ? "99+" : unread}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showModal && <CreateGroupModal onClose={() => setShowModal(false)} />}
        </div>
    );
}

export default GroupsList;
