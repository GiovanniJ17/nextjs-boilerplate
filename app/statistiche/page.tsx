'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import {
  Activity,
  BarChart,
  BarChart3,
  Brain,
  Filter,
  FolderKanban,
  Loader2,
  Medal,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const distanceOptions = [
  { value: 'all', label: 'Tutte le distanze' },
  { value: 'short', label: 'Sprint corti (< 80m)' },
  { value: 'mid', label: 'Sprint medi (80-200m)' },
  { value: 'long', label: 'Sprint lunghi (> 200m)' },
];

const sessionTypeFilters = [
  { value: '', label: 'Tutti' },
  { value: 'pista', label: 'Pista' },
  { value: 'palestra', label: 'Palestra' },
  { value: 'test', label: 'Test' },
  { value: 'scarico', label: 'Scarico' },
  { value: 'altro', label: 'Altro' },
];

const rangePresets = [
  { key: '30', label: 'Ultimi 30 giorni', days: 30 },
  { key: '90', label: 'Ultimi 90 giorni', days: 90 },
  { key: 'season', label: 'Stagione in corso', monthsBack: 6 },
];

type TrainingBlock = {
  id: string;
  name: string | null;
};

type SessionRow = {
  id: string;
  date: string | null;
  type: string | null;
  block_id: string | null;
};

type ExerciseRow = {
  id: string;
  session_id: string | null;
  category: string | null;
  distance_m: number | null;
  sets: number | null;
  reps: number | null;
  intensity: number | null;
  rest_between_sets_s: number | null;
  time_s: number | null;
};

type StatsSnapshot = {
  totalSessions: number;
  totalDistance: number;
  avgDistancePerSession: number;
  bestTime: number | null;
  bestTimeDistance: number | null;
  avgTime: number | null;
  avgIntensity: number | null;
  restAverage: number | null;
  highIntensitySessions: number;
  lowIntensitySessions: number;
  typeBreakdown: { label: string; value: number }[];
  pbByDistance: { distance: number; time: number }[];
  insights: string[];
};

function matchesDistance(distance: number | null, filter: string) {
  if (filter === 'all' || distance == null) return true;
  if (filter === 'short') return distance < 80;
  if (filter === 'mid') return distance >= 80 && distance <= 200;
  if (filter === 'long') return distance > 200;
  return true;
}

function formatNumber(value: number, options: Intl.NumberFormatOptions = {}) {
  return value.toLocaleString('it-IT', options);
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function StatistichePage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [distanceFilter, setDistanceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [blockFilter, setBlockFilter] = useState('');
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [stats, setStats] = useState<StatsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'base' | 'advanced' | 'insights'>('base');
  const [rangePreset, setRangePreset] = useState<string>('');

  useEffect(() => {
    void Promise.all([loadStats(), loadBlocks()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBlocks() {
    const { data } = await supabase.from('training_blocks').select('id, name').order('start_date', {
      ascending: false,
    });
    if (data) {
      setBlocks(data as TrainingBlock[]);
    }
  }

  async function loadStats() {
    setLoading(true);

    let sessionQuery = supabase
      .from('training_sessions')
      .select('id, date, type, block_id')
      .order('date', { ascending: false });

    if (fromDate) sessionQuery = sessionQuery.gte('date', fromDate);
    if (toDate) sessionQuery = sessionQuery.lte('date', toDate);
    if (typeFilter) sessionQuery = sessionQuery.eq('type', typeFilter);
    if (blockFilter) sessionQuery = sessionQuery.eq('block_id', blockFilter);

    const { data: sessionsData, error: sessionsError } = await sessionQuery;

    if (sessionsError || !sessionsData) {
      setStats(null);
      setLoading(false);
      return;
    }

    const sessions = sessionsData as SessionRow[];
    const sessionIds = sessions.map(session => session.id);

    let exercises: ExerciseRow[] = [];
    if (sessionIds.length > 0) {
      const { data: exercisesData } = await supabase
        .from('training_exercises')
        .select('id, session_id, category, distance_m, sets, reps, intensity, rest_between_sets_s, time_s')
        .in('session_id', sessionIds);
      if (exercisesData) {
        exercises = exercisesData as ExerciseRow[];
      }
    }

    const distanceFilteredExercises = exercises.filter(exercise =>
      matchesDistance(exercise.distance_m, distanceFilter)
    );

    const totalSessions = sessions.length;
    const totalDistance = distanceFilteredExercises.reduce((sum, exercise) => {
      const distance = exercise.distance_m || 0;
      const sets = exercise.sets || 0;
      const reps = exercise.reps || 0;
      return sum + distance * sets * reps;
    }, 0);
    const avgDistancePerSession = totalSessions > 0 ? totalDistance / totalSessions : 0;

    const intensityValues = distanceFilteredExercises
      .map(exercise => exercise.intensity)
      .filter((value): value is number => typeof value === 'number');
    const avgIntensity = intensityValues.length
      ? intensityValues.reduce((sum, value) => sum + value, 0) / intensityValues.length
      : null;

    const restValues = distanceFilteredExercises
      .map(exercise => exercise.rest_between_sets_s)
      .filter((value): value is number => typeof value === 'number');
    const restAverage = restValues.length
      ? restValues.reduce((sum, value) => sum + value, 0) / restValues.length
      : null;

    const times = distanceFilteredExercises
      .map(exercise => exercise.time_s)
      .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));

    let bestTime: number | null = null;
    let bestTimeDistance: number | null = null;

    if (times.length) {
      bestTime = Math.min(...times);
      const bestExercise = distanceFilteredExercises.find(
        exercise => typeof exercise.time_s === 'number' && exercise.time_s === bestTime
      );
      if (bestExercise?.distance_m) {
        bestTimeDistance = bestExercise.distance_m;
      }
    }

    const avgTime = times.length ? times.reduce((sum, time) => sum + time, 0) / times.length : null;

    const highIntensitySessions = new Set(
      distanceFilteredExercises
        .filter(exercise => (exercise.intensity || 0) >= 8)
        .map(exercise => exercise.session_id)
        .filter((value): value is string => Boolean(value))
    ).size;

    const lowIntensitySessions = new Set(
      distanceFilteredExercises
        .filter(exercise => (exercise.intensity || 0) <= 4)
        .map(exercise => exercise.session_id)
        .filter((value): value is string => Boolean(value))
    ).size;

    const typeBreakdownMap = sessions.reduce<Record<string, number>>((acc, session) => {
      const key = session.type ?? 'Altro';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const typeBreakdown = Object.entries(typeBreakdownMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const pbMap = new Map<number, number>();
    for (const exercise of distanceFilteredExercises) {
      if (typeof exercise.distance_m !== 'number') continue;
      if (typeof exercise.time_s !== 'number' || Number.isNaN(exercise.time_s)) continue;
      const existing = pbMap.get(exercise.distance_m);
      if (existing == null || (exercise.time_s ?? Infinity) < existing) {
        pbMap.set(exercise.distance_m, exercise.time_s);
      }
    }
    const pbByDistance = Array.from(pbMap.entries())
      .map(([distance, time]) => ({ distance, time }))
      .sort((a, b) => a.distance - b.distance);

    const insights: string[] = [];
    if (bestTime && bestTimeDistance) {
      insights.push(`PB sui ${bestTimeDistance}m: ${bestTime.toFixed(2)}s`);
    }
    if (avgIntensity) {
      insights.push(`Intensità media registrata: ${avgIntensity.toFixed(1)}/10`);
    }
    if (avgDistancePerSession > 0) {
      insights.push(`Volume medio per sessione: ${Math.round(avgDistancePerSession)} m`);
    }
    if (highIntensitySessions > lowIntensitySessions) {
      insights.push('Prevalenza di sedute ad alta intensità rispetto a quelle leggere');
    }

    setStats({
      totalSessions,
      totalDistance,
      avgDistancePerSession,
      bestTime,
      bestTimeDistance,
      avgTime,
      avgIntensity,
      restAverage,
      highIntensitySessions,
      lowIntensitySessions,
      typeBreakdown,
      pbByDistance,
      insights,
    });

    setLoading(false);
  }

  function applyRangePreset(key: string) {
    const today = new Date();
    let start: Date | null = null;

    const preset = rangePresets.find(item => item.key === key);
    if (preset?.days) {
      start = new Date(today);
      start.setDate(today.getDate() - preset.days);
    } else if (preset?.monthsBack) {
      start = new Date(today);
      start.setMonth(today.getMonth() - preset.monthsBack, 1);
    }

    setRangePreset(key);
    setToDate(formatDateInput(today));
    setFromDate(start ? formatDateInput(start) : '');
  }

  function handleFromDateChange(value: string) {
    setRangePreset('');
    setFromDate(value);
  }

  function handleToDateChange(value: string) {
    setRangePreset('');
    setToDate(value);
  }

  function resetFilters() {
    setFromDate('');
    setToDate('');
    setDistanceFilter('all');
    setTypeFilter('');
    setBlockFilter('');
    setRangePreset('');
    void loadStats();
  }

  const tabs = useMemo(
    () => [
      { key: 'base', label: 'Statistiche Base' },
      { key: 'advanced', label: 'Statistiche Avanzate' },
      { key: 'insights', label: 'Curiosità & Insights' },
    ],
    []
  );

  const topType = useMemo(() => {
    if (!stats || stats.typeBreakdown.length === 0) return null;
    return stats.typeBreakdown[0];
  }, [stats]);

  const headlinePb = useMemo(() => {
    if (!stats) return null;
    if (stats.bestTime && stats.bestTimeDistance) {
      return { distance: stats.bestTimeDistance, time: stats.bestTime };
    }
    if (stats.pbByDistance.length > 0) {
      const first = stats.pbByDistance[0];
      return { distance: first.distance, time: first.time };
    }
    return null;
  }, [stats]);

  const heroStats = useMemo(
    () => [
      {
        label: 'Sessioni filtrate',
        value: stats ? formatNumber(stats.totalSessions) : '—',
        icon: Activity,
      },
      {
        label: 'Volume medio',
        value: stats?.avgDistancePerSession
          ? `${Math.round(stats.avgDistancePerSession)} m`
          : '—',
        icon: BarChart3,
      },
      {
        label: 'Intensità media',
        value: stats?.avgIntensity ? `${stats.avgIntensity.toFixed(1)}/10` : '—',
        icon: Sparkles,
      },
      {
        label: 'Sedute intense',
        value: stats ? formatNumber(stats.highIntensitySessions) : '—',
        icon: TrendingUp,
      },
    ],
    [stats]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-500 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
              <BarChart className="h-4 w-4" /> Statistiche Allenamenti
            </div>
            <h1 className="text-3xl font-semibold">Analizza il tuo percorso da velocista</h1>
            <p className="max-w-xl text-sm text-white/75">
              Visualizza trend, progressi e curiosità sulle tue sessioni. Filtra per periodo, blocco e distanza per
              ottenere indicazioni davvero utili per la programmazione.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 px-6 py-5 text-center">
            <p className="text-xs uppercase tracking-widest text-white/60">Distanza totale</p>
            <p className="text-4xl font-semibold">
              {stats ? formatNumber(stats.totalDistance) : '—'}
            </p>
            <p className="text-xs text-white/60">metri registrati</p>
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
        {(topType || headlinePb) && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {topType && (
              <div className="rounded-3xl bg-white/15 px-4 py-3 text-sm text-white">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <Target className="h-4 w-4" /> Focus tipologia
                  </span>
                  <span className="text-xs text-white/70">{formatNumber(topType.value)} sessioni</span>
                </div>
                <p className="mt-2 text-xs text-white/80">Prevalenza: {topType.label}</p>
                <button
                  type="button"
                  onClick={() => setTypeFilter(prev => (prev === topType.label ? '' : topType.label))}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1 text-[11px] font-medium text-white transition hover:border-white/60 hover:bg-white/10"
                >
                  <Filter className="h-3 w-3" /> Filtra su {topType.label}
                </button>
              </div>
            )}
            {headlinePb && (
              <div className="rounded-3xl bg-white/15 px-4 py-3 text-sm text-white">
                <div className="inline-flex items-center gap-2 font-semibold">
                  <Medal className="h-4 w-4" /> Ultimo PB rilevante
                </div>
                <p className="mt-2 text-2xl font-semibold">{headlinePb.time.toFixed(2)} s</p>
                <p className="text-xs text-white/80">Sui {headlinePb.distance} m</p>
              </div>
            )}
          </div>
        )}
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
            {rangePresets.map(preset => {
              const isActive = rangePreset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => applyRangePreset(preset.key)}
                  className={cn(
                    'rounded-full border px-3 py-1 font-medium transition',
                    isActive
                      ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                      : 'border-transparent bg-white text-slate-600 hover:border-sky-200'
                  )}
                  aria-pressed={isActive}
                >
                  {preset.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setRangePreset('');
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
              <Label className="text-xs font-semibold text-slate-600">Tipo</Label>
              <div className="flex flex-wrap gap-2">
                {sessionTypeFilters.map(option => {
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
                    blockFilter
                      ? 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200'
                      : 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                  )}
                  aria-pressed={!blockFilter}
                >
                  Tutti
                </button>
                {blocks.map(block => {
                  const isActive = blockFilter === block.id;
                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => setBlockFilter(prev => (prev === block.id ? '' : block.id ?? ''))}
                      className={cn(
                        'rounded-full border px-3 py-1 text-[11px] font-medium transition',
                        isActive
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200'
                      )}
                      aria-pressed={isActive}
                    >
                      {block.name ?? 'Blocco senza nome'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-600">Distanza</Label>
            <div className="flex flex-wrap gap-2">
              {distanceOptions.map(option => {
                const isActive = distanceFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDistanceFilter(option.value)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-[11px] font-medium transition',
                      isActive
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'
                    )}
                    aria-pressed={isActive}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetFilters} className="rounded-full text-xs">
              Reset
            </Button>
            <Button type="button" onClick={loadStats} className="rounded-full text-xs">
              Applica filtri
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
            <TrendingUp className="h-5 w-5 text-sky-600" /> Andamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 text-sm">
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`rounded-full px-4 py-1.5 transition ${
                  activeTab === tab.key
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" /> Calcolo statistiche...
            </div>
          ) : !stats ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 py-12 text-center text-sm text-slate-500">
              Nessun dato disponibile per i filtri selezionati.
            </div>
          ) : (
            <div>
              {activeTab === 'base' && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                      title="Totale sessioni"
                      value={formatNumber(stats.totalSessions)}
                      subtitle="Allenamenti registrati"
                      icon={<Activity className="h-5 w-5" />}
                      accent="bg-sky-100 text-sky-600"
                    />
                    <SummaryCard
                      title="Distanza totale"
                      value={`${formatNumber(stats.totalDistance)} m`}
                      subtitle="Somma di tutte le ripetute"
                      icon={<BarChart3 className="h-5 w-5" />}
                      accent="bg-blue-100 text-blue-600"
                    />
                    <SummaryCard
                      title="Tempo migliore"
                      value={stats.bestTime ? `${stats.bestTime.toFixed(2)} s` : 'N/D'}
                      subtitle={
                        stats.bestTimeDistance
                          ? `Sui ${stats.bestTimeDistance} m`
                          : 'Registra tempi per visualizzare il PB'
                      }
                      icon={<Medal className="h-5 w-5" />}
                      accent="bg-amber-100 text-amber-600"
                    />
                    <SummaryCard
                      title="Tempo medio"
                      value={stats.avgTime ? `${stats.avgTime.toFixed(2)} s` : 'N/D'}
                      subtitle="Media delle prove cronometrate"
                      icon={<Target className="h-5 w-5" />}
                      accent="bg-indigo-100 text-indigo-600"
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                        <span>Distribuzione per tipologia</span>
                        <button
                          type="button"
                          onClick={() => setTypeFilter('')}
                          className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
                        >
                          Azzera filtro
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {stats.typeBreakdown.length === 0 ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-500">
                            Nessuna sessione registrata
                          </span>
                        ) : (
                          stats.typeBreakdown.map(item => {
                            const isActive = typeFilter === item.label;
                            return (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => setTypeFilter(prev => (prev === item.label ? '' : item.label))}
                                className={cn(
                                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition',
                                  isActive
                                    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-200'
                                )}
                                aria-pressed={isActive}
                              >
                                <span className="capitalize">{item.label}</span>
                                <span className="text-slate-400">{formatNumber(item.value)}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                      <p className="mt-3 text-[11px] text-slate-500">
                        Tocca una tipologia per aggiornare le statistiche in tempo reale.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Medal className="h-4 w-4 text-amber-500" /> Personal Best per distanza
                      </h3>
                      <div className="mt-3 space-y-2 text-xs text-slate-600">
                        {stats.pbByDistance.length === 0 ? (
                          <p className="rounded-2xl bg-slate-50 px-3 py-2">Registra nuovi tempi per popolare la tabella.</p>
                        ) : (
                          stats.pbByDistance.map(item => (
                            <div
                              key={item.distance}
                              className="flex items-center justify-between rounded-2xl bg-amber-50/70 px-3 py-2"
                            >
                              <span>{item.distance} m</span>
                              <span className="font-semibold text-amber-700">{item.time.toFixed(2)} s</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryCard
                    title="Intensità media"
                    value={stats.avgIntensity ? `${stats.avgIntensity.toFixed(1)}/10` : 'N/D'}
                    subtitle="Basata sulle sedute filtrate"
                    icon={<Sparkles className="h-5 w-5" />}
                    accent="bg-violet-100 text-violet-600"
                  />
                  <SummaryCard
                    title="Sessioni ad alta intensità"
                    value={formatNumber(stats.highIntensitySessions)}
                    subtitle=">= 8/10 di intensità"
                    icon={<TrendingUp className="h-5 w-5" />}
                    accent="bg-rose-100 text-rose-600"
                  />
                  <SummaryCard
                    title="Recupero medio tra serie"
                    value={stats.restAverage ? `${Math.round(stats.restAverage)} s` : 'N/D'}
                    subtitle="Calcolato sulle ripetute selezionate"
                    icon={<Brain className="h-5 w-5" />}
                    accent="bg-emerald-100 text-emerald-600"
                  />
                  <SummaryCard
                    title="Sessioni leggere"
                    value={formatNumber(stats.lowIntensitySessions)}
                    subtitle="<= 4/10 di intensità"
                    icon={<FolderKanban className="h-5 w-5" />}
                    accent="bg-slate-200 text-slate-600"
                  />
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700">Ripartizione sessioni</h3>
                    <ul className="mt-3 space-y-2 text-xs text-slate-600">
                      {stats.typeBreakdown.length === 0 ? (
                        <li>Nessuna sessione registrata</li>
                      ) : (
                        stats.typeBreakdown.map(item => (
                          <li
                            key={item.label}
                            className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2"
                          >
                            <span className="capitalize">{item.label}</span>
                            <span className="font-semibold">{item.value}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-700">Volume medio per sessione</h3>
                    <p className="mt-2 text-3xl font-semibold text-slate-800">
                      {stats.avgDistancePerSession ? `${Math.round(stats.avgDistancePerSession)} m` : 'N/D'}
                    </p>
                    <p className="text-xs text-slate-500">Calcolato sulle sessioni filtrate</p>
                  </div>
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Medal className="h-4 w-4 text-amber-500" /> Personal Best registrati
                    </h3>
                    <ul className="mt-3 space-y-2 text-xs text-slate-600">
                      {stats.pbByDistance.length === 0 ? (
                        <li>Nessun tempo registrato nelle ripetute selezionate</li>
                      ) : (
                        stats.pbByDistance.map(item => (
                          <li
                            key={item.distance}
                            className="flex items-center justify-between rounded-2xl bg-amber-50/60 px-3 py-2"
                          >
                            <span>{item.distance} m</span>
                            <span className="font-semibold text-amber-700">{item.time.toFixed(2)} s</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Sparkles className="h-4 w-4 text-sky-500" /> Insight rapidi
                    </h3>
                    <ul className="mt-3 space-y-2 text-xs text-slate-600">
                      {stats.insights.length === 0 ? (
                        <li>Aggiungi più dati per ottenere suggerimenti personalizzati!</li>
                      ) : (
                        stats.insights.map((insight, index) => (
                          <li
                            key={index}
                            className="rounded-2xl bg-sky-50/70 px-3 py-2 text-sky-800"
                          >
                            {insight}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  accent: string;
};

function SummaryCard({ title, value, subtitle, icon, accent }: SummaryCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${accent}`}>
        {icon}
        <span>{title}</span>
      </div>
      <p className="text-3xl font-semibold text-slate-800">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}
