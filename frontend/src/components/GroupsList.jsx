import { useEffect, useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";
import { Users, Plus } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";

function GroupsList() {
    const { groups, isGroupsLoading, fetchGroups, setSelectedGroup, selectedGroup, unreadGroup } = useGroupStore();
    const { setSelectedUser } = useChatStore();
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchGroups();
        // subscribeToGroupEvents is called once from ChatPage — not here
    }, []);

    const handleSelectGroup = (group) => {
        setSelectedUser(null);      // clear any DM selection
        setSelectedGroup(group);
    };

    if (isGroupsLoading) {
        return (
            <div className="space-y-2 px-1">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-slate-700/30 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <>
            {/* New Group button */}
            <button
                onClick={() => setShowModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mb-2 rounded-lg border border-dashed border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 transition-colors text-sm font-medium"
            >
                <Plus className="w-4 h-4" />
                New Group
            </button>

            {/* Groups list */}
            {groups.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No groups yet
                </div>
            ) : (
                <div className="space-y-2">
                    {groups.map((group) => {
                        const unread = unreadGroup[group._id] || 0;
                        return (
                            <div
                                key={group._id}
                                onClick={() => handleSelectGroup(group)}
                                className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${selectedGroup?._id === group._id
                                        ? "bg-cyan-500/20 border border-cyan-500/30"
                                        : "bg-cyan-500/10 hover:bg-cyan-500/20"
                                    }`}
                            >
                                <div className="w-11 h-11 rounded-full bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                    {group.avatar
                                        ? <img src={group.avatar} className="w-full h-full object-cover" alt="" />
                                        : <Users className="w-5 h-5 text-cyan-400" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className={`font-medium truncate ${unread > 0 ? "text-white" : "text-slate-200"}`}>
                                            {group.name}
                                        </p>
                                        <p className="text-xs text-slate-500">{group.members.length} members</p>
                                    </div>
                                    {unread > 0 && (
                                        <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-cyan-500 text-white text-xs font-bold flex items-center justify-center">
                                            {unread > 99 ? "99+" : unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create group modal */}
            {showModal && <CreateGroupModal onClose={() => setShowModal(false)} />}
        </>
    );
}

export default GroupsList;
