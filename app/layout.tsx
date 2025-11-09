import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

import { MainNav } from "@/components/MainNav";

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
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <MainNav />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
