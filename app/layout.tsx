import type { Metadata } from "next";
import "./globals.css";
import { MainNav } from "@/components/MainNav";
import { AppToaster } from "@/components/ui/app-toaster";

export const metadata: Metadata = {
  title: "Tracker Velocista",
  description: "Registro allenamenti per velocisti",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="bg-slate-50 text-slate-900 min-h-screen font-sans">
        <MainNav />
        <main className="page-shell mx-auto max-w-5xl px-4 py-8">{children}</main>
        <AppToaster />
      </body>
    </html>
  );
}
