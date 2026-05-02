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

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) {
    return <PageLoader />;
  }

  return (
    <>
      <Routes>
        {/* Chat — protected, full viewport */}
        <Route
          path="/"
          element={
            authUser ? (
              <div className="fixed inset-0 overflow-hidden">
                <ChatPage />
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Auth pages — redirect to / if already logged in */}
        <Route
          path="/login"
          element={authUser ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/signup"
          element={authUser ? <Navigate to="/" replace /> : <SignUpPage />}
        />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
