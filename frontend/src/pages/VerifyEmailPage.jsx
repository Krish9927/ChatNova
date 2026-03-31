import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "../store/useAuthStore";
import OtpInput from "../components/OtpInput";
import { MessageCircleIcon, LoaderIcon } from "lucide-react";

function VerifyEmailPage() {
    const { pendingEmail, verifyEmailOtp, resendVerifyOtp, isVerifyingOtp, isSendingOtp } = useAuthStore();
    const [otp, setOtp] = useState("");
    const navigate = useNavigate();

    // if no pending email, redirect to signup
    if (!pendingEmail) {
        navigate("/signup");
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (otp.length < 6) return;
        await verifyEmailOtp(pendingEmail, otp);
        // authUser will be set in store — App.jsx will redirect to /
    };

    const maskedEmail = pendingEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3");

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 max-w-md w-full shadow-2xl">
                <div className="text-center mb-8">
                    <MessageCircleIcon className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                    <h2 className="text-2xl font-bold text-slate-200">Verify your email</h2>
                    <p className="text-slate-400 mt-2 text-sm">
                        We sent a 6-digit OTP to <span className="text-cyan-400">{maskedEmail}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <OtpInput value={otp} onChange={setOtp} />

                    <button
                        type="submit"
                        disabled={otp.length < 6 || isVerifyingOtp}
                        className="auth-btn w-full"
                    >
                        {isVerifyingOtp
                            ? <LoaderIcon className="w-5 h-5 animate-spin mx-auto" />
                            : "Verify Email"
                        }
                    </button>
                </form>

                <div className="mt-5 text-center text-sm text-slate-400">
                    Didn't receive it?{" "}
                    <button
                        onClick={() => resendVerifyOtp(pendingEmail)}
                        disabled={isSendingOtp}
                        className="text-cyan-400 hover:underline disabled:opacity-50"
                    >
                        {isSendingOtp ? "Sending..." : "Resend OTP"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default VerifyEmailPage;
