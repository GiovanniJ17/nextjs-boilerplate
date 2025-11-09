'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
  Droplets,
  FileText,
  Filter,
  FolderKanban,
  Loader2,
  MapPin,
  NotebookText,
  Search,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ExerciseResult = {
  id: string;
  attempt_number: number | null;
  repetition_number: number | null;
  time_s: number | null;
  weight_kg: number | null;
  rpe: number | null;
  notes: string | null;
};

type Exercise = {
  id: string;
  name: string | null;
  discipline_type: string | null;
  distance_m: number | null;
  sets: number | null;
  repetitions: number | null;
  rest_between_reps_s: number | null;
  rest_between_sets_s: number | null;
  rest_after_exercise_s: number | null;
  intensity: number | null;
  effort_type: string | null;
  notes: string | null;
  results: ExerciseResult[];
};

type Metric = {
  id: string;
  metric_name: string | null;
  category: string | null;
  metric_target: string | null;
  value: number | null;
  unit: string | null;
  notes: string | null;
};

type TrainingBlock = {
  id: string;
  name: string | null;
  start_date: string | null;
  end_date: string | null;
};

type TrainingSession = {
  id: string;
  date: string | null;
  type: string | null;
  phase: string | null;
  location: string | null;
  notes: string | null;
  block: TrainingBlock | null;
  exercises: Exercise[];
  metrics: Metric[];
};

function formatDate(date: string | null) {
  if (!date) return 'Data non disponibile';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

function formatEffort(effort: string | null) {
  if (!effort) return '—';
  const labels: Record<string, string> = {
    basso: 'Basso',
    medio: 'Medio',
    alto: 'Alto',
    massimo: 'Massimo',
  };
  return labels[effort] ?? effort;
}

function formatDistance(exercise: Exercise) {
  const distance = exercise.distance_m || 0;
  const sets = exercise.sets || 0;
  const repetitions = exercise.repetitions || 0;
  if (!distance || !sets || !repetitions) return '—';
  const total = distance * sets * repetitions;
  return `${total.toLocaleString('it-IT')} m totali`;
}

function humanDiscipline(discipline: string | null) {
  switch (discipline) {
    case 'forza':
      return 'Forza';
    case 'mobilità':
      return 'Mobilità';
    case 'tecnica':
      return 'Tecnica';
    case 'sprint':
      return 'Sprint';
    default:
      return 'Altro';
  }
}

export default function StoricoPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [blockFilter, setBlockFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [openSession, setOpenSession] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([loadSessions(), loadBlocks()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBlocks() {
    const { data, error } = await supabase
      .from('training_blocks')
      .select('id, name, start_date, end_date')
      .order('start_date', { ascending: false });

    if (!error && data) {
      setBlocks(data as TrainingBlock[]);
    }
  }

  async function loadSessions() {
    setLoading(true);

    let query = supabase
      .from('training_sessions')
      .select(
        `id, date, type, phase, location, notes, block_id,
         block:training_blocks (id, name, start_date, end_date),
         exercises:exercises (
           id, name, discipline_type, distance_m, sets, repetitions, rest_between_reps_s, rest_between_sets_s, rest_after_exercise_s, intensity, effort_type, notes,
           results:exercise_results (id, attempt_number, repetition_number, time_s, weight_kg, rpe, notes)
         ),
         metrics:metrics (id, metric_name, category, metric_target, value, unit, notes)
        `
      )
      .order('date', { ascending: false })
      .limit(100);

    if (fromDate) query = query.gte('date', fromDate);
    if (toDate) query = query.lte('date', toDate);
    if (typeFilter) query = query.eq('type', typeFilter);
    if (blockFilter) query = query.eq('block_id', blockFilter);

    const { data, error } = await query;

    if (!error && data) {
      const casted = (data as unknown as TrainingSession[]).map(session => ({
        ...session,
        exercises: (session.exercises || []).map(exercise => ({
          ...exercise,
          results: exercise?.results ? (exercise.results as ExerciseResult[]) : [],
        })),
        metrics: session.metrics || [],
      }));
      setSessions(casted);
    }

    setLoading(false);
  }

  function resetFilters() {
    setFromDate('');
    setToDate('');
    setTypeFilter('');
    setBlockFilter('');
    setSearch('');
    void loadSessions();
  }

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions;
    const term = search.trim().toLowerCase();
    return sessions.filter(session => {
      const sessionString = [
        session.type,
        session.location,
        session.phase,
        session.notes,
        session.block?.name,
        ...session.exercises.map(exercise => exercise.name || ''),
      ]
        .join(' ')
        .toLowerCase();
      return sessionString.includes(term);
    });
  }, [search, sessions]);

  function toggleSession(id: string) {
    setOpenSession(prev => (prev === id ? null : id));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
              <NotebookText className="h-4 w-4" /> Storico Allenamenti
            </div>
            <h1 className="text-3xl font-semibold">Rivivi le tue sessioni più importanti</h1>
            <p className="max-w-xl text-sm text-white/70">
              Consulta rapidamente blocchi, dettagli tecnici, risultati e metriche raccolte nelle sessioni precedenti.
              Utilizza i filtri per trovare l’allenamento giusto in pochi secondi.
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 px-6 py-5 text-center">
            <p className="text-xs uppercase tracking-widest text-white/60">Allenamenti registrati</p>
            <p className="text-4xl font-semibold">{sessions.length}</p>
            <p className="text-xs text-white/60">Ultimi 100 inserimenti</p>
          </div>
        </div>
      </section>

      <Card className="border-none shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
            <Filter className="h-5 w-5 text-sky-600" /> Filtri avanzati
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Da</Label>
              <Input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">A</Label>
              <Input type="date" value={toDate} onChange={event => setToDate(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Tipo sessione</Label>
              <select
                value={typeFilter}
                onChange={event => setTypeFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-400 focus:bg-white"
              >
                <option value="">Tutte</option>
                <option value="pista">Pista</option>
                <option value="palestra">Palestra</option>
                <option value="test">Test</option>
                <option value="scarico">Scarico</option>
                <option value="recupero">Recupero</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Blocco</Label>
              <select
                value={blockFilter}
                onChange={event => setBlockFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-400 focus:bg-white"
              >
                <option value="">Tutti</option>
                {blocks.map(block => (
                  <option key={block.id} value={block.id}>
                    {block.name ?? 'Blocco senza nome'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus-within:border-sky-300">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Cerca per note, luogo, esercizi o blocchi..."
                className="h-8 w-full border-none bg-transparent text-sm outline-none"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                className="rounded-full border-slate-200 text-xs"
              >
                Reset
              </Button>
              <Button type="button" onClick={loadSessions} className="rounded-full text-xs">
                Applica filtri
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
            <FolderKanban className="h-5 w-5 text-sky-600" /> Storico sessioni
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Caricamento delle sessioni...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 py-12 text-center text-sm text-slate-500">
              Nessun allenamento trovato. Modifica i filtri o registra una nuova sessione!
            </div>
          ) : (
            filteredSessions.map(session => {
              const isOpen = openSession === session.id;
              const totalMetrics = session.metrics?.length ?? 0;
              const totalExercises = session.exercises?.length ?? 0;
              const totalVolume = session.exercises.reduce((sum, exercise) => {
                const distance = exercise.distance_m || 0;
                const sets = exercise.sets || 0;
                const reps = exercise.repetitions || 0;
                if (!distance || !sets || !reps) return sum;
                return sum + distance * sets * reps;
              }, 0);

              return (
                <div key={session.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggleSession(session.id)}
                    className="flex w-full items-center justify-between gap-4 rounded-3xl px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-600">
                          <Calendar className="h-3 w-3" /> {formatDate(session.date)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          <Activity className="h-3 w-3" /> {session.type ?? 'Sessione'}
                        </span>
                        {session.phase && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-600">
                            <Target className="h-3 w-3" /> {session.phase}
                          </span>
                        )}
                        {session.block?.name && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                            <FolderKanban className="h-3 w-3" /> {session.block.name}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        {session.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {session.location}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <ListBulletIcon /> {totalExercises} esercizi
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Droplets className="h-3 w-3" /> {totalVolume ? `${totalVolume.toLocaleString('it-IT')} m` : 'Volume n/d'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {totalMetrics} metriche
                        </span>
                      </div>

                      {session.notes && (
                        <p className="text-sm text-slate-600 line-clamp-2">{session.notes}</p>
                      )}
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white p-2 text-slate-500">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 px-5 pb-5">
                      <div className="grid gap-4 py-4 lg:grid-cols-2">
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-slate-700">Esercizi</h3>
                          {session.exercises.length === 0 ? (
                            <p className="text-xs text-slate-500">Nessun esercizio registrato.</p>
                          ) : (
                            session.exercises.map(exercise => (
                              <div
                                key={exercise.id}
                                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-700">
                                  <span>{exercise.name ?? 'Esercizio'}</span>
                                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-600">
                                    {humanDiscipline(exercise.discipline_type)}
                                  </span>
                                </div>
                                <div className="mt-2 grid gap-2 md:grid-cols-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-700">Serie x Rip:</span>
                                    <span>
                                      {exercise.sets ?? '—'} x {exercise.repetitions ?? '—'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-700">Recuperi:</span>
                                    <span>
                                      {exercise.rest_between_reps_s ?? '—'}s / {exercise.rest_between_sets_s ?? '—'}s
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-700">Intensità:</span>
                                    <span>
                                      {exercise.intensity ?? '—'}/10 ({formatEffort(exercise.effort_type)})
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-700">Volume:</span>
                                    <span>{formatDistance(exercise)}</span>
                                  </div>
                                </div>
                                {exercise.notes && (
                                  <p className="mt-3 text-xs text-slate-500">{exercise.notes}</p>
                                )}

                                {exercise.results.length > 0 && (
                                  <div className="mt-3 space-y-2">
                                    <p className="text-[11px] font-semibold uppercase text-slate-500">Risultati</p>
                                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                      <table className="min-w-full text-[11px]">
                                        <thead className="bg-slate-100 text-slate-600">
                                          <tr>
                                            <th className="px-3 py-2 text-left">Tent.</th>
                                            <th className="px-3 py-2 text-left">Rip.</th>
                                            <th className="px-3 py-2 text-left">Tempo (s)</th>
                                            <th className="px-3 py-2 text-left">Carico (kg)</th>
                                            <th className="px-3 py-2 text-left">RPE</th>
                                            <th className="px-3 py-2 text-left">Note</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {exercise.results.map(result => (
                                            <tr key={result.id} className="odd:bg-white even:bg-slate-50/70">
                                              <td className="px-3 py-2">{result.attempt_number ?? '—'}</td>
                                              <td className="px-3 py-2">{result.repetition_number ?? '—'}</td>
                                              <td className="px-3 py-2">{result.time_s ?? '—'}</td>
                                              <td className="px-3 py-2">{result.weight_kg ?? '—'}</td>
                                              <td className="px-3 py-2">{result.rpe ?? '—'}</td>
                                              <td className="px-3 py-2">{result.notes ?? '—'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-slate-700">Metriche collegate</h3>
                          {session.metrics.length === 0 ? (
                            <p className="text-xs text-slate-500">Nessuna metrica associata.</p>
                          ) : (
                            session.metrics.map(metric => (
                              <div
                                key={metric.id}
                                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-700">
                                  <span>{metric.metric_name ?? 'Metrica'}</span>
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-600">
                                    {metric.category ?? '—'}
                                  </span>
                                </div>
                                <div className="mt-2 grid gap-2 md:grid-cols-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-700">Valore:</span>
                                    <span>
                                      {metric.value ?? '—'} {metric.unit ?? ''}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-700">Target:</span>
                                    <span>{metric.metric_target ?? '—'}</span>
                                  </div>
                                </div>
                                {metric.notes && <p className="mt-3 text-xs text-slate-500">{metric.notes}</p>}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ListBulletIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-3 w-3"
    >
      <path d="M8.25 5.25h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1 0-1.5Zm0 6h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1 0-1.5Zm0 6h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1 0-1.5ZM5 6.5A1.5 1.5 0 1 1 2.5 5 1.5 1.5 0 0 1 5 6.5Zm0 6A1.5 1.5 0 1 1 2.5 11 1.5 1.5 0 0 1 5 12.5Zm0 6A1.5 1.5 0 1 1 2.5 17 1.5 1.5 0 0 1 5 18.5Z" />
    </svg>
  );
}
