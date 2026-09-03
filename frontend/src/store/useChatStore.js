/*
 * CHANGED: useChatStore.js
 * Date: 2025
 * Changes:
 *  - Fixed broken optimistic update: set() call was accidentally on same line as comment
 *  - subscribeToMessages: added null guard for socket
 *  - subscribeToMessages: reads isSoundEnabled via get() instead of stale closure
 *  - Added caching support for chat partners
 *  - Added parallel loading capability
 */
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

// ── Cache Configuration ───────────────────────────────────────────────────────
const CACHE_KEY = "chatNova_chatPartners";
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

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: localStorage.getItem("isSoundEnabled") === "true",
  // unread DM counts: { [senderId]: count }
  unreadDM: {},
  // typing indicator: { [userId]: true } — users currently typing to me
  typingUsers: {},

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setSelectedUser: (selectedUser) => {
    // clear unread count for this user when opening the chat
    if (selectedUser) {
      set((s) => {
        const unreadDM = { ...s.unreadDM };
        delete unreadDM[selectedUser._id];
        return { selectedUser, unreadDM };
      });
    } else {
      set({ selectedUser });
    }
  },

  clearUnreadDM: (userId) => {
    set((s) => {
      const unreadDM = { ...s.unreadDM };
      delete unreadDM[userId];
      return { unreadDM };
    });
  },

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res.data });
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || "Could not load contacts";
      toast.error(msg);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMyChatPartners: async () => {
    const cachedData = getCachedData();

    // Load from cache immediately
    if (cachedData) {
      set({ chats: cachedData });
    }

    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chat");
      set({ chats: res.data });
      setCachedData(res.data);
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || "Could not load chats";
      if (!cachedData) {
        toast.error(msg);
      }
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessagesByUserId: async (userId) => {
    if (!userId) return;
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      if (error.response?.status === 404) {
        // The user no longer exists (deleted + re-registered with new _id).
        // Close the chat panel and remove the stale contact from the friends list.
        set({ selectedUser: null, messages: [] });
        // Lazily import to avoid circular dependency
        import("./useFriendStore").then(({ useFriendStore }) => {
          useFriendStore.getState().removeFriendById(userId);
        });
        toast.error("This contact no longer exists and has been removed.");
      } else {
        const msg = error?.response?.data?.message || error?.message || "Could not load messages";
        toast.error(msg);
      }
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    const authUser = useAuthStore.getState().authUser;

    if (!selectedUser) {
      toast.error("No recipient selected");
      return;
    }

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser?._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      audio: messageData.audio, // local blob URL for instant preview
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    // optimistic update
    set((state) => ({ messages: [...state.messages, optimisticMessage] }));

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      // replace optimistic message with server-provided message
      set((state) => ({
        messages: state.messages.map((m) => (m._id === tempId ? res.data : m)),
      }));

      // Invalidate cache when new message sent
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      // remove optimistic message on failure
      set((state) => ({ messages: state.messages.filter((m) => m._id !== tempId) }));
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      const senderId = newMessage.senderId;

      if (selectedUser && senderId === selectedUser._id) {
        // conversation is open — append message
        set((state) => ({ messages: [...state.messages, newMessage] }));
      } else {
        // conversation not open — increment unread count
        set((s) => ({
          unreadDM: {
            ...s.unreadDM,
            [senderId]: (s.unreadDM[senderId] || 0) + 1,
          },
        }));
      }

      // Invalidate cache when new message received
      localStorage.removeItem(CACHE_KEY);

      if (get().isSoundEnabled) {
        const notificationSound = new Audio("/sounds/notification.mp3");
        notificationSound.currentTime = 0;
        notificationSound.play().catch(() => { });
      }
    });
  },

  // Emit typing start/stop to the currently selected user
  emitTypingStart: () => {
    const socket = useAuthStore.getState().socket;
    const { selectedUser } = get();
    if (!socket || !selectedUser) return;
    socket.emit("dm_typing_start", selectedUser._id);
  },

  emitTypingStop: () => {
    const socket = useAuthStore.getState().socket;
    const { selectedUser } = get();
    if (!socket || !selectedUser) return;
    socket.emit("dm_typing_stop", selectedUser._id);
  },

  subscribeToTyping: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("dm_typing_start");
    socket.off("dm_typing_stop");

    socket.on("dm_typing_start", ({ senderId }) => {
      set((s) => ({ typingUsers: { ...s.typingUsers, [senderId]: true } }));
    });

    socket.on("dm_typing_stop", ({ senderId }) => {
      set((s) => {
        const typingUsers = { ...s.typingUsers };
        delete typingUsers[senderId];
        return { typingUsers };
      });
    });
  },

  unsubscribeFromTyping: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("dm_typing_start");
    socket.off("dm_typing_stop");
    // clear all typing state on cleanup
    set({ typingUsers: {} });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
  },

  clearCache: () => {
    localStorage.removeItem(CACHE_KEY);
  },
}));