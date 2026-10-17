"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  X,
  Award,
  FileCheck,
  Camera,
  KanbanSquare,
  ClipboardCheck,
  Factory,
  Building2,
  BarChart3,
  Users2,
  ShieldAlert,
  Settings,
  LogOut,
  ChevronRight,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { registerCloseHandler } from "@/lib/modalRegistry";
import { getStoredUser, removeAuthToken, api } from "@/lib/api";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const moreItems = [
  {
    category: "Quality & Media",
    items: [
      { label: "Certificates Registry", href: "/certificates", icon: Award, desc: "QF-003-05-307 Certificates" },
      { label: "Valve Photos Gallery", href: "/photos", icon: Camera, desc: "Before & After HD Work Photos" },
      { label: "Inspection & Testing", href: "/inspections", icon: ClipboardCheck, desc: "Hydrostatic & Pneumatic Log" },
      { label: "Workflow Kanban", href: "/workflow", icon: KanbanSquare, desc: "Stage Progression Board" },
    ],
  },
  {
    category: "Records & Organization",
    items: [
      { label: "Reclamation Records", href: "/financials", icon: FileCheck, desc: "Complete Audit File History" },
      { label: "Plants & Departments", href: "/organizations", icon: Factory, desc: "FFC Plant 1 & 2 Units" },
      { label: "External Clients", href: "/customers", icon: Building2, desc: "Outside Reclamation Partners" },
    ],
  },
  {
    category: "System & Administration",
    items: [
      { label: "Reports & Analytics", href: "/reports", icon: BarChart3, desc: "Shop Turnaround & Metrics" },
      { label: "Users & Roles", href: "/users", icon: Users2, desc: "Operators, QC & Admins" },
      { label: "Audit Trail", href: "/audit", icon: ShieldAlert, desc: "Security & Tamper-proof Logs" },
      { label: "System Settings", href: "/settings", icon: Settings, desc: "Shop Rules & App Config" },
    ],
  },
];

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
    const onAuthChanged = () => setUser(getStoredUser());
    window.addEventListener("auth-changed", onAuthChanged);
    return () => window.removeEventListener("auth-changed", onAuthChanged);
  }, []);

  // Register with modalRegistry so back button closes drawer
  useEffect(() => {
    if (!isOpen) return;
    const unregister = registerCloseHandler("mobileDrawer", onClose, 20);
    return unregister;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogout = () => {
    onClose();
    removeAuthToken();
    router.push("/login");
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Slide-up Bottom Sheet / Drawer */}
      <div className="relative bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 max-h-[85dvh] flex flex-col z-10 overflow-hidden animate-in slide-in-from-bottom duration-250 ease-out">
        {/* Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-3 shrink-0" />

        {/* Header */}
        <div className="px-5 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img src="/ffc-logo.png" alt="FFC" className="h-8 w-auto object-contain" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 leading-tight">
                FFC Fabrication Shop
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Reclamation Management System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 active:scale-95 transition"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Menu Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">
          {moreItems.map((sec) => (
            <div key={sec.category}>
              <h4 className="px-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {sec.category}
              </h4>
              <div className="grid grid-cols-1 gap-1.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center justify-between p-3 rounded-2xl active:scale-[0.98] transition border ${
                        isActive
                          ? "bg-emerald-50/90 border-emerald-200 text-emerald-950 font-semibold"
                          : "bg-slate-50/70 hover:bg-slate-100 border-slate-200/60 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive ? "bg-emerald-600 text-white" : "bg-white text-slate-600 shadow-2xs border border-slate-200/60"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold truncate leading-tight">{item.label}</p>
                          <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 ml-2" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Profile & Sign Out Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 pb-safe">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {user?.full_name ? user.full_name.charAt(0) : "U"}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.full_name || "FFC Operator"}</p>
                <p className="text-[10px] text-slate-500 font-mono capitalize">
                  {user?.role?.replace("_", " ") || "Staff"} {user?.employee_id && `· ${user.employee_id}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  api.reloadAppFromServer(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition active:scale-95"
                title="Sync and load latest server updates"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                <span>Sync</span>
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
