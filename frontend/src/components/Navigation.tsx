"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FilePlus2,
  TableProperties,
  KanbanSquare,
  ClipboardCheck,
  Award,
  BarChart3,
  Building2,
  Users2,
  FileCheck,
  ShieldAlert,
  Settings,
  LogOut,
  Factory,
  ScanLine,
  Camera,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getStoredUser, removeAuthToken } from "@/lib/api";

interface NavigationProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavGroup {
  title: string;
  items: {
    label: string;
    href: string;
    icon: any;
    badge?: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Master Register", href: "/jobs", icon: TableProperties },
      { label: "Register Reclamation", href: "/jobs/new", icon: FilePlus2 },
      { label: "Workflow Board", href: "/workflow", icon: KanbanSquare },
    ],
  },
  {
    title: "Quality & Media",
    items: [
      { label: "Certificates Registry", href: "/certificates", icon: Award },
      { label: "Inspection & Testing", href: "/inspections", icon: ClipboardCheck },
      { label: "Certificate Scanner", href: "/jobs/scan", icon: ScanLine },
      { label: "Photos Gallery", href: "/photos", icon: Camera },
    ],
  },
  {
    title: "Registry & Records",
    items: [
      { label: "Reclamation Records", href: "/financials", icon: FileCheck },
      { label: "Plants & Departments", href: "/organizations", icon: Factory },
      { label: "External Customers", href: "/customers", icon: Building2 },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Reports & Analytics", href: "/reports", icon: BarChart3 },
      { label: "Users & Roles", href: "/users", icon: Users2 },
      { label: "Audit Logs", href: "/audit", icon: ShieldAlert },
      { label: "System Settings", href: "/settings", icon: Settings },
    ],
  },
];

export default function Navigation({ isCollapsed = false, onToggleCollapse }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
    const onAuthChanged = () => setUser(getStoredUser());
    window.addEventListener("auth-changed", onAuthChanged);
    return () => window.removeEventListener("auth-changed", onAuthChanged);
  }, []);

  if (pathname === "/login") return null;

  const handleLogout = () => {
    removeAuthToken();
    router.push("/login");
  };

  return (
    <aside
      className={`no-print bg-[#061020] text-slate-300 hidden md:flex flex-col h-screen sticky top-0 border-r border-[#131f37] shrink-0 transition-all duration-300 z-40 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand Header with Official FFC Logo */}
      <div className="h-16 px-4 border-b border-[#131f37] flex items-center justify-between bg-[#061020]">
        <Link href="/" className="flex items-center gap-3 min-w-0 group">
          <img
            src="/ffc-logo.png"
            alt="FFC Official Logo"
            className={`${isCollapsed ? "h-6" : "h-7"} w-auto object-contain shrink-0 transition-transform group-hover:scale-105`}
            style={{ filter: "drop-shadow(0 0 1px rgba(255,255,255,0.75))" }}
          />
          {!isCollapsed && (
            <div className="truncate">
              <h1 className="font-bold text-xs text-white tracking-wide leading-tight uppercase truncate">
                FFC Fabrication Shop
              </h1>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                Reclamation Management
              </p>
            </div>
          )}
        </Link>
        {onToggleCollapse && !isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900 transition"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 no-scrollbar">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-0.5">
            {!isCollapsed && (
              <p className="px-2.5 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition group relative ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-slate-900/80"
                  } ${isCollapsed ? "justify-center" : ""}`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition ${
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {isActive && !isCollapsed && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white/90"></span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Information & Logout Controls */}
      <div className="p-3 border-t border-[#131f37] bg-[#050d1a]">
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400 shrink-0 uppercase">
                {user?.full_name ? user.full_name.charAt(0) : "U"}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-100 truncate">
                  {user?.full_name || "FFC Operator"}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                  <span className="capitalize">{user?.role?.replace("_", " ") || "Staff"}</span>
                  {user?.employee_id && <span>· {user.employee_id}</span>}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
            title="Sign out of system"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {!isCollapsed && (
          <div className="mt-2.5 pt-2 border-t border-[#131f37]/70 flex items-center justify-between text-[10px] text-slate-400 font-medium select-none">
            <span className="font-mono text-slate-400">v2.4</span>
            <span className="text-slate-400 tracking-tight">© Muhammad Wasiq Hussain</span>
          </div>
        )}
      </div>
    </aside>
  );
}
