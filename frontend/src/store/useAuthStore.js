import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  socket: null,
  onlineUsers: [],
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check-auth");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in authCheck:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });

      toast.success("Account created successfully!");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Could not create account");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });

      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Could not sign in");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error("Error logging out");
      console.log("Logout error:", error);
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      toast.error(error.response?.data?.message ?? "Could not update profile");
    }
  },
  connectSocket: () => {
    const { authUser } = get();
    if (!authUser) return;

    // avoid reconnecting if already connected
    if (get().socket?.connected) return;

    // derive backend origin from axios baseURL (remove /api)
    const base = axiosInstance.defaults.baseURL || "";
    const BASE_URL = base.replace(/\/api\/?$/, "") || window.location.origin;

    const socket = io(BASE_URL, {
      withCredentials: true,
      // prefer websocket to avoid long polling issues
      transports: ["websocket", "polling"],
    });

    // set socket immediately so other parts can access it
    set({ socket });

    socket.on("connect", () => {
      console.log("Socket connected", socket.id);
    });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connect_error:", err.message || err);
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (!socket) return;
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch (e) {
      console.warn("Error disconnecting socket", e);
    }
    set({ socket: null, onlineUsers: [] });
  },
}));