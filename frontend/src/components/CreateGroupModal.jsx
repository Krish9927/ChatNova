import { useState } from "react";
import { X, Users } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";

function CreateGroupModal({ onClose }) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(false);

    const { allContacts } = useChatStore();
    const { createGroup } = useGroupStore();

    const toggleMember = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        await createGroup({ name, description, memberIds: selectedIds });
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-cyan-400" />
                        <h2 className="text-lg font-semibold text-white">Create Group</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Group name */}
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Group Name *</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Study Group"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Description</label>
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional"
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                    </div>

                    {/* Member picker */}
                    <div>
                        <label className="text-sm text-slate-400 mb-2 block">
                            Add Members ({selectedIds.length} selected)
                        </label>
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                            {allContacts.map((user) => (
                                <button
                                    key={user._id}
                                    type="button"
                                    onClick={() => toggleMember(user._id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${selectedIds.includes(user._id)
                                            ? "bg-cyan-500/20 border border-cyan-500/40"
                                            : "hover:bg-slate-700"
                                        }`}
                                >
                                    <img
                                        src={user.profilePic || "/avatar.png"}
                                        className="w-8 h-8 rounded-full object-cover"
                                        alt={user.username}
                                    />
                                    <span className="text-sm text-slate-200">{user.username}</span>
                                    {selectedIds.includes(user._id) && (
                                        <span className="ml-auto text-cyan-400 text-xs">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-5 border-t border-slate-700">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!name.trim() || loading}
                        className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? "Creating..." : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CreateGroupModal;
