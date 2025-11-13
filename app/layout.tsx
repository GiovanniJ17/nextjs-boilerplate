import type { Metadata } from "next";
import "./globals.css";
import { MainNav } from "@/components/MainNav";
import { AppToaster } from "@/components/ui/app-toaster";

export const metadata: Metadata = {
  title: {
    default: "Tracker Velocista",
    template: "%s | Tracker Velocista",
  },
  description: "Registro allenamenti professionale per velocisti. Monitora progressi, analizza statistiche e ottimizza le tue performance.",
  keywords: ["velocità", "atletica", "sprint", "allenamento", "tracker", "performance", "statistiche"],
  authors: [{ name: "Tracker Velocista" }],
  creator: "Tracker Velocista",
  publisher: "Tracker Velocista",
  themeColor: "#0ea5e9",
  colorScheme: "light",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tracker Velocista",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    url: "https://tracker-velocista.app",
    title: "Tracker Velocista - Registro Allenamenti",
    description: "Monitora i tuoi progressi nell'atletica leggera con analisi avanzate e statistiche dettagliate.",
    siteName: "Tracker Velocista",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tracker Velocista",
    description: "Registro allenamenti professionale per velocisti",
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
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen font-sans antialiased">
        <MainNav />
        <main className="page-shell mx-auto max-w-5xl px-4 py-8">{children}</main>
        <AppToaster />
      </body>
    </html>
  );
}
