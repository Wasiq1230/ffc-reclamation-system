"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  UserPlus,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  // Universal Identifier (Email, Phone Number, or Username)
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError("Please enter your registered email address or phone number.");
      setLoading(false);
      return;
    }

    try {
      await api.login(cleanIdentifier, password);
      router.push("/");
    } catch (err: any) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : err?.detail || err?.message || "Invalid credentials. Please verify your details.";
      setError(typeof msg === "object" ? JSON.stringify(msg) : String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-slate-900 selection:text-white">
      <div className="w-full max-w-md">
        {/* Plant / Enterprise Brand Header */}
        <div className="text-center mb-6">
          <img
            src="/ffc-logo.png"
            alt="FFC Official Logo"
            className="h-12 w-auto object-contain mx-auto mb-3"
          />
          <h1 className="text-base font-semibold text-slate-900 tracking-tight">
            FAUJI FERTILIZER COMPANY LTD.
          </h1>
          <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-widest mt-0.5">
            Fabrication Shop · Goth Machhi
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Reclamation Management System
          </p>
        </div>

        {/* Universal Login Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-7 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-900">
              Sign In to Your Account
            </span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              SECURE SESSION
            </span>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2.5 text-rose-900 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Single Universal Identifier Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Email Address or Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  autoComplete="username"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Sign in with your registered email, mobile phone, or username.
              </p>
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-3.5 h-3.5"
                />
                Remember this workstation
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !identifier.trim() || !password}
              className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer active:scale-98"
            >
              {loading ? (
                <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Sign In
                  <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  await api.login("admin", "Admin@FFC2026!");
                  router.push("/");
                } catch (err: any) {
                  setError("Unable to quick sign in. Please verify connection.");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-md text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Quick Sign In (Admin / Shop Floor)
            </button>
          </form>

          {/* Registration Link */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Don't have an account?</span>
            <Link
              href="/register"
              className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </Link>
          </div>
        </div>

        {/* Quality Standard Footnote */}
        <div className="mt-6 text-center text-[11px] text-slate-400 space-y-1">
          <p>Reclamation Management System · Quality Standard QF-003-05-307</p>
          <p className="font-mono text-[10px] text-slate-400">
            FFC Goth Machhi · Sadiqabad · Rahim Yar Khan
          </p>
          <p className="text-[10px] text-slate-400/90 font-medium tracking-wide pt-1 select-none">
            © Muhammad Wasiq Hussain
          </p>
        </div>
      </div>

      {/* Clean Minimalist Corner Copyright */}
      <div className="fixed bottom-2.5 right-3.5 z-20 pointer-events-none select-none text-[10.5px] text-slate-400/80 font-medium tracking-wide flex items-center gap-1">
        <span>©</span>
        <span>Muhammad Wasiq Hussain</span>
      </div>
    </div>
  );
}
