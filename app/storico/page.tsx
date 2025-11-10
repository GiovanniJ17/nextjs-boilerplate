'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock3,
  Dumbbell,
  Filter,
  Loader2,
  MapPin,
  NotebookPen,
  Sparkles,
  Target,
  Weight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

type TrainingBlock = {
  id: string;
  name: string | null;
  start_date: string | null;
  end_date: string | null;
};

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
  intensity: number | null;
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

type RangeOption = {
  label: string;
  days: number;
};

const sessionTypeChips: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: '', label: 'Tutte', icon: Sparkles },
  { value: 'pista', label: 'Pista', icon: Activity },
  { value: 'palestra', label: 'Palestra', icon: Dumbbell },
  { value: 'test', label: 'Test', icon: Target },
  { value: 'scarico', label: 'Scarico', icon: Clock3 },
  { value: 'recupero', label: 'Recupero', icon: Sparkles },
  { value: 'altro', label: 'Altro', icon: NotebookPen },
];

const rangeOptions: RangeOption[] = [
  { label: 'Ultimi 7 giorni', days: 7 },
  { label: 'Ultimi 30 giorni', days: 30 },
  { label: 'Ultimi 90 giorni', days: 90 },
];

const metricCategoryLabels: Record<string, { label: string; icon: LucideIcon }> = {
  prestazione: { label: 'Prestazione', icon: BarChart3 },
  fisico: { label: 'Fisico', icon: Weight },
  recupero: { label: 'Recupero', icon: Clock3 },
  test: { label: 'Test', icon: Target },
  altro: { label: 'Altro', icon: NotebookPen },
};

function formatDate(date: string | null) {
  if (!date) return 'Data non disponibile';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

function formatDiscipline(discipline: string | null) {
  switch (discipline) {
    case 'sprint':
      return 'Sprint';
    case 'forza':
      return 'Forza';
    case 'mobilità':
      return 'Mobilità';
    case 'tecnica':
      return 'Tecnica';
    default:
      return 'Altro';
  }
}

function FilterChip({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition',
        active
          ? 'border-sky-500 bg-sky-50 text-sky-700'
          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-600'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function StoricoPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedRange, setSelectedRange] = useState<RangeOption | null>(rangeOptions[1]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      const { data, error } = await supabase
        .from('training_sessions')
        .select(
          `id, date, type, phase, location, notes,
          training_blocks(id, name, start_date, end_date),
          exercises(id, name, discipline_type, distance_m, sets, repetitions, intensity, notes, exercise_results(id, attempt_number, repetition_number, time_s, weight_kg, rpe, notes)),
          metrics(id, metric_name, category, metric_target, value, unit)`
        )
        .order('date', { ascending: false });

      if (error) {
        toastError();
        setLoading(false);
        return;
      }

      const mapped = (data ?? []).map(session => ({
        id: session.id,
        date: session.date,
        type: session.type,
        phase: session.phase,
        location: session.location,
        notes: session.notes,
        block: Array.isArray(session.training_blocks) ? session.training_blocks[0] ?? null : session.training_blocks,
        exercises: (session.exercises ?? []).map((exercise: any) => ({
          ...exercise,
          results: exercise.exercise_results ?? [],
        })),
        metrics: session.metrics ?? [],
      }));

      setSessions(mapped);
      setLoading(false);
    }

    loadSessions();
  }, []);

  const filteredSessions = useMemo(() => {
    const reference = selectedRange
      ? new Date(Date.now() - selectedRange.days * 24 * 60 * 60 * 1000)
      : null;

    return sessions.filter(session => {
      if (selectedType && session.type !== selectedType) return false;
      if (reference && session.date) {
        const sessionDate = new Date(session.date);
        if (sessionDate < reference) return false;
      }
      if (!search.trim()) return true;

      const term = search.toLowerCase();
      const matchNotes = session.notes?.toLowerCase().includes(term);
      const matchBlock = session.block?.name?.toLowerCase().includes(term);
      const matchExercise = session.exercises.some(exercise =>
        (exercise.name ?? '').toLowerCase().includes(term) ||
        (exercise.notes ?? '').toLowerCase().includes(term)
      );
      const matchMetric = session.metrics.some(metric =>
        (metric.metric_name ?? '').toLowerCase().includes(term) ||
        (metric.metric_target ?? '').toLowerCase().includes(term)
      );
      return matchNotes || matchBlock || matchExercise || matchMetric;
    });
  }, [sessions, selectedType, selectedRange, search]);

  const quickStats = useMemo(() => {
    const totalSessions = filteredSessions.length;
    const disciplineSpread = new Map<string, number>();
    let registeredResults = 0;

    filteredSessions.forEach(session => {
      session.exercises.forEach(exercise => {
        const key = formatDiscipline(exercise.discipline_type);
        disciplineSpread.set(key, (disciplineSpread.get(key) ?? 0) + 1);
        registeredResults += exercise.results.length;
      });
    });

    const sortedDiscipline = Array.from(disciplineSpread.entries()).sort((a, b) => b[1] - a[1]);

    return {
      totalSessions,
      registeredResults,
      topDisciplines: sortedDiscipline.slice(0, 3),
    };
  }, [filteredSessions]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Storico allenamenti</h1>
        <p className="text-sm text-slate-500">
          Rivedi ogni sessione con riepiloghi chiari di esercizi, risultati e metriche collegate. Usa i filtri rapidi per
          trovare ciò che ti serve in pochi tocchi.
        </p>
      </header>

      <Card className="border-none bg-slate-900 text-white">
        <CardHeader>
          <CardTitle className="text-base">Panoramica rapida</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-300">Sessioni nel filtro</p>
            <p className="text-2xl font-semibold">{quickStats.totalSessions}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Risultati registrati</p>
            <p className="text-2xl font-semibold">{quickStats.registeredResults}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Discipline più frequenti</p>
            <p className="text-sm text-slate-200">
              {quickStats.topDisciplines.length > 0
                ? quickStats.topDisciplines.map(item => `${item[0]} (${item[1]})`).join(' · ')
                : '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Filter className="h-4 w-4 text-sky-600" /> Filtra la cronologia
          </div>
          <div className="flex flex-wrap gap-2">
            {sessionTypeChips.map(option => (
              <FilterChip
                key={option.value}
                label={option.label}
                icon={option.icon}
                active={selectedType === option.value}
                onClick={() => setSelectedType(prev => (prev === option.value ? '' : option.value))}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-slate-500">Intervallo smart</Label>
              <div className="flex flex-wrap gap-2">
                {rangeOptions.map(option => (
                  <Button
                    key={option.label}
                    type="button"
                    variant={selectedRange?.label === option.label ? 'default' : 'outline'}
                    className={cn(
                      'rounded-full text-sm',
                      selectedRange?.label === option.label
                        ? 'bg-sky-600 hover:bg-sky-700'
                        : 'border-slate-200 text-slate-600'
                    )}
                    onClick={() => setSelectedRange(prev => (prev?.label === option.label ? null : option))}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-slate-500">Cerca</Label>
              <Input
                placeholder="Cerca per esercizio, blocco, note..."
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Caricamento storico...
          </div>
        )}

        {!loading && filteredSessions.length === 0 && (
          <Card className="border-none shadow-sm">
            <CardContent className="py-10 text-center text-sm text-slate-500">
              Nessuna sessione trovata con i filtri attuali.
            </CardContent>
          </Card>
        )}

        {filteredSessions.map(session => {
          const isOpen = expandedSession === session.id;
          const totalExercises = session.exercises.length;
          const totalMetrics = session.metrics.length;
          const totalResults = session.exercises.reduce((acc, exercise) => acc + exercise.results.length, 0);

          return (
            <Card key={session.id} className="border border-slate-200/70 shadow-sm">
              <CardHeader className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-slate-500">{formatDate(session.date)}</p>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {session.type ? session.type.charAt(0).toUpperCase() + session.type.slice(1) : 'Sessione'}
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1 border-none bg-transparent text-slate-600 hover:bg-slate-100"
                    onClick={() => setExpandedSession(prev => (prev === session.id ? null : session.id))}
                  >
                    {isOpen ? (
                      <>
                        Nascondi dettagli <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Vedi dettagli <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                  {session.location && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-sky-600">
                      <MapPin className="h-3.5 w-3.5" /> {session.location.replace('-', ' ')}
                    </span>
                  )}
                  {session.phase && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">
                      <Sparkles className="h-3.5 w-3.5" /> {session.phase}
                    </span>
                  )}
                  {session.block?.name && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-600">
                      <Calendar className="h-3.5 w-3.5" /> {session.block.name}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    <Activity className="h-3.5 w-3.5" /> {totalExercises} esercizi
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    <BarChart3 className="h-3.5 w-3.5" /> {totalResults} risultati
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    <Target className="h-3.5 w-3.5" /> {totalMetrics} metriche
                  </span>
                </div>

                {session.notes && <p className="text-sm text-slate-600">{session.notes}</p>}
              </CardHeader>

              {isOpen && (
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700">Esercizi</h4>
                    <div className="space-y-3">
                      {session.exercises.map(exercise => (
                        <div key={exercise.id} className="rounded-xl border border-slate-200/80 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <div className="font-medium text-slate-800">{exercise.name ?? 'Esercizio'}</div>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-600">
                                {formatDiscipline(exercise.discipline_type)}
                              </span>
                              {exercise.distance_m && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                  {exercise.distance_m} m
                                </span>
                              )}
                              {exercise.sets && exercise.repetitions && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                  {exercise.sets}x{exercise.repetitions}
                                </span>
                              )}
                              {exercise.intensity && (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                  Intensità {exercise.intensity}
                                </span>
                              )}
                            </div>
                          </div>
                          {exercise.notes && <p className="mt-2 text-xs text-slate-500">{exercise.notes}</p>}

                          {exercise.results.length > 0 && (
                            <div className="mt-3 grid gap-2 md:grid-cols-2">
                              {exercise.results.map(result => (
                                <div key={result.id} className="rounded-lg border border-slate-200/70 p-2 text-xs text-slate-600">
                                  <div className="flex flex-wrap gap-2">
                                    {result.repetition_number && (
                                      <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                        Rip {result.repetition_number}
                                      </span>
                                    )}
                                    {typeof result.time_s === 'number' && (
                                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-600">
                                        {result.time_s}s
                                      </span>
                                    )}
                                    {typeof result.weight_kg === 'number' && (
                                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600">
                                        {result.weight_kg}kg
                                      </span>
                                    )}
                                    {typeof result.rpe === 'number' && (
                                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600">
                                        RPE {result.rpe}
                                      </span>
                                    )}
                                  </div>
                                  {result.notes && <p className="mt-1 text-[11px] text-slate-500">{result.notes}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {session.metrics.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-700">Metriche collegate</h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        {session.metrics.map(metric => {
                          const categoryKey = metric.category as keyof typeof metricCategoryLabels | null;
                          const category = categoryKey ? metricCategoryLabels[categoryKey] : undefined;
                          const Icon = category?.icon ?? BarChart3;
                          return (
                            <div key={metric.id} className="rounded-xl border border-slate-200/80 p-3">
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <Icon className="h-4 w-4 text-sky-600" /> {metric.metric_name ?? 'Metrica'}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                {metric.metric_target && (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1">{metric.metric_target}</span>
                                )}
                                {metric.value !== null && (
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-600">
                                    {metric.value} {metric.unit ?? ''}
                                  </span>
                                )}
                                {category && (
                                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-600">
                                    {category.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function toastError() {
  if (typeof window !== 'undefined') {
    import('sonner').then(module => module.toast.error('Impossibile recuperare lo storico.'));
  }
}
