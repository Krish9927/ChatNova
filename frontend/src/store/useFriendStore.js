import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

// ── Cache Configuration ───────────────────────────────────────────────────────
const CACHE_KEY = "chatNova_friendData";
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

export const useFriendStore = create((set, get) => ({
    friends: [],
    pendingRequests: [],   // incoming
    sentRequests: [],      // outgoing
    searchResults: [],
    isSearching: false,
    isLoading: false,

    // ── Solution 1: Use Dashboard Endpoint (Single API Call) ─────────────────
    /**
     * Fetches all friend-related data in a single optimized request.
     * This is the RECOMMENDED approach for production.
     */
    fetchDashboard: async () => {
        const cachedData = getCachedData();

        // Load from cache immediately for instant UI
        if (cachedData) {
            set({
                friends: cachedData.friends || [],
                pendingRequests: cachedData.pending || [],
                sentRequests: cachedData.sent || [],
            });
        }

        // Then fetch fresh data in the background
        try {
            const res = await axiosInstance.get("/dashboard");
            const { friends, pending, sent } = res.data;

            set({
                friends,
                pendingRequests: pending,
                sentRequests: sent,
            });

            // Update cache for next time
            setCachedData({ friends, pending, sent });
        } catch (err) {
            console.error("fetchDashboard error:", err);
            // If dashboard endpoint fails, fall back to parallel calls
            if (err.response?.status === 404) {
                console.log("Dashboard endpoint not found, falling back to parallel calls");
                return get().fetchAllParallel();
            }
            // If we have cached data, continue using it
            if (!cachedData) {
                toast.error("Failed to load data");
            }
        }
    },

    // ── Solution 2: Parallel Calls (Backward Compatible) ─────────────────────
    /**
     * Fetches all data using parallel API calls.
     * Use this if you need to maintain backward compatibility with existing endpoints.
     */
    fetchAllParallel: async () => {
        const cachedData = getCachedData();

        // Load from cache immediately
        if (cachedData) {
            set({
                friends: cachedData.friends || [],
                pendingRequests: cachedData.pending || [],
                sentRequests: cachedData.sent || [],
            });
        }

        set({ isLoading: true });

        try {
            // Execute all requests in parallel
            const [friendsRes, pendingRes, sentRes] = await Promise.all([
                axiosInstance.get("/friends"),
                axiosInstance.get("/friends/pending"),
                axiosInstance.get("/friends/sent"),
            ]);

            const data = {
                friends: friendsRes.data,
                pendingRequests: pendingRes.data,
                sentRequests: sentRes.data,
            };

            set(data);
            setCachedData({
                friends: data.friends,
                pending: data.pendingRequests,
                sent: data.sentRequests,
            });
        } catch (err) {
            console.error("fetchAllParallel error:", err);
            if (!cachedData) {
                toast.error("Failed to load data");
            }
        } finally {
            set({ isLoading: false });
        }
    },

    // ── Legacy Individual Fetch Methods (Keep for backward compatibility) ────

    fetchFriends: async () => {
        try {
            const res = await axiosInstance.get("/friends");
            set({ friends: res.data });
        } catch (err) {
            console.error("fetchFriends:", err.message);
        }
    },

    fetchPending: async () => {
        try {
            const res = await axiosInstance.get("/friends/pending");
            set({ pendingRequests: res.data });
        } catch (err) {
            console.error("fetchPending:", err.message);
        }
    },

    fetchSent: async () => {
        try {
            const res = await axiosInstance.get("/friends/sent");
            set({ sentRequests: res.data });
        } catch (err) {
            console.error("fetchSent:", err.message);
        }
    },

    // ── Search users ──────────────────────────────────────────────────────────
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

    // ── Remove a friend from local state by their _id ─────────────────────────
    // Called when getMessagesByUserId returns 404 (user was deleted + re-created).
    removeFriendById: (userId) => {
        set((s) => ({
            friends: s.friends.filter((f) => f._id?.toString() !== userId?.toString()),
        }));
        localStorage.removeItem(CACHE_KEY);
    },

    // ── Send friend request ───────────────────────────────────────────────────
    sendRequest: async (receiverId) => {
        try {
            const res = await axiosInstance.post("/friends/request", { receiverId });
            set((s) => ({ sentRequests: [...s.sentRequests, res.data] }));
            toast.success("Friend request sent");

            // Invalidate cache
            localStorage.removeItem(CACHE_KEY);
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not send request");
        }
    },

    // ── Accept request ────────────────────────────────────────────────────────
    acceptRequest: async (requestId) => {
        try {
            const res = await axiosInstance.put(`/friends/request/${requestId}`, { action: "accept" });
            const myId = useAuthStore.getState().authUser._id;
            const newFriend = res.data.sender._id.toString() === myId.toString()
                ? res.data.receiver
                : res.data.sender;
            set((s) => ({
                friends: [...s.friends, newFriend],
                pendingRequests: s.pendingRequests.filter((r) => r._id.toString() !== requestId.toString()),
            }));
            toast.success(`${newFriend.username} is now your contact`);

            // Invalidate cache
            localStorage.removeItem(CACHE_KEY);
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not accept request");
        }
    },

    // ── Reject request ────────────────────────────────────────────────────────
    rejectRequest: async (requestId) => {
        try {
            await axiosInstance.put(`/friends/request/${requestId}`, { action: "reject" });
            set((s) => ({
                pendingRequests: s.pendingRequests.filter((r) => r._id.toString() !== requestId.toString()),
            }));

            // Invalidate cache
            localStorage.removeItem(CACHE_KEY);
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not reject request");
        }
    },

    // ── Clear Cache ───────────────────────────────────────────────────────────
    clearCache: () => {
        localStorage.removeItem(CACHE_KEY);
    },

    // ── Socket subscriptions ──────────────────────────────────────────────────
    subscribeToFriendEvents: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;

        socket.off("friendRequest");
        socket.off("friendRequestAccepted");
        socket.off("friendRequestRejected");

        socket.on("friendRequest", (request) => {
            set((s) => ({ pendingRequests: [...s.pendingRequests, request] }));
            toast(`${request.sender.username} sent you a friend request`, { icon: "👋" });
            localStorage.removeItem(CACHE_KEY);
        });

        socket.on("friendRequestAccepted", (request) => {
            const newFriend = request.receiver;
            set((s) => ({
                friends: [...s.friends, newFriend],
                sentRequests: s.sentRequests.filter(
                    (r) => r._id.toString() !== request._id.toString()
                ),
            }));
            toast.success(`${newFriend.username} accepted your request`);
            localStorage.removeItem(CACHE_KEY);
        });

        socket.on("friendRequestRejected", ({ requestId }) => {
            set((s) => ({
                sentRequests: s.sentRequests.filter(
                    (r) => r._id.toString() !== requestId.toString()
                ),
            }));
            localStorage.removeItem(CACHE_KEY);
        });
    },

    unsubscribeFromFriendEvents: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;
        socket.off("friendRequest");
        socket.off("friendRequestAccepted");
        socket.off("friendRequestRejected");
    },
}));
