import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useFriendStore = create((set, get) => ({
    friends: [],
    pendingRequests: [],   // incoming
    sentRequests: [],      // outgoing
    searchResults: [],
    isSearching: false,
    isLoading: false,

    // ── Fetch friends ─────────────────────────────────────────────────────
    fetchFriends: async () => {
        try {
            const res = await axiosInstance.get("/friends");
            set({ friends: res.data });
        } catch (err) {
            console.error("fetchFriends:", err.message);
        }
    },

    // ── Fetch pending incoming requests ───────────────────────────────────
    fetchPending: async () => {
        try {
            const res = await axiosInstance.get("/friends/pending");
            set({ pendingRequests: res.data });
        } catch (err) {
            console.error("fetchPending:", err.message);
        }
    },

    // ── Fetch sent requests ───────────────────────────────────────────────
    fetchSent: async () => {
        try {
            const res = await axiosInstance.get("/friends/sent");
            set({ sentRequests: res.data });
        } catch (err) {
            console.error("fetchSent:", err.message);
        }
    },

    // ── Search users ──────────────────────────────────────────────────────
    searchUsers: async (q) => {
        if (!q?.trim()) { set({ searchResults: [] }); return; }
        set({ isSearching: true });
        try {
            const res = await axiosInstance.get(`/friends/search?q=${encodeURIComponent(q)}`);
            set({ searchResults: res.data });
        } catch (err) {
            toast.error("Search failed");
        } finally {
            set({ isSearching: false });
        }
    },

    clearSearch: () => set({ searchResults: [] }),

    // ── Send friend request ───────────────────────────────────────────────
    sendRequest: async (receiverId) => {
        try {
            const res = await axiosInstance.post("/friends/request", { receiverId });
            set((s) => ({ sentRequests: [...s.sentRequests, res.data] }));
            toast.success("Friend request sent");
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not send request");
        }
    },

    // ── Accept request ────────────────────────────────────────────────────
    acceptRequest: async (requestId) => {
        try {
            const res = await axiosInstance.put(`/friends/request/${requestId}`, { action: "accept" });
            const newFriend = res.data.sender._id === useAuthStore.getState().authUser._id
                ? res.data.receiver
                : res.data.sender;
            set((s) => ({
                friends: [...s.friends, newFriend],
                pendingRequests: s.pendingRequests.filter((r) => r._id !== requestId),
            }));
            toast.success(`${newFriend.username} is now your contact`);
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not accept request");
        }
    },

    // ── Reject request ────────────────────────────────────────────────────
    rejectRequest: async (requestId) => {
        try {
            await axiosInstance.put(`/friends/request/${requestId}`, { action: "reject" });
            set((s) => ({
                pendingRequests: s.pendingRequests.filter((r) => r._id !== requestId),
            }));
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not reject request");
        }
    },

    // ── Socket subscriptions ──────────────────────────────────────────────
    subscribeToFriendEvents: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.off("friendRequest");
        socket.off("friendRequestAccepted");

        socket.on("friendRequest", (request) => {
            set((s) => ({ pendingRequests: [...s.pendingRequests, request] }));
            toast(`${request.sender.username} sent you a friend request`, { icon: "👋" });
        });

        socket.on("friendRequestAccepted", (request) => {
            const newFriend = request.receiver;
            set((s) => ({
                friends: [...s.friends, newFriend],
                sentRequests: s.sentRequests.filter((r) => r._id !== request._id),
            }));
            toast.success(`${newFriend.username} accepted your request`);
        });
    },

    unsubscribeFromFriendEvents: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;
        socket.off("friendRequest");
        socket.off("friendRequestAccepted");
    },
}));
