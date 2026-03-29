import { Navigate, Route, Routes, useLocation } from "react-router";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ChatPage from "./pages/ChatPage";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";
import PageLoader from "./components/PageLoader";
import { Toaster } from "react-hot-toast";

function App() {
  const { checkAuth, isCheckingAuth, authUser } = useAuthStore();
  const { pathname } = useLocation();
  const isAuthPage = pathname === "/login" || pathname === "/signup";

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
          className={`relative z-10 w-full px-4 sm:px-6 ${isAuthPage ? "max-w-6xl" : "max-w-full"}`}
        >
          <div
            className={`bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden ${
              isAuthPage ? "p-2 sm:p-4" : "p-6"
            }`}
          >
            <Routes>
              <Route path="/" element={authUser ? <ChatPage /> : <Navigate to="/login" />} />
              <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
              <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
            </Routes>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  );
}

export default App;
