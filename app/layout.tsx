import type { Metadata } from "next";
import "./globals.css";
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
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <MainNav />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
