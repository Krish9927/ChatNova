import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  isVerifyingOtp: false,
  isSendingOtp: false,
  pendingEmail: null, // holds email between signup/forgot and OTP screen
  socket: null,
  onlineUsers: [],

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check-auth");
      set({ authUser: res.data });
      get().connectSocket();
    } catch {
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // Step 1 — register, get OTP email
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ pendingEmail: res.data.email });
      toast.success("OTP sent to your email!");
      return "verify"; // signal to navigate to OTP screen
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Could not create account");
    } finally {
      set({ isSigningUp: false });
    }
  },

  // Step 2 — verify email OTP → enter app
  verifyEmailOtp: async (email, otp) => {
    set({ isVerifyingOtp: true });
    try {
      const res = await axiosInstance.post("/auth/verify-email-otp", { email, otp });
      set({ authUser: res.data, pendingEmail: null });
      toast.success("Email verified! Welcome to ChatNova.");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Invalid OTP");
    } finally {
      set({ isVerifyingOtp: false });
    }
  },

  resendVerifyOtp: async (email) => {
    set({ isSendingOtp: true });
    try {
      await axiosInstance.post("/auth/resend-verify-otp", { email });
      toast.success("New OTP sent!");
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Could not resend OTP");
    } finally {
      set({ isSendingOtp: false });
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
      const errData = error.response?.data;
      // unverified user — redirect to OTP screen
      if (errData?.needsVerification) {
        set({ pendingEmail: errData.email });
        toast.error("Please verify your email first.");
        return "verify";
      }
      toast.error(errData?.message ?? "Could not sign in");
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
    } catch {
      toast.error("Error logging out");
    }
  },

  // Forgot password — Step 1: send OTP
  forgotPassword: async (email) => {
    set({ isSendingOtp: true });
    try {
      await axiosInstance.post("/auth/forgot-password", { email });
      set({ pendingEmail: email });
      toast.success("OTP sent to your email!");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Something went wrong");
    } finally {
      set({ isSendingOtp: false });
    }
  },

  // Forgot password — Step 2: verify OTP
  verifyResetOtp: async (email, otp) => {
    set({ isVerifyingOtp: true });
    try {
      await axiosInstance.post("/auth/verify-reset-otp", { email, otp });
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Invalid OTP");
      return false;
    } finally {
      set({ isVerifyingOtp: false });
    }
  },

  // Forgot password — Step 3: set new password
  resetPassword: async (email, otp, password) => {
    set({ isVerifyingOtp: true });
    try {
      await axiosInstance.post("/auth/reset-password", { email, otp, password });
      set({ pendingEmail: null });
      toast.success("Password reset! You can now log in.");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Could not reset password");
      return false;
    } finally {
      set({ isVerifyingOtp: false });
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message ?? "Could not update profile");
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;
    const base = axiosInstance.defaults.baseURL || "";
    const BASE_URL = base.replace(/\/api\/?$/, "") || window.location.origin;
    const socket = io(BASE_URL, { withCredentials: true, transports: ["websocket", "polling"] });
    set({ socket });
    socket.on("connect", () => console.log("Socket connected", socket.id));
    socket.on("getOnlineUsers", (userIds) => set({ onlineUsers: userIds }));
    socket.on("connect_error", (err) => console.warn("Socket connect_error:", err.message));
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (!socket) return;
    socket.removeAllListeners();
    socket.disconnect();
    set({ socket: null, onlineUsers: [] });
  },
}));
