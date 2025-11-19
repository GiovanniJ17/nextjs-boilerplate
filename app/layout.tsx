import type { Metadata } from "next";
import "./globals.css";
import { MainNav } from "@/components/MainNav";
import { MobileNav } from "@/components/MobileNav";
import { AppToaster } from "@/components/ui/app-toaster";
import { OfflineIndicator } from "@/components/ui/offline-indicator";

export const metadata: Metadata = {
  title: {
    default: "Tracker Velocista",
    template: "%s | Tracker Velocista",
  },
  description: "Registro allenamenti professionale per velocisti. Monitora progressi, analizza statistiche e ottimizza le tue performance.",
  keywords: ["velocità", "atletica", "sprint", "allenamento", "tracker", "performance", "statistiche"],
  authors: [{ name: "Tracker Velocista" }],
  themeColor: "#f97316", // orange-500
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tracker Velocista",
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="light" style={{ colorScheme: 'light' }}>
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen font-sans antialiased">
        <MainNav />
        <main className="page-shell mx-auto max-w-5xl px-4 py-6 pb-24 md:py-8 md:pb-8">
          {children}
        </main>
        <MobileNav />
        <AppToaster />
        <OfflineIndicator />
      </body>
    </html>
  );
}
