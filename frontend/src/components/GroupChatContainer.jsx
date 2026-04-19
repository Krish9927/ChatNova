import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";
import { useTranslationStore } from "../store/useTranslationStore";
import { ImageIcon, SendIcon, XIcon, Users, UserPlus, UserMinus, Trash2 } from "lucide-react";
import AudioMessagePlayer from "./AudioMessagePlayer";
import VoiceRecorder from "./VoiceRecorder";
import TranslationSelector from "./TranslationSelector";
import toast from "react-hot-toast";

function GroupChatContainer() {
    const { authUser } = useAuthStore();
    const {
        selectedGroup, groupMessages, isGroupMessagesLoading,
        fetchGroupMessages, sendGroupMessage, sendGroupAudioMessage,
        addMembers, removeMember, deleteGroup,
    } = useGroupStore();
    const { allContacts, getAllContacts } = useChatStore();
    const { getLang, translateMessages, getTranslated, isTranslating } = useTranslationStore();

    const [text, setText] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const [showMembers, setShowMembers] = useState(false);
    const [showAddMembers, setShowAddMembers] = useState(false);
    const [addingIds, setAddingIds] = useState([]);
    const fileInputRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const isInitialLoad = useRef(true);

    const isAdmin = selectedGroup?.admin?._id === authUser?._id ||
        selectedGroup?.admin === authUser?._id;

    useEffect(() => {
        if (selectedGroup) fetchGroupMessages(selectedGroup._id);
    }, [selectedGroup]);

    useEffect(() => {
        if (showAddMembers) getAllContacts();
    }, [showAddMembers]);

    const targetLang = selectedGroup ? getLang(selectedGroup._id) : "default";

    const handleAddMembers = async () => {
        if (!addingIds.length) return;
        await addMembers(selectedGroup._id, addingIds);
        setAddingIds([]);
        setShowAddMembers(false);
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm("Remove this member?")) return;
        await removeMember(selectedGroup._id, memberId);
    };

    const handleDeleteGroup = async () => {
        if (!window.confirm(`Delete group "${selectedGroup.name}"? This cannot be undone.`)) return;
        await deleteGroup(selectedGroup._id);
    };

    // translate messages when language changes or messages load
    useEffect(() => {
        if (targetLang !== "default" && groupMessages.length > 0) {
            translateMessages(groupMessages, targetLang);
        }
    }, [targetLang, groupMessages, translateMessages]);

    // reset initial load flag when group changes
    useEffect(() => {
        isInitialLoad.current = true;
    }, [selectedGroup?._id]);

    // auto-scroll: instant on initial load, smooth for new messages
    useEffect(() => {
        const el = messagesContainerRef.current;
        if (!el || isGroupMessagesLoading) return;

        if (isInitialLoad.current) {
            el.scrollTop = el.scrollHeight;
            isInitialLoad.current = false;
        } else {
            el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        }
    }, [groupMessages, isGroupMessagesLoading]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!text.trim() && !imagePreview) return;
        sendGroupMessage(selectedGroup._id, { text: text.trim(), image: imagePreview });
        setText("");
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file?.type.startsWith("image/")) { toast.error("Select an image"); return; }
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleVoiceSend = async (audioBlob) => {
        await sendGroupAudioMessage(selectedGroup._id, audioBlob);
    };

    const formatTime = (v) => {
        if (!v) return "";
        return new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    if (!selectedGroup) return null;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/50 min-h-[64px]">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                        {selectedGroup.avatar
                            ? <img src={selectedGroup.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                            : <Users className="w-5 h-5 text-cyan-400" />
                        }
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{selectedGroup.name}</p>
                        <p className="text-xs text-slate-400">{selectedGroup.members.length} members</p>
                    </div>
                </div>

                {/* Right: translation + members toggle */}
                <div className="flex items-center gap-2 shrink-0">
                    <TranslationSelector userId={selectedGroup._id} />
                    <button
                        onClick={() => setShowMembers((v) => !v)}
                        className={`text-slate-400 hover:text-cyan-400 transition-colors ${showMembers ? "text-cyan-400" : ""}`}
                        title="View members"
                    >
                        <Users className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Members panel */}
            {showMembers && (
                <div className="bg-slate-800/80 border-b border-slate-700/50 px-4 py-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Members</p>
                        {isAdmin && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowAddMembers((v) => !v)}
                                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    Add
                                </button>
                                <button
                                    onClick={handleDeleteGroup}
                                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Group
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Add members picker — admin only */}
                    {isAdmin && showAddMembers && (
                        <div className="bg-slate-900/60 rounded-lg p-2 space-y-1">
                            <p className="text-xs text-slate-500 mb-1">Select contacts to add:</p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {allContacts
                                    .filter((c) => !selectedGroup.members.some((m) => (m._id || m) === c._id))
                                    .map((c) => (
                                        <button
                                            key={c._id}
                                            onClick={() => setAddingIds((prev) =>
                                                prev.includes(c._id) ? prev.filter((x) => x !== c._id) : [...prev, c._id]
                                            )}
                                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${addingIds.includes(c._id)
                                                ? "bg-cyan-500/20 text-cyan-300"
                                                : "text-slate-300 hover:bg-slate-700"
                                                }`}
                                        >
                                            <img src={c.profilePic || "/avatar.png"} className="w-5 h-5 rounded-full" alt="" />
                                            {c.username}
                                            {addingIds.includes(c._id) && <span className="ml-auto text-cyan-400">✓</span>}
                                        </button>
                                    ))
                                }
                            </div>
                            <button
                                onClick={handleAddMembers}
                                disabled={!addingIds.length}
                                className="w-full mt-1 py-1.5 rounded bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium disabled:opacity-40 transition-colors"
                            >
                                Add {addingIds.length > 0 ? `(${addingIds.length})` : ""}
                            </button>
                        </div>
                    )}

                    {/* Member list */}
                    <div className="flex flex-wrap gap-2">
                        {selectedGroup.members.map((m) => {
                            const memberId = m._id || m;
                            const isAdminMember = memberId === (selectedGroup.admin?._id || selectedGroup.admin);
                            const isSelf = memberId === authUser?._id;
                            return (
                                <div key={memberId} className="flex items-center gap-1.5 bg-slate-700/50 rounded-full pl-1.5 pr-2 py-1">
                                    <img src={m.profilePic || "/avatar.png"} className="w-5 h-5 rounded-full" alt="" />
                                    <span className="text-xs text-slate-300">{m.username || memberId}</span>
                                    {isAdminMember && <span className="text-xs text-cyan-400">👑</span>}
                                    {/* admin can remove others; anyone can leave */}
                                    {(isAdmin && !isAdminMember) || (!isAdmin && isSelf) ? (
                                        <button
                                            onClick={() => handleRemoveMember(memberId)}
                                            className="ml-0.5 text-slate-500 hover:text-red-400 transition-colors"
                                            title={isSelf ? "Leave group" : "Remove member"}
                                        >
                                            <XIcon className="w-3 h-3" />
                                        </button>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                {isGroupMessagesLoading ? (
                    <p className="text-center text-slate-500 text-sm">Loading...</p>
                ) : groupMessages.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm">No messages yet. Say hello!</p>
                ) : (
                    groupMessages.map((msg) => {
                        const isMine = (msg.senderId?._id || msg.senderId) === authUser?._id;
                        const sender = msg.senderId;

                        // translate received text messages (not your own)
                        const displayText = (!isMine && msg.text && targetLang !== "default")
                            ? getTranslated(msg._id, msg.text, targetLang)
                            : msg.text;
                        const translatingNow = !isMine && isTranslating(msg._id, targetLang);

                        return (
                            <div key={msg._id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                                {!isMine && (
                                    <img
                                        src={sender?.profilePic || "/avatar.png"}
                                        className="w-7 h-7 rounded-full object-cover self-end shrink-0"
                                        alt=""
                                    />
                                )}
                                <div className={`max-w-xs lg:max-w-md flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                                    {!isMine && (
                                        <span className="text-xs text-cyan-400 mb-1 ml-1">{sender?.username}</span>
                                    )}
                                    <div className={`rounded-2xl px-3 py-2 ${isMine ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-200"}`}>
                                        {msg.image && (
                                            <img src={msg.image} className="rounded-lg h-48 object-cover mb-1" alt="" />
                                        )}
                                        {msg.audio && (
                                            <AudioMessagePlayer src={msg.audio} isMine={isMine} />
                                        )}
                                        {msg.text && (
                                            <p className={`text-sm ${translatingNow ? "opacity-50" : ""}`}>
                                                {displayText}
                                            </p>
                                        )}
                                        {/* original text hint when translated */}
                                        {!isMine && targetLang !== "default" && msg.text && displayText !== msg.text && (
                                            <p className="text-xs mt-1 opacity-50 italic">
                                                Original: {msg.text}
                                            </p>
                                        )}
                                        <p className="text-xs mt-1 opacity-60 text-right">{formatTime(msg.createdAt)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-700/50">
                {imagePreview && (
                    <div className="mb-3 relative inline-block">
                        <img src={imagePreview} className="w-20 h-20 object-cover rounded-lg border border-slate-700" alt="" />
                        <button
                            onClick={() => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 hover:bg-slate-700"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={`Message ${selectedGroup.name}...`}
                        className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg py-2 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                        className={`bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg px-3 py-2 transition-colors ${imagePreview ? "text-cyan-500" : ""}`}>
                        <ImageIcon className="w-5 h-5" />
                    </button>
                    <VoiceRecorder onSend={handleVoiceSend} onTranscribe={() => { }} />
                    <button type="submit" disabled={!text.trim() && !imagePreview}
                        className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg px-4 py-2 font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50">
                        <SendIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}

export default GroupChatContainer;
