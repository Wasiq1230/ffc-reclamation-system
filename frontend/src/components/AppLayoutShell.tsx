"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Navigation from "@/components/Navigation";
import TopBar from "@/components/TopBar";
import GlobalSearchModal from "@/components/GlobalSearchModal";
import BottomNav from "@/components/BottomNav";
import MobileBackHandler from "@/components/MobileBackHandler";
import { WifiOff } from "lucide-react";

export default function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Monitor network connectivity for mobile awareness
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Global keyboard shortcut: Ctrl+K or Cmd+K opens the command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <main className="min-h-[100dvh] bg-slate-900">{children}</main>;
  }

  return (
    <div suppressHydrationWarning className="flex h-[100dvh] w-full overflow-hidden bg-slate-100/80 text-slate-900 font-sans">
      {/* Capacitor Android Back Button State Machine */}
      <MobileBackHandler />

      {/* Streamlined Grouped Navigation (Desktop Only on md+) */}
      <Navigation
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
        {/* Subtle Offline Warning Banner */}
        {isOffline && (
          <div className="bg-amber-600 text-white text-[11px] font-semibold px-4 py-1.5 flex items-center justify-center gap-2 shrink-0 animate-in slide-in-from-top duration-200">
            <WifiOff className="w-3.5 h-3.5" />
            <span>You are currently offline. Changes will sync when network is restored.</span>
          </div>
        )}

        {/* Minimal Top Bar */}
        <TopBar
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
          isSidebarOpen={!isCollapsed}
        />

        {/* Content Area with smooth scrolling & mobile safe padding */}
        <main className="flex-1 overflow-y-auto no-scrollbar focus:outline-none pb-20 md:pb-0">
          {children}
        </main>

        {/* Mobile Careem/Netflix Style Bottom Navigation Bar */}
        <BottomNav />
      </div>

      {/* Discreet Minimalist Corner Copyright - Desktop */}
      <div className="hidden md:flex fixed bottom-2.5 right-3.5 z-30 pointer-events-none select-none items-center gap-1 text-[10px] text-slate-400/80 font-medium tracking-wide bg-white/70 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-200/50 shadow-2xs">
        <span>©</span>
        <span>Muhammad Wasiq Hussain</span>
      </div>

      {/* Discreet Minimalist Corner Copyright - Mobile (Above bottom nav bar) */}
      <div className="md:hidden fixed bottom-[4.25rem] right-2.5 z-30 pointer-events-none select-none items-center gap-1 text-[9px] text-slate-400/75 font-medium tracking-tight bg-white/80 backdrop-blur-xs px-1.5 py-0.5 rounded border border-slate-200/40 shadow-2xs">
        <span>©</span>
        <span>Muhammad Wasiq Hussain</span>
      </div>

      {/* Global Command Palette */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}
