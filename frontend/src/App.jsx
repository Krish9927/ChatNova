import { Navigate, Route, Routes, useLocation } from "react-router";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ChatPage from "./pages/ChatPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";
import PageLoader from "./components/PageLoader";
import { Toaster } from "react-hot-toast";

function App() {
  const { checkAuth, isCheckingAuth, authUser } = useAuthStore();
  const { pathname } = useLocation();
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/verify-email" || pathname === "/forgot-password";

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) {
    return <PageLoader />;
  }

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-white relative flex items-center justify-center overflow-x-hidden overflow-y-auto py-6">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />

        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-purple-600 opacity-20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-cyan-500 opacity-20 blur-[120px] rounded-full" />

        <div
          className={`relative z-10 w-full ${isAuthPage ? "max-w-6xl px-4 sm:px-6" : "max-w-full px-1 sm:px-2"}`}
        >
          <div
            className={`overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-xl ${isAuthPage ? "p-2 sm:p-4" : "p-0"
              }`}
          >
            <Routes>
              <Route path="/" element={authUser ? <ChatPage /> : <Navigate to="/login" />} />
              <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
              <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Routes>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  );
}

export default App;
