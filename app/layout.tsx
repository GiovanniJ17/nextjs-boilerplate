import type { Metadata } from "next";
import "./globals.css";
import { MainNav } from "@/components/MainNav";
import { AppToaster } from "@/components/ui/app-toaster";
import { ThemeProvider } from "@/components/theme-provider";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0ea5e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  colorScheme: "light dark",
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
    <html lang="it" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('tracker-theme') || 'system';
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                const activeTheme = theme === 'system' ? systemTheme : theme;
                document.documentElement.classList.add(activeTheme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider defaultTheme="system" storageKey="tracker-theme">
          <MainNav />
          <main className="page-shell mx-auto max-w-5xl px-4 py-8">{children}</main>
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
