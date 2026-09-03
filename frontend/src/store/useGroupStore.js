import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

// ── Cache Configuration ───────────────────────────────────────────────────────
const CACHE_KEY = "chatNova_groups";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ── Cache Helpers ─────────────────────────────────────────────────────────────
const getCachedData = () => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;

        if (isExpired) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        return data;
    } catch (err) {
        console.error("Cache read error:", err);
        return null;
    }
};

const setCachedData = (data) => {
    try {
        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data, timestamp: Date.now() })
        );
    } catch (err) {
        console.error("Cache write error:", err);
    }
};

export const useGroupStore = create((set, get) => ({
    groups: [],
    selectedGroup: null,
    groupMessages: [],
    isGroupsLoading: false,
    isGroupMessagesLoading: false,
    // unread group counts: { [groupId]: count }
    unreadGroup: {},

    setSelectedGroup: (group) => {
        if (group) {
            set((s) => {
                const unreadGroup = { ...s.unreadGroup };
                delete unreadGroup[group._id];
                return { selectedGroup: group, groupMessages: [], unreadGroup };
            });
        } else {
            set({ selectedGroup: group, groupMessages: [] });
        }
    },

    clearUnreadGroup: (groupId) => {
        set((s) => {
            const unreadGroup = { ...s.unreadGroup };
            delete unreadGroup[groupId];
            return { unreadGroup };
        });
    },

    // ── Fetch all my groups ───────────────────────────────────────────────────
    fetchGroups: async () => {
        const cachedData = getCachedData();

        // Load from cache immediately
        if (cachedData) {
            set({ groups: cachedData });
        }

        set({ isGroupsLoading: true });
        try {
            const res = await axiosInstance.get("/groups");
            set({ groups: res.data });
            setCachedData(res.data);
        } catch (err) {
            if (!cachedData) {
                toast.error(err.response?.data?.message || "Could not load groups");
            }
        } finally {
            set({ isGroupsLoading: false });
        }
    },

    // ── Create group ──────────────────────────────────────────────────────────
    createGroup: async ({ name, description, memberIds }) => {
        try {
            const res = await axiosInstance.post("/groups", { name, description, memberIds });
            set((s) => ({ groups: [res.data, ...s.groups] }));
            toast.success(`Group "${res.data.name}" created`);

            // Invalidate cache
            localStorage.removeItem(CACHE_KEY);
            return res.data;
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not create group");
        }
    },

    // ── Update group ──────────────────────────────────────────────────────────
    updateGroup: async (groupId, data) => {
        try {
            const res = await axiosInstance.put(`/groups/${groupId}`, data);
            set((s) => ({
                groups: s.groups.map((g) => g._id === groupId ? res.data : g),
                selectedGroup: s.selectedGroup?._id === groupId ? res.data : s.selectedGroup,
            }));
            toast.success("Group updated");
            localStorage.removeItem(CACHE_KEY);
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not update group");
        }
    },

    // ── Add members ───────────────────────────────────────────────────────────
    addMembers: async (groupId, memberIds) => {
        try {
            const res = await axiosInstance.post(`/groups/${groupId}/members`, { memberIds });
            set((s) => ({
                groups: s.groups.map((g) => g._id === groupId ? res.data : g),
                selectedGroup: s.selectedGroup?._id === groupId ? res.data : s.selectedGroup,
            }));
            toast.success("Members added");
            localStorage.removeItem(CACHE_KEY);
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not add members");
        }
    },

    // ── Remove member / leave ─────────────────────────────────────────────────
    removeMember: async (groupId, memberId) => {
        try {
            const res = await axiosInstance.delete(`/groups/${groupId}/members`, {
                data: { memberId },
            });
            set((s) => ({
                groups: s.groups.map((g) => g._id === groupId ? res.data : g),
                selectedGroup: s.selectedGroup?._id === groupId ? res.data : s.selectedGroup,
            }));
            localStorage.removeItem(CACHE_KEY);
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not remove member");
        }
    },

    // ── Delete group ──────────────────────────────────────────────────────────
    deleteGroup: async (groupId) => {
        try {
            await axiosInstance.delete(`/groups/${groupId}`);
            set((s) => ({
                groups: s.groups.filter((g) => g._id !== groupId),
                selectedGroup: s.selectedGroup?._id === groupId ? null : s.selectedGroup,
            }));
            toast.success("Group deleted");
            localStorage.removeItem(CACHE_KEY);
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not delete group");
        }
    },

    // ── Fetch group messages ──────────────────────────────────────────────────
    fetchGroupMessages: async (groupId) => {
        set({ isGroupMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/groups/${groupId}/messages`);
            set({ groupMessages: res.data });
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not load messages");
        } finally {
            set({ isGroupMessagesLoading: false });
        }
    },

    // ── Send group text/image message ─────────────────────────────────────────
    sendGroupMessage: async (groupId, messageData) => {
        const authUser = useAuthStore.getState().authUser;
        const tempId = `temp-${Date.now()}`;

        const optimistic = {
            _id: tempId,
            senderId: { _id: authUser._id, username: authUser.username, profilePic: authUser.profilePic },
            groupId,
            text: messageData.text,
            image: messageData.image,
            createdAt: new Date().toISOString(),
            isOptimistic: true,
        };
        set((s) => ({ groupMessages: [...s.groupMessages, optimistic] }));

        try {
            const res = await axiosInstance.post(`/groups/${groupId}/messages`, messageData);
            set((s) => ({
                groupMessages: s.groupMessages.map((m) => m._id === tempId ? res.data : m),
            }));
        } catch (err) {
            set((s) => ({ groupMessages: s.groupMessages.filter((m) => m._id !== tempId) }));
            toast.error(err.response?.data?.message || "Could not send message");
        }
    },

    // ── Send group audio message ──────────────────────────────────────────────
    sendGroupAudioMessage: async (groupId, audioBlob) => {
        const formData = new FormData();
        formData.append("audio", audioBlob, "voice-message.webm");
        try {
            const res = await axiosInstance.post(
                `/groups/${groupId}/messages/audio`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            set((s) => ({ groupMessages: [...s.groupMessages, res.data] }));
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not send voice message");
        }
    },

    // ── Socket subscriptions ──────────────────────────────────────────────────
    subscribeToGroupEvents: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        // remove existing listeners first to prevent double-registration
        socket.off("newGroupMessage");
        socket.off("groupCreated");
        socket.off("groupUpdated");
        socket.off("groupDeleted");
        socket.off("removedFromGroup");

        socket.on("newGroupMessage", (msg) => {
            const { selectedGroup } = get();
            const groupMessages = get().groupMessages;

            const alreadyExists = groupMessages.some((m) => m._id === msg._id);
            if (alreadyExists) return;

            const msgGroupId = msg.groupId?._id || msg.groupId;

            if (selectedGroup?._id === msgGroupId) {
                // group is open — append message
                set((s) => ({ groupMessages: [...s.groupMessages, msg] }));
            } else {
                // group not open — increment unread count
                set((s) => ({
                    unreadGroup: {
                        ...s.unreadGroup,
                        [msgGroupId]: (s.unreadGroup[msgGroupId] || 0) + 1,
                    },
                }));
            }

            // sound only for received messages
            const authUser = useAuthStore.getState().authUser;
            const senderId = msg.senderId?._id || msg.senderId;
            if (senderId?.toString() === authUser?._id?.toString()) return;

            if (useAuthStore.getState().isSoundEnabled) {
                new Audio("/sounds/notification.mp3").play().catch(() => { });
            }
        });

        socket.on("groupCreated", (group) => {
            set((s) => {
                // avoid duplicate if already in list (creator gets it via REST too)
                if (s.groups.some((g) => g._id === group._id)) return {};
                return { groups: [group, ...s.groups] };
            });
            localStorage.removeItem(CACHE_KEY);
            const authUser = useAuthStore.getState().authUser;
            if (group.admin._id !== authUser?._id) {
                toast(`Added to group: ${group.name}`, { icon: "👥" });
            }
        });

        socket.on("groupUpdated", (group) => {
            set((s) => ({
                groups: s.groups.map((g) => g._id === group._id ? group : g),
                selectedGroup: s.selectedGroup?._id === group._id ? group : s.selectedGroup,
            }));
            localStorage.removeItem(CACHE_KEY);
        });

        socket.on("groupDeleted", ({ groupId }) => {
            set((s) => ({
                groups: s.groups.filter((g) => g._id !== groupId),
                selectedGroup: s.selectedGroup?._id === groupId ? null : s.selectedGroup,
            }));
            localStorage.removeItem(CACHE_KEY);
            toast("A group was deleted", { icon: "🗑️" });
        });

        socket.on("removedFromGroup", ({ groupId }) => {
            set((s) => ({
                groups: s.groups.filter((g) => g._id !== groupId),
                selectedGroup: s.selectedGroup?._id === groupId ? null : s.selectedGroup,
            }));
            localStorage.removeItem(CACHE_KEY);
            toast("You were removed from a group", { icon: "👋" });
        });
    },

    unsubscribeFromGroupEvents: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;
        socket.off("newGroupMessage");
        socket.off("groupCreated");
        socket.off("groupUpdated");
        socket.off("groupDeleted");
        socket.off("removedFromGroup");
    },

    clearCache: () => {
        localStorage.removeItem(CACHE_KEY);
    },
}));
