"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { triggerActiveCloseHandler } from "@/lib/modalRegistry";

export default function MobileBackHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const lastBackPressTime = useRef<number>(0);
  const [showExitToast, setShowExitToast] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only register Capacitor native back listener if on native Android / iOS
    const isNative = Capacitor.isNativePlatform();

    const handleBackAction = async (canGoBackFromCapacitor: boolean) => {
      // 1. If a modal / bottom sheet / dialog / drawer is open -> close it
      const overlayClosed = triggerActiveCloseHandler();
      if (overlayClosed) {
        return;
      }

      // 2. If on a non-Home route -> navigate back or go to Home
      if (pathname !== "/") {
        // Try router back or fallback to home
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
        return;
      }

      // 3. We are on the Home screen ("/")
      const now = Date.now();
      if (now - lastBackPressTime.current < 2000) {
        // Second press within 2 seconds -> Exit App
        if (isNative) {
          await App.exitApp();
        }
      } else {
        // First press -> Show "Press back again to exit" toast
        lastBackPressTime.current = now;
        setShowExitToast(true);
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => {
          setShowExitToast(false);
        }, 2000);
      }
    };

    let backListenerHandle: any = null;

    if (isNative) {
      App.addListener("backButton", ({ canGoBack }) => {
        handleBackAction(canGoBack);
      }).then((handle) => {
        backListenerHandle = handle;
      });

      // App resume / pause listener: keep state alive, never reset to login
      const stateListener = App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          // App resumed to foreground - ensure UI is responsive
          window.dispatchEvent(new Event("resize"));
        }
      });

      return () => {
        if (backListenerHandle && backListenerHandle.remove) {
          backListenerHandle.remove();
        }
        stateListener.then((h) => h.remove?.());
      };
    } else {
      // Desktop / Web browser escape key fallback to close open modals
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          triggerActiveCloseHandler();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [pathname, router]);

  if (!showExitToast) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-150">
      <div className="px-4 py-2 bg-slate-900/95 text-white text-xs font-semibold rounded-full shadow-2xl border border-slate-700 backdrop-blur-md flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Press back again to exit FFC App</span>
      </div>
    </div>
  );
}
