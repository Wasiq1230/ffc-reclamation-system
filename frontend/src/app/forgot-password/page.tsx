"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  KeyRound,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Steps: 1 = Request Reset, 2 = Enter Token / OTP & New Password
  const [step, setStep] = useState<1 | 2>(1);
  const [identifier, setIdentifier] = useState("");
  const [tokenOrOtp, setTokenOrOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password complexity checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid =
    hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  // Step 1: Request reset
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please provide your username, official email, or phone number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.forgotPassword(identifier.trim());
      setSuccessMsg(
        res.message ||
          "If an account with that identifier exists, a reset code has been dispatched."
      );
      setStep(2);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : typeof err === "string" ? err : err?.detail || err?.message || "Failed to process password recovery request.";
      setError(typeof msg === "object" ? JSON.stringify(msg) : String(msg));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenOrOtp.trim()) {
      setError("Please enter the OTP verification code or reset token.");
      return;
    }

    if (!isPasswordValid) {
      setError("Please ensure your new password satisfies all complexity standards.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Password and confirmation password do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.resetPassword({
        identifier: identifier.trim(),
        token_or_otp: tokenOrOtp.trim(),
        new_password: newPassword,
      });

      setSuccessMsg(res.message || "Password has been reset successfully.");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Invalid or expired reset token/OTP code.");
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
            Access Recovery & Identity Verification
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-7 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              Password Recovery
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              STEP {step} OF 2
            </span>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2.5 text-rose-900 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2.5 text-emerald-900 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your registered email address or mobile phone number. A single-use verification code will be generated.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Email Address or Mobile Phone
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
                    autoComplete="off"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !identifier.trim()}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
              >
                {loading ? (
                  <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    Request Verification Code
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Account Identifier
                </label>
                <input
                  type="text"
                  disabled
                  value={identifier}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-600 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  6-Digit OTP Code / Reset Token *
                </label>
                <input
                  type="text"
                  required
                  value={tokenOrOtp}
                  onChange={(e) => setTokenOrOtp(e.target.value)}
                  autoComplete="off"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Password Checklist */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] space-y-1">
                <div className="grid grid-cols-2 gap-1 text-slate-600 font-mono text-[10px]">
                  <span
                    className={
                      hasMinLength ? "text-emerald-700 font-bold" : "text-slate-400"
                    }
                  >
                    {hasMinLength ? "✓" : "○"} Min 8 chars
                  </span>
                  <span
                    className={
                      hasUpper ? "text-emerald-700 font-bold" : "text-slate-400"
                    }
                  >
                    {hasUpper ? "✓" : "○"} Uppercase
                  </span>
                  <span
                    className={
                      hasLower ? "text-emerald-700 font-bold" : "text-slate-400"
                    }
                  >
                    {hasLower ? "✓" : "○"} Lowercase
                  </span>
                  <span
                    className={
                      hasNumber ? "text-emerald-700 font-bold" : "text-slate-400"
                    }
                  >
                    {hasNumber ? "✓" : "○"} Number
                  </span>
                  <span
                    className={
                      hasSpecial ? "text-emerald-700 font-bold" : "text-slate-400"
                    }
                  >
                    {hasSpecial ? "✓" : "○"} Symbol
                  </span>
                  <span
                    className={
                      passwordsMatch
                        ? "text-emerald-700 font-bold"
                        : "text-slate-400"
                    }
                  >
                    {passwordsMatch ? "✓" : "○"} Match
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-xs flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !isPasswordValid || !passwordsMatch}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
                >
                  {loading ? "Updating Password..." : "Update Password & Login"}
                </button>
              </div>
            </form>
          )}

          {/* Navigation links */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              href="/login"
              className="text-slate-500 hover:text-slate-800 hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Login
            </Link>
            <Link
              href="/register"
              className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Register New Account
            </Link>
          </div>
        </div>

        {/* Quality Standard Footnote */}
        <div className="mt-6 text-center text-[11px] text-slate-400 space-y-1">
          <p>Standard Quality Specification QF-003-05-307 (Annexure-III)</p>
          <p className="font-mono text-[10px] text-slate-400">
            FFC Goth Machhi · Sadiqabad · Rahim Yar Khan
          </p>
        </div>
      </div>
    </div>
  );
}
