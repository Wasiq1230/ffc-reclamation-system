"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  User,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  UserPlus,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("+92");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Flow states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // OTP Verification state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState(false);

  // Password complexity checks
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordValid =
    hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  // Safe error extraction helper preventing [object Object]
  const extractErrorMessage = (err: any): string => {
    if (!err) return "Registration failed. Please try again.";
    if (typeof err === "string") return err;
    if (err instanceof Error && err.message && err.message !== "[object Object]") {
      return err.message;
    }
    if (typeof err.detail === "string") return err.detail;
    if (Array.isArray(err.detail)) {
      return err.detail
        .map((d: any) => (d.msg ? `${d.loc ? d.loc.slice(-1)[0] + ": " : ""}${d.msg}` : JSON.stringify(d)))
        .join("; ");
    }
    if (typeof err.message === "string" && err.message !== "[object Object]") {
      return err.message;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return "An unexpected error occurred during registration.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhoneDigits = phoneLocal.replace(/\D/g, "");

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setError("Please enter a valid email address (e.g. you@example.com).");
      return;
    }

    if (!cleanPhoneDigits || cleanPhoneDigits.length < 7) {
      setError("Please enter a valid mobile phone number.");
      return;
    }

    if (!isPasswordValid) {
      setError("Please ensure your password satisfies all security criteria.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirmation password do not match.");
      return;
    }

    if (!agreedToTerms) {
      setError("Please review and agree to the platform Terms of Use.");
      return;
    }

    setLoading(true);

    try {
      const localWithoutLeadingZero = cleanPhoneDigits.startsWith("0")
        ? cleanPhoneDigits.substring(1)
        : cleanPhoneDigits;
      const fullPhone = `${phoneCountry}${localWithoutLeadingZero}`;

      const res = await api.register({
        full_name: cleanName,
        email: cleanEmail,
        phone_number: fullPhone,
        password: password,
        confirm_password: confirmPassword,
        terms_accepted: true,
      });

      setSuccessResult(res);

      if (res.phone_number) {
        setShowOtpModal(true);
      }
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError(null);

    try {
      const fullPhone = successResult?.phone_number;
      await api.verifyPhoneOtp({
        phone_number: fullPhone,
        otp_code: otpCode.trim(),
      });
      setOtpSuccess(true);
    } catch (err: any) {
      setOtpError(extractErrorMessage(err));
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-slate-900 selection:text-white">
      <div className="w-full max-w-lg my-8">
        {/* Neutral Universal Brand Header */}
        <div className="text-center mb-6">
          <img
            src="/ffc-logo.png"
            alt="Reclamation Management System"
            className="h-12 w-auto object-contain mx-auto mb-3"
          />
          <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Register using your email address and mobile number.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 md:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              General User Registration
            </span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
              SECURE SIGN UP
            </span>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2.5 text-rose-900 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {successResult && !showOtpModal ? (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                Account Created Successfully
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Welcome, <strong>{successResult.full_name}</strong>! Your account has been registered and is active. You may now proceed directly to sign in with your email or phone number.
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium"
                >
                  Proceed to Sign In
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Email Address (Any domain: Gmail, Outlook, Yahoo, Custom) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    autoComplete="email"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Accepts any valid personal or organizational email address (Gmail, Outlook, Yahoo, etc.).
                </p>
              </div>

              {/* Mobile Phone Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Mobile Phone Number *
                </label>
                <div className="flex gap-2">
                  <div className="w-24 shrink-0">
                    <select
                      value={phoneCountry}
                      onChange={(e) => setPhoneCountry(e.target.value)}
                      className="w-full py-2 px-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="+92">🇵🇰 +92</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+966">🇸🇦 +966</option>
                    </select>
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phoneLocal}
                      onChange={(e) => setPhoneLocal(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                      placeholder="300 1234567"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Used for account recovery and multi-factor verification.
                </p>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
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
                    Confirm Password *
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
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Password Complexity Checklist */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] space-y-1.5">
                <span className="font-semibold text-slate-700 block">
                  Password Security Policy:
                </span>
                <div className="grid grid-cols-2 gap-1 text-slate-600 font-mono text-[10px]">
                  <span className={hasMinLength ? "text-emerald-700 font-bold" : "text-slate-400"}>
                    {hasMinLength ? "✓" : "○"} Min 8 characters
                  </span>
                  <span className={hasUpper ? "text-emerald-700 font-bold" : "text-slate-400"}>
                    {hasUpper ? "✓" : "○"} Uppercase letter (A-Z)
                  </span>
                  <span className={hasLower ? "text-emerald-700 font-bold" : "text-slate-400"}>
                    {hasLower ? "✓" : "○"} Lowercase letter (a-z)
                  </span>
                  <span className={hasNumber ? "text-emerald-700 font-bold" : "text-slate-400"}>
                    {hasNumber ? "✓" : "○"} Numeric digit (0-9)
                  </span>
                  <span className={hasSpecial ? "text-emerald-700 font-bold" : "text-slate-400"}>
                    {hasSpecial ? "✓" : "○"} Special symbol (!@#$%...)
                  </span>
                  <span className={passwordsMatch ? "text-emerald-700 font-bold" : "text-slate-400"}>
                    {passwordsMatch ? "✓" : "○"} Passwords match
                  </span>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>
                    I agree to the platform Terms of Service and Privacy Policy.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !isPasswordValid || !passwordsMatch || !agreedToTerms}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {loading ? (
                  <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Create Account
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Return to Login */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Already have an account?</span>
            <Link
              href="/login"
              className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* OTP Verification Modal */}
        {showOtpModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                Verify Mobile Phone Number
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                A 6-digit one-time verification passcode (OTP) has been generated for{" "}
                <strong className="font-mono text-slate-900">
                  {successResult?.phone_number}
                </strong>
                .
              </p>

              {otpError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              {otpSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Mobile Number Verified!
                  </div>
                  <p>
                    Your contact number has been verified. You can now sign in to your account.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
                  >
                    Go to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full text-center text-lg font-mono tracking-widest py-2 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={otpLoading || otpCode.length !== 6}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium disabled:opacity-50 cursor-pointer"
                    >
                      {otpLoading ? "Verifying..." : "Verify Code"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOtpModal(false);
                      }}
                      className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-xs cursor-pointer"
                    >
                      Verify Later
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
