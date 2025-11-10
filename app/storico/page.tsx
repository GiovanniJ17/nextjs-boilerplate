'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock3,
  Droplets,
  FileText,
  Filter,
  FolderKanban,
  Gauge,
  Loader2,
  MapPin,
  NotebookText,
  Search,
  Sparkles,
  Target,
  Weight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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

const sessionTypeOptions = [
  { value: '', label: 'Tutte le sessioni' },
  { value: 'pista', label: 'Allenamenti in pista' },
  { value: 'palestra', label: 'Palestra / forza' },
  { value: 'test', label: 'Test' },
  { value: 'scarico', label: 'Scarico' },
  { value: 'recupero', label: 'Recupero' },
  { value: 'altro', label: 'Altro' },
];

const smartRangeOptions = [
  { key: '14', label: 'Ultimi 14 giorni', days: 14 },
  { key: '42', label: 'Ultime 6 settimane', days: 42 },
  { key: '90', label: 'Ultimi 90 giorni', days: 90 },
];

const sessionTypeTokens: Record<string, { bg: string; text: string }> = {
  pista: { bg: 'bg-sky-100', text: 'text-sky-600' },
  palestra: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  test: { bg: 'bg-amber-100', text: 'text-amber-600' },
  scarico: { bg: 'bg-purple-100', text: 'text-purple-600' },
  recupero: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  altro: { bg: 'bg-slate-200', text: 'text-slate-600' },
};

const quickSearches = [
  { label: 'Ultimi test', query: 'test' },
  { label: 'Note con "gara"', query: 'gara' },
  { label: 'Sessioni in pista', query: 'pista' },
  { label: 'Forza', query: 'forza' },
];

const metricCategoryLabels: Record<string, string> = {
  prestazione: 'Prestazione',
  fisico: 'Fisico',
  recupero: 'Recupero',
  test: 'Test',
  altro: 'Altro',
};

const metricCategoryTokens: Record<string, { bg: string; text: string }> = {
  prestazione: { bg: 'bg-sky-100', text: 'text-sky-600' },
  fisico: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  recupero: { bg: 'bg-purple-100', text: 'text-purple-600' },
  test: { bg: 'bg-amber-100', text: 'text-amber-600' },
  altro: { bg: 'bg-slate-200', text: 'text-slate-600' },
};

const metricCategoryIconsMap: Record<string, LucideIcon> = {
  prestazione: BarChart3,
  fisico: Weight,
  recupero: Droplets,
  test: Target,
  altro: FileText,
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
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [blockFilter, setBlockFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [activeQuickSearch, setActiveQuickSearch] = useState<string | null>(null);
  const [activeSmartRange, setActiveSmartRange] = useState<string>('');

  useEffect(() => {
    void loadBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!search.trim()) {
      setActiveQuickSearch(null);
    }
  }, [search]);

  async function loadBlocks() {
    const { data, error } = await supabase
      .from('training_blocks')
      .select('id, name, start_date, end_date')
      .order('start_date', { ascending: false });

    if (!error && data) {
      setBlocks(data as TrainingBlock[]);
    }
  }

  const loadSessions = useCallback(async () => {
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
  }, [blockFilter, fromDate, toDate, typeFilter]);

  const historicalStats = useMemo(() => {
    if (sessions.length === 0) {
      return {
        totalVolume: 0,
        totalExercises: 0,
        testsCount: 0,
        uniqueLocations: 0,
        averageRpe: null as number | null,
      };
    }

    let totalVolume = 0;
    let totalExercises = 0;
    let testsCount = 0;
    const locationSet = new Set<string>();
    const rpeValues: number[] = [];

    sessions.forEach(session => {
      if (session.type === 'test') testsCount += 1;
      if (session.location) locationSet.add(session.location);
      totalExercises += session.exercises?.length ?? 0;
      session.exercises.forEach(exercise => {
        const distance = exercise.distance_m || 0;
        const sets = exercise.sets || 0;
        const reps = exercise.repetitions || 0;
        if (distance && sets && reps) {
          totalVolume += distance * sets * reps;
        }
        exercise.results.forEach(result => {
          if (result.rpe != null) {
            rpeValues.push(result.rpe);
          }
        });
      });
    });

    const averageRpe =
      rpeValues.length > 0
        ? Math.round((rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length) * 10) / 10
        : null;

    return { totalVolume, totalExercises, testsCount, uniqueLocations: locationSet.size, averageRpe };
  }, [sessions]);

  const focusStats = useMemo(() => {
    if (sessions.length === 0) {
      return null;
    }

    const disciplineCounter = new Map<string, number>();
    let intensitySum = 0;
    let intensityCount = 0;
    let exercisesTotal = 0;

    for (const session of sessions) {
      for (const exercise of session.exercises) {
        const key = exercise.discipline_type ?? 'altro';
        disciplineCounter.set(key, (disciplineCounter.get(key) ?? 0) + 1);
        exercisesTotal += 1;
        if (exercise.intensity != null) {
          intensitySum += Number(exercise.intensity);
          intensityCount += 1;
        }
      }
    }

    const [primaryDiscipline] = Array.from(disciplineCounter.entries()).sort((a, b) => b[1] - a[1]);

    return {
      totalExercises: exercisesTotal,
      focusDiscipline: primaryDiscipline ? humanDiscipline(primaryDiscipline[0]) : null,
      avgIntensity: intensityCount > 0 ? intensitySum / intensityCount : null,
    };
  }, [sessions]);

  const heroStats = useMemo(
    () => [
      {
        icon: BarChart3,
        label: 'Volume registrato',
        value:
          historicalStats.totalVolume > 0
            ? `${historicalStats.totalVolume.toLocaleString('it-IT')} m`
            : '—',
      },
      {
        icon: Activity,
        label: 'Esercizi catalogati',
        value: historicalStats.totalExercises.toLocaleString('it-IT'),
      },
      {
        icon: NotebookText,
        label: 'Focus predominante',
        value: focusStats?.focusDiscipline ?? '—',
      },
      {
        icon: Sparkles,
        label: 'Sessioni test',
        value: historicalStats.testsCount.toLocaleString('it-IT'),
      },
      {
        icon: Gauge,
        label: 'Intensità media',
        value:
          typeof focusStats?.avgIntensity === 'number'
            ? `${focusStats.avgIntensity.toFixed(1)}/10`
            : '—',
      },
      {
        icon: Droplets,
        label: 'RPE medio',
        value: historicalStats.averageRpe ? historicalStats.averageRpe.toFixed(1) : '—',
      },
      {
        icon: MapPin,
        label: 'Luoghi diversi',
        value: historicalStats.uniqueLocations.toLocaleString('it-IT'),
      },
    ],
    [focusStats, historicalStats]
  );

  function applySmartRange(rangeKey: string) {
    const option = smartRangeOptions.find(range => range.key === rangeKey);
    if (!option) {
      setActiveSmartRange('');
      return;
    }

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - option.days + 1);

    setFromDate(start.toISOString().slice(0, 10));
    setToDate(end.toISOString().slice(0, 10));
    setActiveSmartRange(rangeKey);
  }

  function handleFromDateChange(value: string) {
    setFromDate(value);
    setActiveSmartRange('');
  }

  function handleToDateChange(value: string) {
    setToDate(value);
    setActiveSmartRange('');
  }

  function resetFilters() {
    setFromDate('');
    setToDate('');
    setTypeFilter('');
    setBlockFilter('');
    setSearch('');
    setActiveQuickSearch(null);
    setActiveSmartRange('');
    void loadSessions();
  }

  function handleQuickSearch(query: string) {
    setSearch(query);
    setActiveQuickSearch(query);
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
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {heroStats.map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
                <div className="flex items-center justify-between text-white/80">
                  <span className="text-xs uppercase tracking-widest text-white/60">{stat.label}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      <Card className="border-none shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
            <Filter className="h-5 w-5 text-sky-600" /> Filtri avanzati
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <span className="font-semibold text-slate-600">Intervalli rapidi</span>
            {smartRangeOptions.map(option => {
              const isActive = activeSmartRange === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => applySmartRange(option.key)}
                  className={cn(
                    'rounded-full border px-3 py-1 font-medium transition',
                    isActive
                      ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                      : 'border-transparent bg-white text-slate-600 hover:border-sky-200'
                  )}
                  aria-pressed={isActive}
                >
                  {option.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setActiveSmartRange('');
                setFromDate('');
                setToDate('');
              }}
              className="rounded-full border border-transparent px-3 py-1 font-medium text-slate-500 transition hover:border-slate-200 hover:bg-white"
            >
              Rimuovi preset
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Da</Label>
              <Input type="date" value={fromDate} onChange={event => handleFromDateChange(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">A</Label>
              <Input type="date" value={toDate} onChange={event => handleToDateChange(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Tipo sessione</Label>
              <div className="flex flex-wrap gap-2">
                {sessionTypeOptions.map(option => {
                  const isActive = typeFilter === option.value;
                  return (
                    <button
                      key={option.value || 'all'}
                      type="button"
                      onClick={() => setTypeFilter(prev => (prev === option.value ? '' : option.value))}
                      className={cn(
                        'rounded-full border px-3 py-1 text-[11px] font-medium transition',
                        isActive
                          ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200'
                      )}
                      aria-pressed={isActive}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Blocco</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBlockFilter('')}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[11px] font-medium transition',
                    !blockFilter
                      ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200'
                  )}
                  aria-pressed={!blockFilter}
                >
                  Tutti i blocchi
                </button>
                {blocks.map(block => {
                  const isSelected = blockFilter === block.id;
                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => setBlockFilter(prev => (prev === block.id ? '' : block.id ?? ''))}
                      className={cn(
                        'rounded-full border px-3 py-1 text-[11px] font-medium transition',
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200'
                      )}
                      aria-pressed={isSelected}
                    >
                      {block.name ?? 'Blocco senza nome'}
                    </button>
                  );
                })}
              </div>
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
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="font-medium">Ricerche rapide:</span>
            {quickSearches.map(quick => {
              const isActive = activeQuickSearch === quick.query;
              return (
                <button
                  key={quick.label}
                  type="button"
                  onClick={() => handleQuickSearch(quick.query)}
                  className={cn(
                    'rounded-full border px-3 py-1 transition',
                    isActive
                      ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-sky-200 hover:text-sky-600'
                  )}
                  aria-pressed={isActive}
                >
                  {quick.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
            <FolderKanban className="h-5 w-5 text-sky-600" /> Storico sessioni
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Vista</span>
            {[
              { value: 'list' as const, label: 'Compatta' },
              { value: 'timeline' as const, label: 'Timeline' },
            ].map(option => {
              const isActive = viewMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setViewMode(option.value)}
                  className={cn(
                    'rounded-full border px-3 py-1 font-medium transition',
                    isActive
                      ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-sky-200 hover:text-sky-600'
                  )}
                  aria-pressed={isActive}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
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
            

            <div className="space-y-4">
              {filteredSessions.map(session => {
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
                const allResults = session.exercises.flatMap(exercise => exercise.results ?? []);
                const timeValues = allResults
                  .map(result => (result.time_s != null ? Number(result.time_s) : null))
                  .filter((value): value is number => value != null && Number.isFinite(value));
                const weightValues = allResults
                  .map(result => (result.weight_kg != null ? Number(result.weight_kg) : null))
                  .filter((value): value is number => value != null && Number.isFinite(value));
                const rpeValues = allResults
                  .map(result => (result.rpe != null ? Number(result.rpe) : null))
                  .filter((value): value is number => value != null && Number.isFinite(value));
                const bestTime = timeValues.length > 0 ? Math.min(...timeValues) : null;
                const bestWeight = weightValues.length > 0 ? Math.max(...weightValues) : null;
                const averageRpeSession =
                  rpeValues.length > 0
                    ? Math.round((rpeValues.reduce((sum, value) => sum + value, 0) / rpeValues.length) * 10) / 10
                    : null;

                const highlightBadges = [] as { icon: LucideIcon; label: string; value: string }[];
                if (bestTime != null) {
                  highlightBadges.push({ icon: Clock3, label: 'Miglior tempo', value: `${bestTime.toFixed(2)}s` });
                }
                if (bestWeight != null) {
                  highlightBadges.push({ icon: Weight, label: 'Carico massimo', value: `${bestWeight.toFixed(1)}kg` });
                }
                if (averageRpeSession != null) {
                  highlightBadges.push({ icon: Gauge, label: 'RPE medio', value: averageRpeSession.toFixed(1) });
                }

                const disciplineBadges = (() => {
                  const map = new Map<string, number>();
                  session.exercises.forEach(exercise => {
                    const key = exercise.discipline_type ?? 'altro';
                    map.set(key, (map.get(key) ?? 0) + 1);
                  });

                  return Array.from(map.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 2)
                    .map(([key, count]) => ({ key, label: humanDiscipline(key), count }));
                })();

                const typeToken = session.type ? sessionTypeTokens[session.type] : undefined;
                const typeLabel =
                  sessionTypeOptions.find(option => option.value === session.type)?.label ?? 'Sessione registrata';

                return (
                  <div
                    key={session.id}
                    className={cn(
                      'group',
                      viewMode === 'timeline' &&
                        "relative pl-6 before:absolute before:left-[12px] before:top-0 before:h-full before:w-px before:bg-slate-200 before:content-['']"
                    )}
                  >
                    {viewMode === 'timeline' && (
                      <span className="absolute left-[7px] top-8 h-3 w-3 rounded-full border-2 border-white bg-sky-500 shadow transition group-hover:scale-110" />
                    )}
                    <div className={cn('rounded-3xl border border-slate-200 bg-white shadow-sm transition', viewMode === 'timeline' && 'ml-4')}>
                      <button
                        type="button"
                        onClick={() => toggleSession(session.id)}
                        className="flex w-full items-center justify-between gap-4 rounded-3xl px-5 py-4 text-left transition hover:bg-slate-50"
                      >
                        <div className="flex flex-1 flex-col gap-3">
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                              <Calendar className="h-3 w-3" /> {formatDate(session.date)}
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {highlightBadges.map(badge => {
                                const Icon = badge.icon;
                                return (
                                  <span
                                    key={badge.label}
                                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                                  >
                                    <Icon className="h-3 w-3" /> {badge.value}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                            <span
                              className={cn(
                                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs',
                                typeToken ? `${typeToken.bg} ${typeToken.text}` : 'bg-slate-200 text-slate-600'
                              )}
                            >
                              <Activity className="h-3 w-3" /> {typeLabel}
                            </span>
                            {session.phase && (
                              <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-600">
                                <Target className="h-3 w-3" /> {session.phase}
                              </span>
                            )}
                            {session.block?.name && (
                              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-600">
                                <FolderKanban className="h-3 w-3" /> {session.block.name}
                              </span>
                            )}
                          </div>
                          {disciplineBadges.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              {disciplineBadges.map(badge => (
                                <span
                                  key={badge.key}
                                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600"
                                >
                                  <Sparkles className="h-3 w-3 text-sky-500" /> {badge.label}
                                  <span className="text-slate-400">×{badge.count}</span>
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            {session.location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {session.location}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Activity className="h-3 w-3" /> {totalExercises} esercizi
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <BarChart3 className="h-3 w-3" />
                              {totalVolume ? `${totalVolume.toLocaleString('it-IT')} m` : 'Volume n/d'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <FileText className="h-3 w-3" /> {totalMetrics} metriche
                            </span>
                          </div>
                          {session.notes && <p className="text-sm text-slate-600 line-clamp-2">{session.notes}</p>}
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
                                session.exercises.map(exercise => {
                                  const disciplineLabel = humanDiscipline(exercise.discipline_type);
                                  const effortLabel = formatEffort(exercise.effort_type);
                                  return (
                                    <div
                                      key={exercise.id}
                                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600"
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-2 text-sm font-semibold text-slate-700">
                                        <div>
                                          <p>{exercise.name ?? 'Esercizio'}</p>
                                          <p className="text-[11px] text-slate-500">{disciplineLabel}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                          {exercise.intensity && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-medium text-slate-600">
                                              <Gauge className="h-3 w-3" /> {exercise.intensity}/10 {effortLabel !== '—' && `(${effortLabel})`}
                                            </span>
                                          )}
                                          {formatDistance(exercise) !== '—' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-medium text-slate-600">
                                              <BarChart3 className="h-3 w-3" /> {formatDistance(exercise)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                                        <div className="rounded-xl bg-white px-3 py-2">
                                          <p className="text-[10px] uppercase text-slate-500">Serie × Ripetizioni</p>
                                          <p className="text-sm font-semibold text-slate-700">
                                            {exercise.sets ?? '—'} × {exercise.repetitions ?? '—'}
                                          </p>
                                        </div>
                                        <div className="rounded-xl bg-white px-3 py-2">
                                          <p className="text-[10px] uppercase text-slate-500">Recuperi</p>
                                          <p className="text-sm font-semibold text-slate-700">
                                            {exercise.rest_between_reps_s ?? '—'}s / {exercise.rest_between_sets_s ?? '—'}s
                                          </p>
                                        </div>
                                      </div>
                                      {exercise.notes && <p className="mt-3 text-xs text-slate-500">{exercise.notes}</p>}

                                      {exercise.results.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                          <p className="text-[11px] font-semibold uppercase text-slate-500">Risultati</p>
                                          <div className="grid gap-2 md:grid-cols-2">
                                            {exercise.results.map(result => {
                                              const resultItems: { label: string; value: string }[] = [];
                                              if (result.time_s != null) {
                                                resultItems.push({ label: 'Tempo', value: `${result.time_s}s` });
                                              }
                                              if (result.weight_kg != null) {
                                                resultItems.push({ label: 'Carico', value: `${result.weight_kg}kg` });
                                              }
                                              if (result.repetition_number != null) {
                                                resultItems.push({ label: 'Ripetizione', value: `#${result.repetition_number}` });
                                              }

                                              return (
                                                <div
                                                  key={result.id}
                                                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500"
                                                >
                                                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                                    <span>Tentativo #{result.attempt_number ?? '—'}</span>
                                                    {result.rpe != null && (
                                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-600">
                                                        <Gauge className="h-3 w-3" /> RPE {result.rpe}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="mt-2 grid grid-cols-2 gap-2">
                                                    {resultItems.map(item => (
                                                      <span
                                                        key={item.label}
                                                        className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600"
                                                      >
                                                        {item.label}: {item.value}
                                                      </span>
                                                    ))}
                                                  </div>
                                                  {result.notes && (
                                                    <p className="mt-2 text-[10px] text-slate-500">Note: {result.notes}</p>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            <div className="space-y-3">
                              <h3 className="text-sm font-semibold text-slate-700">Metriche collegate</h3>
                              {session.metrics.length === 0 ? (
                                <p className="text-xs text-slate-500">Nessuna metrica associata.</p>
                              ) : (
                                session.metrics.map(metric => {
                                  const categoryKey = metric.category ?? 'altro';
                                  const token = metricCategoryTokens[categoryKey] ?? metricCategoryTokens.altro;
                                  const CategoryIcon = metricCategoryIconsMap[categoryKey] ?? FileText;
                                  return (
                                    <div
                                      key={metric.id}
                                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600"
                                    >
                                      <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                                        <span>{metric.metric_name ?? 'Metrica'}</span>
                                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', token.bg, token.text)}>
                                          <CategoryIcon className="h-3 w-3" /> {metricCategoryLabels[categoryKey] ?? 'Altro'}
                                        </span>
                                      </div>
                                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                                          <p className="text-[10px] uppercase text-slate-500">Valore</p>
                                          <p className="text-sm font-semibold text-slate-700">
                                            {metric.value ?? '—'} {metric.unit ?? ''}
                                          </p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                                          <p className="text-[10px] uppercase text-slate-500">Target</p>
                                          <p className="text-sm font-semibold text-slate-700">{metric.metric_target ?? '—'}</p>
                                        </div>
                                      </div>
                                      {metric.notes && <p className="mt-3 text-xs text-slate-500">{metric.notes}</p>}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function toastError() {
  if (typeof window !== 'undefined') {
    import('sonner').then(module => module.toast.error('Impossibile recuperare lo storico.'));
  }
}
