import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Registro', href: '/inserimento' },
    { label: 'Storico', href: '/storico' },
    { label: 'Statistiche', href: '/statistiche' },
  ];

  return (
    <html lang="it">
      <body className="min-h-screen bg-[#f1f5f9] text-gray-800">
        <header className="w-full bg-white shadow-sm py-3 px-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-blue-600">🏃‍♂️ Tracker Velocista</h1>
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-4 py-2 rounded-md font-medium transition-all',
                  pathname === item.href
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="max-w-5xl mx-auto mt-8 p-6">
          {children}
        </main>

        <footer className="text-center text-sm text-gray-400 py-6">
          © {new Date().getFullYear()} Tracker Velocista — Tutti i diritti riservati.
        </footer>
      </body>
    </html>
  );
}
