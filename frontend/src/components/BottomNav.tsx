"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TableProperties,
  ScanLine,
  FilePlus2,
  Menu
} from "lucide-react";
import MobileDrawer from "./MobileDrawer";

export default function BottomNav() {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  if (pathname === "/login") return null;

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Register", href: "/jobs", icon: TableProperties },
    { label: "Scan", href: "/jobs/scan", icon: ScanLine, isPrimary: true },
    { label: "New Valve", href: "/jobs/new", icon: FilePlus2 },
  ];

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-lg px-2 pb-safe"
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            if (item.isPrimary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center -mt-5 relative group"
                >
                  <div
                    className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 ${
                      isActive
                        ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                        : "bg-slate-900 text-emerald-400 ring-4 ring-slate-100"
                    }`}
                  >
                    <Icon className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-1 tracking-tight ${
                      isActive ? "text-emerald-700 font-extrabold" : "text-slate-600 font-semibold"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                  isActive ? "text-emerald-600 font-bold" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                  {isActive && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  )}
                </div>
                <span className="text-[10px] tracking-tight mt-1 font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* More Drawer Button */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
              isDrawerOpen ? "text-emerald-600 font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <div className="relative">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-1 font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-up Drawer */}
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
