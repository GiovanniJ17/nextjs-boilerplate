import type { Metadata } from "next";
import "./globals.css";
import { MainNav } from "@/components/MainNav";
import { AppToaster } from "@/components/ui/app-toaster";

export const metadata: Metadata = {
  title: "Tracker Velocista",
  description: "Registro allenamenti per velocisti",
  themeColor: "#f8fafc",
  colorScheme: "light",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
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
