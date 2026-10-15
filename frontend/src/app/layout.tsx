import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import AppLayoutShell from "@/components/AppLayoutShell";

export const metadata: Metadata = {
  title: "FFC Valve Reclamation Management System | Fabrication Shop",
  description: "Enterprise Valve Reclamation Management System & QF-003-05-307 Certificate Digitization for Fauji Fertilizer Company, Goth Machhi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#061020",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-[100dvh] h-[100dvh] overflow-x-hidden bg-slate-100 text-slate-900 font-sans antialiased" suppressHydrationWarning>
        <Suspense fallback={null}>
          <AppLayoutShell>{children}</AppLayoutShell>
        </Suspense>
      </body>
    </html>
  );
}
