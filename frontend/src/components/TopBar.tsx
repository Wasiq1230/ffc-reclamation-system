"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Menu,
  Plus,
  ShieldCheck,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { getStoredUser } from "@/lib/api";

interface TopBarProps {
  onOpenSearch: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

// Route to breadcrumb title mapping
const routeLabels: Record<string, string> = {
  jobs: "Master Register",
  new: "Register Reclamation",
  scan: "Certificate Scanner",
  photos: "Valve Photos Gallery",
  workflow: "Workflow Board",
  inspections: "Inspection & Testing",
  certificates: "Certificates Registry",
  editor: "Certificate Editor",
  financials: "Reclamation Records",
  organizations: "Plants & Departments",
  customers: "External Customers",
  reports: "Reports & Analytics",
  users: "Users & Roles",
  audit: "Audit Logs",
  settings: "System Settings",
  login: "Authentication",
};

export default function TopBar({
  onOpenSearch,
  onToggleSidebar,
  isSidebarOpen,
}: TopBarProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setCurrentUser(getStoredUser());
    const onAuthChanged = () => setCurrentUser(getStoredUser());
    window.addEventListener("auth-changed", onAuthChanged);
    return () => window.removeEventListener("auth-changed", onAuthChanged);
  }, []);

  if (pathname === "/login") return null;

  // Build breadcrumbs
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, idx) => {
    const href = "/" + pathSegments.slice(0, idx + 1).join("/");
    const isLast = idx === pathSegments.length - 1;
    const label = routeLabels[segment] || segment.toUpperCase();
    return { href, label, isLast };
  });

  return (
    <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 pt-[env(safe-area-inset-top,0px)] min-h-[3.5rem]">
      {/* Left: Official FFC Logo + Mobile Menu toggle + Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Official FFC Logo */}
        <Link
          href="/"
          className="flex items-center shrink-0 group active:scale-95 transition-transform"
          title="FFC Valve Reclamation System - Home"
        >
          <img
            src="/ffc-logo.png"
            alt="FFC Official Logo"
            className="h-6 sm:h-7.5 w-auto object-contain transition-transform group-hover:scale-105"
          />
        </Link>

        <div className="h-4 w-px bg-slate-200 shrink-0" />

        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition focus:outline-none shrink-0"
          title={isSidebarOpen ? "Collapse navigation" : "Expand navigation"}
          aria-label="Toggle navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Minimal Breadcrumb trail - shows only active page name on mobile */}
        <nav aria-label="Breadcrumb" className="flex items-center text-xs text-slate-500 overflow-x-auto no-scrollbar whitespace-nowrap min-w-0">
          <Link href="/" className="hover:text-slate-900 font-medium transition shrink-0 hidden sm:inline">
            Shop
          </Link>
          {breadcrumbs.map((crumb) => (
            <React.Fragment key={crumb.href}>
              <ChevronRight className="w-3 h-3 text-slate-300 mx-1 shrink-0 hidden sm:inline" />
              {crumb.isLast ? (
                <span className="font-semibold text-slate-900 truncate">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:text-slate-900 transition truncate hidden md:inline"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right: Global Search, Plant status badge, New Valve shortcut */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Minimal Global Search Trigger (Raycast style) */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="group flex items-center justify-center gap-2 p-2 sm:px-3 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-lg text-xs text-slate-500 hover:text-slate-800 transition shadow-2xs"
          title="Search anything (Ctrl+K)"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition shrink-0" />
          <span className="hidden md:inline font-normal">Quick search...</span>
          <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono px-1.5 py-0.2 bg-white border border-slate-200 rounded text-slate-400 group-hover:border-slate-300 transition">
            ⌘K
          </kbd>
        </button>

        {/* Plant status live indicator */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-emerald-50/70 border border-emerald-200/60 rounded-lg text-[11px] text-emerald-800 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Goth Machhi Shop</span>
        </div>

        {/* Quick action button: Register Valve */}
        <Link
          href="/jobs/new"
          className="inline-flex items-center justify-center p-2 sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition active:scale-95 shrink-0"
          title="Register New Valve"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline ml-1.5">Register Valve</span>
        </Link>
      </div>
    </header>
  );
}
