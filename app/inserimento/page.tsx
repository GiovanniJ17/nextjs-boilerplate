// app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-lg">
        <h1 className="text-2xl font-semibold tracking-tight">
          Benvenuto in <span className="text-sky-400">Tracker Velocista</span>
        </h1>
        <p className="mt-3 text-sm text-slate-300">
          Qui puoi registrare le tue sessioni di allenamento, rivedere lo
          storico e analizzare le statistiche in un unico posto, connesso al
          tuo database Supabase.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <HomeCard
          title="Inserimento sessione"
          description="Crea un nuovo blocco, aggiungi una sessione e definisci gli esercizi con i relativi risultati."
          href="/inserimento"
        />
        <HomeCard
          title="Storico sessioni"
          description="Rivedi le ultime sessioni eseguite con i dettagli principali."
          href="/storico"
        />
        <HomeCard
          title="Statistiche"
          description="Analizza le prestazioni per esercizio e consulta le metriche generali."
          href="/statistiche"
        />
      </section>
    </div>
  );
}

type HomeCardProps = {
  title: string;
  description: string;
  href: string;
};

function HomeCard({ title, description, href }: HomeCardProps) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200 shadow hover:border-sky-500 hover:text-slate-50 hover:shadow-sky-500/20"
    >
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      <p className="flex-1 text-xs text-slate-300">{description}</p>
      <span className="mt-4 text-xs font-semibold text-sky-400">
        Apri →
      </span>
    </Link>
  );
}
