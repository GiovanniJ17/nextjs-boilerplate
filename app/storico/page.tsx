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
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Trash2,
  Weight,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { notifyError, notifySuccess } from '@/lib/notifications';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { FilterBar, FilterItem } from '@/components/ui/filter-bar';

type ExerciseResult = {
  id: string;
  set_number: number | null;
  repetition_number: number | null;
  time_s: number | null;
  weight_kg: number | null;
  rpe: number | null;
  notes: string | null;
};

type Exercise = {
  id: string;
  exercise_number: number | null;
  name: string | null;
  discipline_type: string | null;
  distance_m: number | null;
  sets: number | null;
  repetitions: number | null;
  rest_between_reps_s: number | null;
  rest_between_sets_s: number | null;
  intensity: number | null;
  effort_type: string | null;
  notes: string | null;
  results: ExerciseResult[];
};

type ExerciseBlock = {
  id: string;
  block_number: number | null;
  name: string | null;
  rest_after_block_s: number | null;
  notes: string | null;
  exercises: Exercise[];
};

type Metric = {
  id: string;
  metric_name: string | null;
  category: string | null;
  metric_target: string | null;
  value: number | null;
  unit: string | null;
  notes: string | null;
  distance_m: number | null;
  time_s: number | null;
  recovery_post_s: number | null;
  intensity: number | null;
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
  exercise_blocks: ExerciseBlock[];
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
  { value: 'test', label: 'Test' },
  { value: 'gara', label: 'Gara' },
  { value: 'massimale', label: 'Massimali' },
  { value: 'scarico', label: 'Scarico' },
  { value: 'recupero', label: 'Recupero' },
  { value: 'altro', label: 'Altro' },
];

const smartRangeOptions = [
  { key: '14', label: 'Ultimi 14 giorni', days: 14 },
  { key: '90', label: 'Ultimi 90 giorni', days: 90 },
  { key: '42', label: 'Ultime 6 settimane', days: 42 },
];

const sessionTypeTokens: Record<string, { bg: string; text: string }> = {
  pista: { bg: 'bg-sky-100', text: 'text-sky-600' },
  test: { bg: 'bg-amber-100', text: 'text-amber-600' },
  gara: { bg: 'bg-rose-100', text: 'text-rose-600' },
  massimale: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
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
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    void loadBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
         exercise_blocks:exercise_blocks (
           id, block_number, name, rest_after_block_s, notes,
           exercises:exercises (
             id, exercise_number, name, discipline_type, distance_m, sets, repetitions, rest_between_reps_s, rest_between_sets_s, intensity, effort_type, notes,
             results:exercise_results (id, set_number, repetition_number, time_s, weight_kg, rpe, notes)
           )
         ),
         metrics:metrics (id, metric_name, category, metric_target, value, unit, notes, distance_m, time_s, recovery_post_s, intensity)
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
        exercise_blocks: (session.exercise_blocks || []).map(block => ({
          ...block,
          exercises: (block.exercises || []).map(exercise => ({
            ...exercise,
            results: exercise?.results ? (exercise.results as ExerciseResult[]) : [],
          })),
        })),
        metrics: session.metrics || [],
      }));
      setSessions(casted);
    }

    setLoading(false);
  }, [blockFilter, fromDate, toDate, typeFilter]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

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
      
      // Conta esercizi attraverso i blocchi
      session.exercise_blocks.forEach(block => {
        totalExercises += block.exercises?.length ?? 0;
        block.exercises.forEach(exercise => {
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
      for (const block of session.exercise_blocks) {
        for (const exercise of block.exercises) {
          const key = exercise.discipline_type ?? 'altro';
          disciplineCounter.set(key, (disciplineCounter.get(key) ?? 0) + 1);
          exercisesTotal += 1;
          if (exercise.intensity != null) {
            intensitySum += Number(exercise.intensity);
            intensityCount += 1;
          }
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
        icon: Gauge,
        label: 'Intensità media',
        value:
          typeof focusStats?.avgIntensity === 'number'
            ? `${focusStats.avgIntensity.toFixed(1)}/10`
            : '—',
      },
      {
        icon: Sparkles,
        label: 'Sessioni test',
        value: historicalStats.testsCount.toLocaleString('it-IT'),
      },
    ],
    [focusStats, historicalStats]
  );

  function applySmartRange(rangeKey: string) {
    if (activeSmartRange === rangeKey) {
      setActiveSmartRange('');
      setFromDate('');
      setToDate('');
      return;
    }

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
  }

  function handleQuickSearch(query: string) {
    setSearch(query);
    setActiveQuickSearch(query);
  }

  function requestDeleteSession(sessionId: string) {
    const session = sessions.find(item => item.id === sessionId);
    const dateLabel = session?.date ? formatDate(session.date) : null;
    const label = dateLabel ? `la sessione del ${dateLabel}` : 'questa sessione';
    setSessionToDelete({ id: sessionId, label });
  }

  async function confirmDeleteSession() {
    if (!sessionToDelete) return;

    const { id, label } = sessionToDelete;
    setDeletingSessionId(id);
    const { error } = await supabase.from('training_sessions').delete().eq('id', id);

    if (error) {
      notifyError("Errore durante l'eliminazione della sessione", {
        description: 'Riprova tra pochi secondi.',
      });
      setDeletingSessionId(null);
      setSessionToDelete(null);
      return;
    }

    setSessions(prev => prev.filter(sessionItem => sessionItem.id !== id));
    if (openSession === id) {
      setOpenSession(null);
    }
    setDeletingSessionId(null);
    setSessionToDelete(null);
    notifySuccess('Sessione eliminata', {
      description: `Hai rimosso ${label} dallo storico.`,
    });
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
        ...session.exercise_blocks.flatMap(block => [
          block.name || '',
          ...block.exercises.map(exercise => exercise.name || ''),
        ]),
        ...session.metrics.map(
          metric => `${metric.metric_name ?? ''} ${metric.notes ?? ''} ${metric.metric_target ?? ''}`
        ),
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
    <div className="space-y-4 animate-page">
      {/* Hero Section - Gradient Style */}
      <section className="rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 p-5 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
              <History className="h-4 w-4" strokeWidth={2} /> Storico Allenamenti
            </div>
            <h1 className="text-3xl font-semibold">Rivedi le tue performance</h1>
            <p className="max-w-xl text-sm text-white/75">
              Consulta, analizza ed esporta le tue sessioni precedenti. Monitora i progressi nel tempo.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 px-6 py-5 text-center">
            <p className="text-xs uppercase tracking-widest text-white/60">Sessioni totali</p>
            <p className="text-4xl font-semibold">{sessions.length}</p>
            <p className="text-xs text-white/60">registrate</p>
          </div>
        </div>
        
        {/* Stats in hero - 5 cards on one row */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {heroStats.map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
                <div className="flex items-center justify-between text-white/75">
                  <span className="text-xs uppercase tracking-widest text-white/60">{stat.label}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Filters - Redesigned */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-4">
          {/* Smart Range Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-600 mr-2">Periodo:</span>
            {smartRangeOptions.map(option => {
              const isActive = activeSmartRange === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => applySmartRange(option.key)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-slate-50'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100"></div>

          {/* Date Range + Search */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-2">
              <Label className="text-xs font-medium text-slate-700 mb-1.5 block">Da</Label>
              <Input 
                type="date" 
                value={fromDate} 
                onChange={event => handleFromDateChange(event.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="lg:col-span-2">
              <Label className="text-xs font-medium text-slate-700 mb-1.5 block">A</Label>
              <Input 
                type="date" 
                value={toDate} 
                onChange={event => handleToDateChange(event.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="lg:col-span-6">
              <Label className="text-xs font-medium text-slate-700 mb-1.5 block">Cerca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Note, luogo, esercizi..."
                  className="h-9 pl-9 text-sm"
                />
              </div>
            </div>
            <div className="lg:col-span-2 flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                className="w-full h-9 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
              </Button>
            </div>
          </div>

          {/* Filters Row - Tipo e Blocco */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-slate-700 mb-2 block">Tipo sessione</Label>
              <div className="flex flex-wrap gap-1.5">
                {sessionTypeOptions.map(option => {
                  const isActive = typeFilter === option.value;
                  return (
                    <button
                      key={option.value || 'all'}
                      type="button"
                      onClick={() => setTypeFilter(prev => (prev === option.value ? '' : option.value))}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        isActive
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-slate-50'
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {blocks.length > 0 && (
              <div>
                <Label className="text-xs font-medium text-slate-700 mb-2 block">Blocco</Label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBlockFilter('')}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      !blockFilter
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-slate-50'
                    )}
                  >
                    Tutti
                  </button>
                  {blocks.map(block => {
                    const isSelected = blockFilter === block.id;
                    return (
                      <button
                        key={block.id}
                        type="button"
                        onClick={() => setBlockFilter(prev => (prev === block.id ? '' : block.id ?? ''))}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50'
                        )}
                      >
                        {block.name ?? 'Senza nome'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Searches */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-500">Rapide:</span>
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

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
            <FolderKanban className="h-5 w-5 text-sky-600" strokeWidth={2} /> Storico sessioni
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
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Caricamento delle sessioni...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 py-12 text-center text-sm text-slate-500">
              Nessun allenamento trovato. Modifica i filtri o registra una nuova sessione!
            </div>
          ) : (
            

            <div className="space-y-4">
              {filteredSessions.map(session => {
                const isOpen = openSession === session.id;
                const totalMetrics = session.metrics?.length ?? 0;
                
                // Calcola esercizi attraverso i blocchi
                const totalExercises = session.exercise_blocks.reduce(
                  (sum, block) => sum + (block.exercises?.length ?? 0),
                  0
                );
                
                const totalVolume = session.exercise_blocks.reduce((blockSum, block) => {
                  return blockSum + block.exercises.reduce((exSum, exercise) => {
                    const distance = exercise.distance_m || 0;
                    const sets = exercise.sets || 0;
                    const reps = exercise.repetitions || 0;
                    if (!distance || !sets || !reps) return exSum;
                    return exSum + distance * sets * reps;
                  }, 0);
                }, 0);
                
                const allResults = session.exercise_blocks.flatMap(block =>
                  block.exercises.flatMap(exercise => exercise.results ?? [])
                );
                
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
                // Weight badges removed - only tracked in Metriche section now (massimali)
                if (averageRpeSession != null) {
                  highlightBadges.push({ icon: Gauge, label: 'RPE medio', value: averageRpeSession.toFixed(1) });
                }

                const disciplineBadges = (() => {
                  const map = new Map<string, number>();
                  session.exercise_blocks.forEach(block => {
                    block.exercises.forEach(exercise => {
                      const key = exercise.discipline_type ?? 'altro';
                      map.set(key, (map.get(key) ?? 0) + 1);
                    });
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
                      <span className="absolute left-[7px] top-8 h-3 w-3 rounded-full border-2 border-white bg-sky-500 shadow transition-colors group-hover:scale-110" />
                    )}
                    <div className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm transition', viewMode === 'timeline' && 'ml-4')}>
                      <div className="flex items-start justify-between">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleSession(session.id)}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              toggleSession(session.id);
                            }
                          }}
                          className="flex flex-1 cursor-pointer items-center justify-between gap-4 rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
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
                        </div>
                        <div className="pr-5 pt-4">
                          <button
                            type="button"
                            onClick={() => requestDeleteSession(session.id)}
                            disabled={deletingSessionId === session.id}
                            className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 p-2 text-rose-600 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Elimina sessione"
                          >
                            {deletingSessionId === session.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-slate-100 px-5 pb-5">
                          <div className="grid gap-4 py-4 lg:grid-cols-2">
                            <div className="space-y-3">
                              <h3 className="text-sm font-semibold text-slate-700">Blocchi ed Esercizi</h3>
                              {session.exercise_blocks.length === 0 ? (
                                <p className="text-xs text-slate-500">Nessun blocco registrato.</p>
                              ) : (
                                session.exercise_blocks
                                  .sort((a, b) => (a.block_number ?? 0) - (b.block_number ?? 0))
                                  .map(block => (
                                    <div
                                      key={block.id}
                                      className="space-y-2 rounded-2xl border-2 border-sky-200 bg-sky-50/30 p-3"
                                    >
                                      {/* Block Header */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <FolderKanban className="h-4 w-4 text-sky-600" />
                                          <span className="text-sm font-semibold text-sky-700">
                                            {block.name || `Blocco ${block.block_number}`}
                                          </span>
                                        </div>
                                        {block.rest_after_block_s != null && (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-600">
                                            <Clock3 className="h-3 w-3" /> Recupero: {block.rest_after_block_s}s
                                          </span>
                                        )}
                                      </div>
                                      
                                      {block.notes && (
                                        <p className="text-xs text-slate-600">{block.notes}</p>
                                      )}

                                      {/* Exercises in Block */}
                                      {block.exercises.length === 0 ? (
                                        <p className="text-xs italic text-slate-500">Nessun esercizio in questo blocco.</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {block.exercises
                                            .sort((a, b) => (a.exercise_number ?? 0) - (b.exercise_number ?? 0))
                                            .map(exercise => {
                                              const disciplineLabel = humanDiscipline(exercise.discipline_type);
                                              const effortLabel = formatEffort(exercise.effort_type);
                                              return (
                                                <div
                                                  key={exercise.id}
                                                  className="rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600"
                                                >
                                                  <div className="flex flex-wrap items-start justify-between gap-2 text-sm font-semibold text-slate-700">
                                                    <div>
                                                      <p>{exercise.name ?? 'Esercizio'}</p>
                                                      <p className="text-[11px] text-slate-500">{disciplineLabel}</p>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                                      {exercise.intensity && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                                                          <Gauge className="h-3 w-3" /> {exercise.intensity}/10{' '}
                                                          {effortLabel !== '—' && `(${effortLabel})`}
                                                        </span>
                                                      )}
                                                      {formatDistance(exercise) !== '—' && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                                                          <BarChart3 className="h-3 w-3" /> {formatDistance(exercise)}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                                                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                                                      <p className="text-[10px] uppercase text-slate-500">Serie × Ripetizioni</p>
                                                      <p className="text-sm font-semibold text-slate-700">
                                                        {exercise.sets ?? '—'} × {exercise.repetitions ?? '—'}
                                                      </p>
                                                    </div>
                                                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                                                      <p className="text-[10px] uppercase text-slate-500">Recuperi</p>
                                                      <p className="text-sm font-semibold text-slate-700">
                                                        {exercise.rest_between_reps_s ?? '—'}s /{' '}
                                                        {exercise.rest_between_sets_s ?? '—'}s
                                                      </p>
                                                    </div>
                                                  </div>
                                                  {exercise.notes && (
                                                    <p className="mt-3 text-xs text-slate-500">{exercise.notes}</p>
                                                  )}

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
                                                            resultItems.push({
                                                              label: 'Ripetizione',
                                                              value: `#${result.repetition_number}`,
                                                            });
                                                          }

                                                          return (
                                                            <div
                                                              key={result.id}
                                                              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500"
                                                            >
                                                              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                                                <span>Serie #{result.set_number ?? '—'}</span>
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
                                                                    className="rounded-lg bg-white px-2 py-1 text-[10px] font-medium text-slate-600"
                                                                  >
                                                                    {item.label}: {item.value}
                                                                  </span>
                                                                ))}
                                                              </div>
                                                              {result.notes && (
                                                                <p className="mt-2 text-[10px] text-slate-500">
                                                                  Note: {result.notes}
                                                                </p>
                                                              )}
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
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
                                session.metrics.map(metric => {
                                  const categoryKey = metric.category ?? 'altro';
                                  const token = metricCategoryTokens[categoryKey] ?? metricCategoryTokens.altro;
                                  const CategoryIcon = metricCategoryIconsMap[categoryKey] ?? FileText;
                                  const isPerformanceMetric =
                                    categoryKey === 'test' ||
                                    metric.time_s != null ||
                                    metric.distance_m != null;
                                  const recoveryMinutes =
                                    metric.recovery_post_s != null
                                      ? Math.round((metric.recovery_post_s / 60) * 10) / 10
                                      : null;
                                  const intensityLabel =
                                    metric.intensity != null ? `${metric.intensity}/10` : null;
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
                                      {isPerformanceMetric ? (
                                        <div className="mt-2 grid gap-2 md:grid-cols-4">
                                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                                            <p className="text-[10px] uppercase text-slate-500">Distanza</p>
                                            <p className="text-sm font-semibold text-slate-700">
                                              {metric.distance_m != null ? `${metric.distance_m} m` : '—'}
                                            </p>
                                          </div>
                                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                                            <p className="text-[10px] uppercase text-slate-500">Tempo</p>
                                            <p className="text-sm font-semibold text-slate-700">
                                              {metric.time_s != null ? `${metric.time_s.toFixed(2)} s` : '—'}
                                            </p>
                                          </div>
                                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                                            <p className="text-[10px] uppercase text-slate-500">Recupero</p>
                                            <p className="text-sm font-semibold text-slate-700">
                                              {recoveryMinutes != null ? `${recoveryMinutes} min` : '—'}
                                            </p>
                                          </div>
                                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                                            <p className="text-[10px] uppercase text-slate-500">Intensità</p>
                                            <p className="text-sm font-semibold text-slate-700">
                                              {intensityLabel ?? '—'}
                                            </p>
                                          </div>
                                        </div>
                                      ) : (
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
                                      )}
                                      {isPerformanceMetric && metric.metric_target && (
                                        <p className="mt-3 text-xs text-slate-500">Contesto: {metric.metric_target}</p>
                                      )}
                                      {metric.notes && (
                                        <p className="mt-2 text-xs text-slate-500">{metric.notes}</p>
                                      )}
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
      <ConfirmDialog
        open={sessionToDelete != null}
        title="Eliminare la sessione?"
        description={
          sessionToDelete
            ? `Stai per rimuovere ${sessionToDelete.label}. Saranno eliminati anche esercizi e metriche associate.`
            : undefined
        }
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        tone="danger"
        processing={sessionToDelete ? deletingSessionId === sessionToDelete.id : false}
        onCancel={() => setSessionToDelete(null)}
        onConfirm={confirmDeleteSession}
      />
    </div>
  );
}
