import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "../store/useAuthStore";
import OtpInput from "../components/OtpInput";
import { MailIcon, LockIcon, LoaderIcon, MessageCircleIcon, CheckCircleIcon } from "lucide-react";

// 3 steps: "email" → "otp" → "password"
function ForgotPasswordPage() {
    const [step, setStep] = useState("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [done, setDone] = useState(false);

    const { forgotPassword, verifyResetOtp, resetPassword, isSendingOtp, isVerifyingOtp } = useAuthStore();
    const navigate = useNavigate();

    // Step 1 — send OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        const ok = await forgotPassword(email);
        if (ok) setStep("otp");
    };

    // Step 2 — verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const ok = await verifyResetOtp(email, otp);
        if (ok) setStep("password");
    };

    // Step 3 — reset password
    const handleReset = async (e) => {
        e.preventDefault();
        if (password !== confirm) return;
        const ok = await resetPassword(email, otp, password);
        if (ok) setDone(true);
    };

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
                    <CheckCircleIcon className="w-14 h-14 text-green-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-200 mb-2">Password Reset!</h2>
                    <p className="text-slate-400 text-sm mb-6">You can now log in with your new password.</p>
                    <Link to="/login" className="auth-btn inline-block px-8 py-2">Go to Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 max-w-md w-full shadow-2xl">
                <div className="text-center mb-8">
                    <MessageCircleIcon className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                    <h2 className="text-2xl font-bold text-slate-200">
                        {step === "email" && "Forgot Password"}
                        {step === "otp" && "Enter OTP"}
                        {step === "password" && "New Password"}
                    </h2>
                    <p className="text-slate-400 mt-1 text-sm">
                        {step === "email" && "Enter your email to receive a reset OTP."}
                        {step === "otp" && `OTP sent to ${email.replace(/(.{2})(.*)(@.*)/, "$1***$3")}`}
                        {step === "password" && "Choose a new password."}
                    </p>
                </div>

                {/* Step 1 — Email */}
                {step === "email" && (
                    <form onSubmit={handleSendOtp} className="space-y-5">
                        <div>
                            <label className="auth-input-label">Email</label>
                            <div className="relative">
                                <MailIcon className="auth-input-icon" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input"
                                    placeholder="johndoe@gmail.com"
                                    required
                                />
                            </div>
                        </div>
                        <button className="auth-btn w-full" type="submit" disabled={isSendingOtp}>
                            {isSendingOtp ? <LoaderIcon className="w-5 h-5 animate-spin mx-auto" /> : "Send OTP"}
                        </button>
                        <div className="text-center">
                            <Link to="/login" className="auth-link text-sm">Back to Login</Link>
                        </div>
                    </form>
                )}

                {/* Step 2 — OTP */}
                {step === "otp" && (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <OtpInput value={otp} onChange={setOtp} />
                        <button className="auth-btn w-full" type="submit" disabled={otp.length < 6 || isVerifyingOtp}>
                            {isVerifyingOtp ? <LoaderIcon className="w-5 h-5 animate-spin mx-auto" /> : "Verify OTP"}
                        </button>
                        <div className="text-center text-sm text-slate-400">
                            Didn't receive it?{" "}
                            <button
                                type="button"
                                onClick={() => forgotPassword(email)}
                                disabled={isSendingOtp}
                                className="text-cyan-400 hover:underline disabled:opacity-50"
                            >
                                {isSendingOtp ? "Sending..." : "Resend OTP"}
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 3 — New Password */}
                {step === "password" && (
                    <form onSubmit={handleReset} className="space-y-5">
                        <div>
                            <label className="auth-input-label">New Password</label>
                            <div className="relative">
                                <LockIcon className="auth-input-icon" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input"
                                    placeholder="Min. 6 characters"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="auth-input-label">Confirm Password</label>
                            <div className="relative">
                                <LockIcon className="auth-input-icon" />
                                <input
                                    type="password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    className="input"
                                    placeholder="Repeat password"
                                    required
                                    minLength={6}
                                />
                            </div>
                            {confirm && password !== confirm && (
                                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                            )}
                        </div>
                        <button
                            className="auth-btn w-full"
                            type="submit"
                            disabled={isVerifyingOtp || password !== confirm}
                        >
                            {isVerifyingOtp ? <LoaderIcon className="w-5 h-5 animate-spin mx-auto" /> : "Reset Password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default ForgotPasswordPage;
