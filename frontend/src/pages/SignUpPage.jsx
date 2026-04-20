import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Mail, Lock, User, Loader2, MessageCircle, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router";

function SignUpPage() {
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const { signup, isSigningUp } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await signup(formData);
    if (result === "verify") navigate("/verify-email");
  };

  return (
    <div className="min-h-screen flex bg-[#0d1117]">
      {/* ── Left panel — form ─────────────────────────────────────────── */}
      <div className="flex flex-col justify-center w-full max-w-md px-10 py-12 mx-auto lg:mx-0">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">ChatNova</span>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create account</h1>
          <p className="text-slate-400 text-sm">Join ChatNova and start connecting</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="John Doe"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-cyan-500/60 focus:bg-white/8 transition-all"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-cyan-500/60 focus:bg-white/8 transition-all"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min. 6 characters"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-cyan-500/60 focus:bg-white/8 transition-all"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSigningUp}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm mt-2"
          >
            {isSigningUp ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
            ) : "Create Account"}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      {/* ── Right panel — illustration (desktop only) ─────────────────── */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-[#111827] relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 text-center px-12 max-w-lg">
          <img
            src="/signup.png"
            alt="ChatNova"
            className="w-full max-w-sm mx-auto mb-8 drop-shadow-2xl"
          />
          <h2 className="text-2xl font-bold text-white mb-3">
            Your conversations, your way
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Send messages, share images, record voice notes, and chat in any language with built-in translation.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            {["Groups", "Voice Messages", "Translation"].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;
