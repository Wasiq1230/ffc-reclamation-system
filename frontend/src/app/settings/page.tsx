"use client";

import { useEffect, useState } from "react";
import { api, getStoredUser } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import {
  Settings,
  Save,
  ShieldAlert,
  Award,
  FileCode,
  CheckCircle2,
  AlertCircle,
  User,
  KeyRound,
  Lock,
  Phone,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Clock,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"account" | "system">("account");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // System settings state
  const [settings, setSettings] = useState<any>(null);
  const [vrPrefix, setVrPrefix] = useState("VR");
  const [certPrefix, setCertPrefix] = useState("CERT");
  const [finEnabled, setFinEnabled] = useState(true);
  const [savingSystem, setSavingSystem] = useState(false);

  // Account & Profile state
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Global feedback banner
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load current user and system settings
  useEffect(() => {
    async function load() {
      try {
        const u = getStoredUser();
        setCurrentUser(u);
        if (u) {
          setFullName(u.full_name || "");
          setPhoneNumber(u.phone_number || "");
        }

        // Try to fetch latest profile from backend
        try {
          const freshUser = await api.getMe();
          if (freshUser) {
            setCurrentUser(freshUser);
            setFullName(freshUser.full_name || "");
            setPhoneNumber(freshUser.phone_number || "");
          }
        } catch {
          // ignore if offline or unauthenticated
        }

        const data = await api.getSettings();
        setSettings(data);
        setVrPrefix(data.default_vr_prefix || "VR");
        setCertPrefix(data.default_cert_prefix || "CERT");
        setFinEnabled(data.financial_tracking_enabled ?? true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isAdmin = currentUser?.role === "admin";

  // Password complexity checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid =
    hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  // Handle Save System Settings
  const handleSaveSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSystem(true);
    setFeedback(null);
    try {
      await api.updateSettings({
        default_vr_prefix: vrPrefix,
        default_cert_prefix: certPrefix,
        financial_tracking_enabled: finEnabled,
      });
      setFeedback({
        type: "success",
        message: "System configuration and sequence numbering updated successfully.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to update configuration.",
      });
    } finally {
      setSavingSystem(false);
    }
  };

  // Handle Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedback(null);
    try {
      const updated = await api.updateProfile({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || undefined,
      });
      setCurrentUser(updated);
      setFeedback({
        type: "success",
        message: "Staff profile details updated successfully.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to update profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setFeedback({
        type: "error",
        message: "Please enter your current password.",
      });
      return;
    }
    if (!isPasswordValid) {
      setFeedback({
        type: "error",
        message: "New password does not satisfy complexity requirements.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({
        type: "error",
        message: "New password and confirmation do not match.",
      });
      return;
    }

    setSavingPassword(true);
    setFeedback(null);
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setFeedback({
        type: "success",
        message: "Your password has been changed successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to change password.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Settings & Personnel Security"
        description="Profile security, authentication credentials, sequential numbering policies, and standard QA specs."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Settings className="w-3 h-3 text-slate-500" />
            Control Center
          </span>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("account")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "account"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <User className="w-4 h-4" />
          My Profile & Security
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("system")}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "system"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileCode className="w-4 h-4" />
          System Policies & Numbering
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[11px] underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: ACCOUNT & SECURITY */}
      {activeTab === "account" && (
        <div className="space-y-6">
          {/* Identity & Verification Status Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Personnel Identity & Credentials
                </h2>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                  currentUser?.account_status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {currentUser?.account_status || "ACTIVE"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Staff Member
                </span>
                <span className="font-semibold text-slate-900 text-sm mt-0.5 block truncate">
                  {currentUser?.full_name || "Authorized User"}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  @{currentUser?.username || "user"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Personnel No. (P.No.)
                </span>
                <span className="font-mono font-semibold text-emerald-800 text-sm mt-0.5 block">
                  {currentUser?.p_number || "P-STAFF"}
                </span>
                <span className="text-[10px] text-slate-500">
                  Fabrication Shop
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Authorization Role
                </span>
                <span className="font-mono font-bold uppercase text-slate-900 text-sm mt-0.5 block">
                  {currentUser?.role || "Staff"}
                </span>
                <span className="text-[10px] text-slate-500">
                  RBAC Cleared
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  Mobile Phone Verification
                </span>
                <span className="font-mono font-semibold text-slate-900 text-sm mt-0.5 block truncate">
                  {currentUser?.phone_number || "Not Registered"}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" />
                  {currentUser?.is_phone_verified ? "Verified" : "Active Contact"}
                </span>
              </div>
            </div>

            {/* Profile Edit Form */}
            <form onSubmit={handleUpdateProfile} className="pt-2 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-semibold text-slate-900">
                Update Contact Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-medium">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-medium">
                    Mobile Phone Number (E.164)
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+923001234567"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingProfile ? "Saving Profile..." : "Update Profile"}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Change Password / Access Key
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                STRICT POLICY
              </span>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div className="space-y-1.5 max-w-md">
                <label className="block text-slate-700 font-medium">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pr-10 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-medium">
                    New Password *
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New complex password"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-700 font-medium">
                    Confirm New Password *
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Password complexity checklist */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md max-w-2xl text-[11px] space-y-1">
                <span className="font-semibold text-slate-700 block">
                  Password Complexity Status:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-slate-600 font-mono text-[10px]">
                  <span
                    className={
                      hasMinLength ? "text-emerald-700 font-bold" : "text-slate-400"
                    }
                  >
                    {hasMinLength ? "✓" : "○"} Min 8 characters
                  </span>
                  <span
                    className={
                      hasUpper ? "text-emerald-700 font-bold" : "text-slate-400"
                    }
                  >
                    {hasUpper ? "✓" : "○"} Uppercase (A-Z)
                  </span>
                  <span
                    className={
                      hasLower ? "text-emerald-700 font-bold" : "text-slate-400"
                    }
                  >
                    {hasLower ? "✓" : "○"} Lowercase (a-z)
                  </span>
                  <span
                    className={
                      hasNumber ? "text-emerald-700 font-bold" : "text-slate-400"
                    }
                  >
                    {hasNumber ? "✓" : "○"} Digit (0-9)
                  </span>
                  <span
                    className={
                      hasSpecial ? "text-emerald-700 font-bold" : "text-slate-400"
                    }
                  >
                    {hasSpecial ? "✓" : "○"} Symbol (!@#...)
                  </span>
                  <span
                    className={
                      passwordsMatch
                        ? "text-emerald-700 font-bold"
                        : "text-slate-400"
                    }
                  >
                    {passwordsMatch ? "✓" : "○"} Passwords match
                  </span>
                </div>
              </div>

              <div className="flex justify-start pt-1">
                <button
                  type="submit"
                  disabled={
                    savingPassword ||
                    !isPasswordValid ||
                    !passwordsMatch ||
                    !currentPassword
                  }
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {savingPassword ? "Updating Password..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM POLICIES & NUMBERING */}
      {activeTab === "system" && (
        <>
          {!isAdmin ? (
            <div className="p-8 max-w-md mx-auto text-center space-y-3 bg-white border border-slate-200 rounded-lg">
              <ShieldAlert className="w-8 h-8 mx-auto text-amber-500" />
              <h2 className="text-sm font-semibold text-slate-900">
                Administrator Privileges Required
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                System configuration and numbering sequences can only be modified by authorized FFC administration personnel.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveSystem} className="space-y-6">
              {/* Sequential Numbering Policies */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Sequential Numbering Policies
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    AUTO-INCREMENT GENERATOR
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-1.5">
                    <label className="block text-slate-700 font-medium">
                      Reclamation Job Tracking ID Prefix
                    </label>
                    <input
                      type="text"
                      required
                      value={vrPrefix}
                      onChange={(e) => setVrPrefix(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono font-semibold uppercase text-slate-900"
                    />
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>Live sequence preview:</span>
                      <span className="font-mono font-medium text-slate-700">
                        {vrPrefix}-2026-000001
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-slate-700 font-medium">
                      Test Certificate Number Prefix
                    </label>
                    <input
                      type="text"
                      required
                      value={certPrefix}
                      onChange={(e) => setCertPrefix(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono font-semibold uppercase text-slate-900"
                    />
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>Live certificate preview:</span>
                      <span className="font-mono font-medium text-slate-700">
                        {certPrefix}-2026-000001
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Standard Quality Reference (Official Specification) */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Official Standard Quality Specification
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ACTIVE STANDARD
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      Form Specification
                    </span>
                    <span className="font-mono font-semibold text-slate-900 text-sm mt-0.5 block">
                      QF-003-05-307
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      Annexure Designation
                    </span>
                    <span className="font-semibold text-slate-900 text-sm mt-0.5 block">
                      ANNEXURE-III
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      Standard Issue Date
                    </span>
                    <span className="font-mono font-semibold text-slate-900 text-sm mt-0.5 block">
                      13-05-2025
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 flex items-center justify-between">
                  <span>
                    Facility: <strong>Fauji Fertilizer Company Ltd. (FFC)</strong> · Fabrication Shop, Goth Machhi, District Rahim Yar Khan.
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    ASME / API 598
                  </span>
                </div>
              </div>

              {/* Operational Modules */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Operational Module Governance
                    </h2>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <div className="space-y-0.5 pr-4">
                    <span className="font-medium text-slate-900 block">
                      Reclamation Record Central Registry
                    </span>
                    <span className="text-slate-500 text-[11px] block">
                      Keep centralized tracking of valve lifecycle entries, hydro testing results, and printable certificate audit trails enabled.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={finEnabled}
                      onChange={(e) => setFinEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingSystem}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium tracking-wide flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingSystem ? "Saving Policy..." : "Save System Settings"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
