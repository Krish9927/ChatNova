import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development" ? "http://localhost:3000/api" : "/api",
  withCredentials: true,
});

// Auto-logout when the server rejects our token (e.g. session invalidated by a new login elsewhere)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Lazily import to avoid circular dependency (store imports axios, axios imports store)
      import("../store/useAuthStore").then(({ useAuthStore }) => {
        const { authUser, disconnectSocket } = useAuthStore.getState();
        if (authUser) {
          // clear state without hitting the server — our token is already invalid
          disconnectSocket();
          useAuthStore.setState({ authUser: null });
          import("react-hot-toast").then(({ default: toast }) => {
            toast.error("Your session has expired. Please log in again.");
          });
        }
      });
    }
    return Promise.reject(error);
  }
);
