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

type Exercise = {
  id: string;
  name: string | null;
  category: string | null;
  distance_m: number | null;
  sets: number | null;
  reps: number | null;
  rest_between_reps_s: number | null;
  rest_between_sets_s: number | null;
  intensity: number | null;
  effort: string | null;
  time_s: number | null;
  weight_kg: number | null;
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
};

const sessionTypeOptions = [
  { value: '', label: 'Tutte le sessioni' },
  { value: 'pista', label: 'Allenamenti in pista' },
  { value: 'palestra', label: 'Palestra / forza' },
  { value: 'test', label: 'Test' },
  { value: 'scarico', label: 'Scarico' },
  { value: 'altro', label: 'Altro' },
];

const sessionTypeTokens: Record<string, { bg: string; text: string }> = {
  pista: { bg: 'bg-sky-100', text: 'text-sky-600' },
  palestra: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  test: { bg: 'bg-amber-100', text: 'text-amber-600' },
  scarico: { bg: 'bg-purple-100', text: 'text-purple-600' },
  altro: { bg: 'bg-slate-200', text: 'text-slate-600' },
};

const smartRangeOptions = [
  { key: '14', label: 'Ultimi 14 giorni', days: 14 },
  { key: '42', label: 'Ultime 6 settimane', days: 42 },
  { key: '90', label: 'Ultimi 90 giorni', days: 90 },
];

const quickSearches = [
  { label: 'Ultimi test', query: 'test' },
  { label: 'Note con "gara"', query: 'gara' },
  { label: 'Sessioni in pista', query: 'pista' },
  { label: 'Forza', query: 'forza' },
];

function formatDate(date: string | null) {
  if (!date) return 'Data non disponibile';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

function formatDistance(exercise: Exercise) {
  const distance = exercise.distance_m || 0;
  const sets = exercise.sets || 0;
  const reps = exercise.reps || 0;
  if (!distance || !sets || !reps) return '—';
  const total = distance * sets * reps;
  return `${total.toLocaleString('it-IT')} m totali`;
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
  const [activeQuickSearch, setActiveQuickSearch] = useState<string | null>(null);
  const [activeSmartRange, setActiveSmartRange] = useState<string>('');

  const loadSessions = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('training_sessions')
      .select(
        `id, date, type, phase, location, notes, block_id,
         block:training_blocks (id, name, start_date, end_date),
         exercises:training_exercises (
           id, name, category, distance_m, sets, reps, rest_between_reps_s, rest_between_sets_s, intensity, effort, time_s, weight_kg, notes
         )
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
        exercises: session.exercises || [],
      }));
      setSessions(casted);
    }

    setLoading(false);
  }, [blockFilter, fromDate, toDate, typeFilter]);

  useEffect(() => {
    void loadBlocks();
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function loadBlocks() {
    const { data, error } = await supabase
      .from('training_blocks')
      .select('id, name, start_date, end_date')
      .order('start_date', { ascending: false });

    if (!error && data) {
      setBlocks(data as TrainingBlock[]);
    }
  }

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions;
    const query = search.trim().toLowerCase();
    return sessions.filter(session => {
      const matchesNotes = session.notes?.toLowerCase().includes(query);
      const matchesType = session.type?.toLowerCase().includes(query);
      const matchesExercises = session.exercises.some(exercise =>
        (exercise.name ?? '').toLowerCase().includes(query)
      );
      return matchesNotes || matchesType || matchesExercises;
    });
  }, [search, sessions]);

  const historicalStats = useMemo(() => {
    if (sessions.length === 0) {
      return {
        totalVolume: 0,
        totalExercises: 0,
        testsCount: 0,
        uniqueLocations: 0,
        averageTime: null as number | null,
      };
    }

    let totalVolume = 0;
    let totalExercises = 0;
    let testsCount = 0;
    const locationSet = new Set<string>();
    const timeValues: number[] = [];

    sessions.forEach(session => {
      if (session.type === 'test') testsCount += 1;
      if (session.location) locationSet.add(session.location);
      totalExercises += session.exercises?.length ?? 0;
      session.exercises.forEach(exercise => {
        const distance = exercise.distance_m || 0;
        const sets = exercise.sets || 0;
        const reps = exercise.reps || 0;
        if (distance && sets && reps) {
          totalVolume += distance * sets * reps;
        }
        if (typeof exercise.time_s === 'number' && !Number.isNaN(exercise.time_s)) {
          timeValues.push(exercise.time_s);
        }
      });
    });

    const averageTime =
      timeValues.length > 0
        ? Math.round((timeValues.reduce((sum, value) => sum + value, 0) / timeValues.length) * 100) / 100
        : null;

    return { totalVolume, totalExercises, testsCount, uniqueLocations: locationSet.size, averageTime };
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
        const key = exercise.category ?? 'altro';
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
        icon: Clock3,
        label: 'Tempo medio',
        value: historicalStats.averageTime ? `${historicalStats.averageTime.toFixed(2)}s` : '—',
      },
      {
        icon: MapPin,
        label: 'Luoghi diversi',
        value: historicalStats.uniqueLocations.toLocaleString('it-IT'),
      },
    ],
    [focusStats, historicalStats]
  );

  function toggleSession(sessionId: string) {
    setOpenSession(prev => (prev === sessionId ? null : sessionId));
  }

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

  function handleQuickSearch(value: string, label: string) {
    if (search === value) {
      setSearch('');
      setActiveQuickSearch(null);
      return;
    }
    setSearch(value);
    setActiveQuickSearch(label);
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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
              <BarChart3 className="h-4 w-4" /> Storico Allenamenti
            </div>
            <h1 className="text-3xl font-semibold">Rivivi le tue sessioni migliori</h1>
            <p className="max-w-xl text-sm text-white/75">
              Consulta blocchi, dettagli tecnici e risultati principali delle sessioni precedenti. Filtra per periodo,
              tipologia e focus per trovare subito l&apos;allenamento che ti serve.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 px-6 py-5 text-center">
            <p className="text-xs uppercase tracking-widest text-white/60">Sessioni archiviate</p>
            <p className="text-4xl font-semibold">{sessions.length}</p>
            <p className="text-xs text-white/60">ultimo caricamento</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {heroStats.map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
                <div className="flex items-center justify-between text-white/75">
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
            <Filter className="h-5 w-5 text-sky-600" /> Filtri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <span className="font-semibold text-slate-600">Intervallo rapido</span>
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
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Dal</Label>
              <Input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Al</Label>
              <Input type="date" value={toDate} onChange={event => setToDate(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Tipologia</Label>
              <div className="flex flex-wrap gap-2">
                {sessionTypeOptions.map(option => {
                  const selected = typeFilter === option.value;
                  const token = sessionTypeTokens[option.value];
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTypeFilter(prev => (prev === option.value ? '' : option.value))}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition',
                        selected
                          ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200'
                      )}
                      aria-pressed={selected}
                    >
                      {token ? (
                        <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full', token.bg, token.text)}>
                          {option.label.slice(0, 1)}
                        </span>
                      ) : null}
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
                    blockFilter === ''
                      ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200'
                  )}
                >
                  Tutti
                </button>
                {blocks.map(block => {
                  const isActive = blockFilter === block.id;
                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => setBlockFilter(prev => (prev === block.id ? '' : block.id))}
                      className={cn(
                        'rounded-full border px-3 py-1 text-[11px] font-medium transition',
                        isActive
                          ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200'
                      )}
                      aria-pressed={isActive}
                    >
                      {block.name ?? 'Blocco'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Label className="text-xs font-semibold text-slate-600">Ricerca</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    className="pl-8"
                    placeholder="Cerca per note, esercizi o tipologia"
                  />
                </div>
                <Button variant="outline" onClick={resetFilters}>
                  Azzera filtri
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {quickSearches.map(item => {
                  const isActive = activeQuickSearch === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleQuickSearch(item.query, item.label)}
                      className={cn(
                        'rounded-full border px-3 py-1 font-medium transition',
                        isActive
                          ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200'
                      )}
                      aria-pressed={isActive}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-600">Statistiche rapide</Label>
              <div className="mt-2 grid gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Sparkles className="h-4 w-4 text-sky-500" />
                  {sessions.length} sessioni caricate
                </span>
                <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  {historicalStats.totalExercises} esercizi totali
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
            <FolderKanban className="h-5 w-5 text-sky-600" /> Storico sessioni
          </CardTitle>
          <p className="text-xs text-slate-500">Mostrate le ultime {filteredSessions.length} sessioni registrate</p>
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
                const totalExercises = session.exercises?.length ?? 0;
                const totalVolume = session.exercises.reduce((sum, exercise) => {
                  const distance = exercise.distance_m || 0;
                  const sets = exercise.sets || 0;
                  const reps = exercise.reps || 0;
                  if (!distance || !sets || !reps) return sum;
                  return sum + distance * sets * reps;
                }, 0);
                const timeValues = session.exercises
                  .map(exercise => (exercise.time_s != null ? Number(exercise.time_s) : null))
                  .filter((value): value is number => value != null && Number.isFinite(value));
                const weightValues = session.exercises
                  .map(exercise => (exercise.weight_kg != null ? Number(exercise.weight_kg) : null))
                  .filter((value): value is number => value != null && Number.isFinite(value));
                const intensityValues = session.exercises
                  .map(exercise => (exercise.intensity != null ? Number(exercise.intensity) : null))
                  .filter((value): value is number => value != null && Number.isFinite(value));
                const bestTime = timeValues.length > 0 ? Math.min(...timeValues) : null;
                const bestWeight = weightValues.length > 0 ? Math.max(...weightValues) : null;
                const averageIntensitySession =
                  intensityValues.length > 0
                    ? Math.round((intensityValues.reduce((sum, value) => sum + value, 0) / intensityValues.length) * 10) / 10
                    : null;

                const highlightBadges = [] as { icon: LucideIcon; label: string; value: string }[];
                if (bestTime != null) {
                  highlightBadges.push({ icon: Clock3, label: 'Miglior tempo', value: `${bestTime.toFixed(2)}s` });
                }
                if (bestWeight != null) {
                  highlightBadges.push({ icon: Weight, label: 'Carico massimo', value: `${bestWeight.toFixed(1)}kg` });
                }
                if (averageIntensitySession != null) {
                  highlightBadges.push({ icon: Gauge, label: 'Intensità media', value: averageIntensitySession.toFixed(1) });
                }

                const disciplineBadges = (() => {
                  const map = new Map<string, number>();
                  session.exercises.forEach(exercise => {
                    const key = exercise.category ?? 'altro';
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
                  <div key={session.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm">
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
                          {session.block?.name && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                              <FolderKanban className="h-3 w-3" /> {session.block.name}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span
                            className={cn(
                              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium',
                              typeToken?.bg ?? 'bg-slate-200',
                              typeToken?.text ?? 'text-slate-600'
                            )}
                          >
                            <Target className="h-3 w-3" /> {typeLabel}
                          </span>
                          {session.phase && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600">
                              <Sparkles className="h-3 w-3" /> {session.phase}
                            </span>
                          )}
                          {highlightBadges.map(badge => {
                            const Icon = badge.icon;
                            return (
                              <span
                                key={badge.label}
                                className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 font-medium text-slate-600"
                              >
                                <Icon className="h-3 w-3" /> {badge.label}: {badge.value}
                              </span>
                            );
                          })}
                          {disciplineBadges.length > 0 && (
                            <div className="inline-flex flex-wrap items-center gap-1">
                              {disciplineBadges.map(badge => (
                                <span
                                  key={badge.key}
                                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600"
                                >
                                  <Sparkles className="h-3 w-3 text-sky-500" /> {badge.label}
                                  <span className="text-slate-400">×{badge.count}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
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
                                const disciplineLabel = humanDiscipline(exercise.category);
                                const effortLabel = formatEffort(exercise.effort);
                                const hasIntensity = typeof exercise.intensity === 'number';
                                const hasTime = typeof exercise.time_s === 'number' && !Number.isNaN(exercise.time_s);
                                const hasWeight = typeof exercise.weight_kg === 'number' && !Number.isNaN(exercise.weight_kg);

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
                                        {hasIntensity && (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-medium text-slate-600">
                                            <Gauge className="h-3 w-3" /> {Number(exercise.intensity).toFixed(1)}/10
                                            {effortLabel !== '—' && ` (${effortLabel})`}
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
                                          {exercise.sets ?? '—'} × {exercise.reps ?? '—'}
                                        </p>
                                      </div>
                                      <div className="rounded-xl bg-white px-3 py-2">
                                        <p className="text-[10px] uppercase text-slate-500">Recuperi</p>
                                        <p className="text-sm font-semibold text-slate-700">
                                          {exercise.rest_between_reps_s ?? '—'}s / {exercise.rest_between_sets_s ?? '—'}s
                                        </p>
                                      </div>
                                    </div>

                                    {(hasTime || hasWeight) && (
                                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                                        {hasTime && (
                                          <div className="rounded-xl bg-white px-3 py-2">
                                            <p className="text-[10px] uppercase text-slate-500">Tempo registrato</p>
                                            <p className="text-sm font-semibold text-slate-700">
                                              {Number(exercise.time_s).toFixed(2)} s
                                            </p>
                                          </div>
                                        )}
                                        {hasWeight && (
                                          <div className="rounded-xl bg-white px-3 py-2">
                                            <p className="text-[10px] uppercase text-slate-500">Carico</p>
                                            <p className="text-sm font-semibold text-slate-700">
                                              {Number(exercise.weight_kg).toFixed(1)} kg
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {exercise.notes && <p className="mt-3 text-xs text-slate-500">{exercise.notes}</p>}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-slate-700">Dettagli sessione</h3>
                            <div className="grid gap-2 text-xs text-slate-600">
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                                <p className="text-[10px] uppercase text-slate-500">Fase</p>
                                <p className="text-sm font-semibold text-slate-700">{session.phase ?? '—'}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                                <p className="text-[10px] uppercase text-slate-500">Note</p>
                                <p className="text-sm text-slate-600">{session.notes ?? '—'}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                                <p className="text-[10px] uppercase text-slate-500">Volume</p>
                                <p className="text-sm font-semibold text-slate-700">
                                  {totalVolume ? `${totalVolume.toLocaleString('it-IT')} m` : 'Non disponibile'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
