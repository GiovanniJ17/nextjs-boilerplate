import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Tracker Velocista',
  description: 'Gestisci sessioni di allenamento e statistiche',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-[#f1f5f9] text-gray-800">
        <Navbar />
        <main className="max-w-5xl mx-auto mt-8 p-6">{children}</main>
        <footer className="text-center text-sm text-gray-400 py-6">
          © {new Date().getFullYear()} Tracker Velocista — Tutti i diritti riservati.
        </footer>
      </body>
    </html>
  );
}
