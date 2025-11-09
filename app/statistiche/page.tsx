'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
  discipline_type: string | null;
  distance_m: number | null;
  sets: number | null;
  repetitions: number | null;
  intensity: number | null;
  rest_between_sets_s: number | null;
};

type ResultRow = {
  exercise_id: string | null;
  time_s: number | null;
};

type MetricRow = {
  session_id: string | null;
  value: number | null;
  unit: string | null;
  metric_name: string | null;
  metric_target: string | null;
  category: string | null;
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
  metricsCount: number;
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
        .from('exercises')
        .select('id, session_id, discipline_type, distance_m, sets, repetitions, intensity, rest_between_sets_s')
        .in('session_id', sessionIds);
      if (exercisesData) {
        exercises = exercisesData as ExerciseRow[];
      }
    }

    let results: ResultRow[] = [];
    const exerciseIds = exercises.map(exercise => exercise.id);
    if (exerciseIds.length > 0) {
      const { data: resultsData } = await supabase
        .from('exercise_results')
        .select('exercise_id, time_s')
        .in('exercise_id', exerciseIds);
      if (resultsData) {
        results = resultsData as ResultRow[];
      }
    }

    let metrics: MetricRow[] = [];
    if (sessionIds.length > 0) {
      let metricsQuery = supabase
        .from('metrics')
        .select('session_id, value, unit, metric_name, metric_target, category')
        .in('session_id', sessionIds);

      if (fromDate) metricsQuery = metricsQuery.gte('date', fromDate);
      if (toDate) metricsQuery = metricsQuery.lte('date', toDate);

      const { data: metricsData } = await metricsQuery;
      if (metricsData) {
        metrics = metricsData as MetricRow[];
      }
    }

    const distanceFilteredExercises = exercises.filter(exercise =>
      matchesDistance(exercise.distance_m, distanceFilter)
    );
    const filteredExerciseIds = new Set(distanceFilteredExercises.map(exercise => exercise.id));
    const filteredResults = results.filter(result => result.exercise_id && filteredExerciseIds.has(result.exercise_id));

    const totalSessions = sessions.length;
    const totalDistance = distanceFilteredExercises.reduce((sum, exercise) => {
      const distance = exercise.distance_m || 0;
      const sets = exercise.sets || 0;
      const repetitions = exercise.repetitions || 0;
      return sum + distance * sets * repetitions;
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

    const times = filteredResults
      .map(result => result.time_s)
      .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));

    let bestTime: number | null = null;
    let bestTimeDistance: number | null = null;

    if (times.length) {
      bestTime = Math.min(...times);
      const bestResult = filteredResults.find(result => result.time_s === bestTime);
      if (bestResult?.exercise_id) {
        const exercise = distanceFilteredExercises.find(ex => ex.id === bestResult.exercise_id);
        if (exercise?.distance_m) {
          bestTimeDistance = exercise.distance_m;
        }
      }
    }

    const avgTime = times.length ? times.reduce((sum, time) => sum + time, 0) / times.length : null;

    const metricsCount = metrics.length;

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
    for (const result of filteredResults) {
      if (!result.exercise_id || typeof result.time_s !== 'number') continue;
      const exercise = distanceFilteredExercises.find(ex => ex.id === result.exercise_id);
      const distance = exercise?.distance_m;
      if (!distance) continue;
      const existing = pbMap.get(distance);
      if (existing == null || result.time_s < existing) {
        pbMap.set(distance, result.time_s);
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
    if (metricsCount > 0) {
      insights.push(`${metricsCount} metriche monitorate nel periodo selezionato`);
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
      metricsCount,
      highIntensitySessions,
      lowIntensitySessions,
      typeBreakdown,
      pbByDistance,
      insights,
    });

    setLoading(false);
  }

  function resetFilters() {
    setFromDate('');
    setToDate('');
    setDistanceFilter('all');
    setTypeFilter('');
    setBlockFilter('');
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
      </section>

      <Card className="border-none shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
            <Filter className="h-5 w-5 text-sky-600" /> Filtri
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
              <Label className="text-xs font-semibold text-slate-600">Tipo</Label>
              <select
                value={typeFilter}
                onChange={event => setTypeFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-400 focus:bg-white"
              >
                <option value="">Tutti</option>
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Distanza</Label>
              <select
                value={distanceFilter}
                onChange={event => setDistanceFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-400 focus:bg-white"
              >
                {distanceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
                    title="Metriche monitorate"
                    value={formatNumber(stats.metricsCount)}
                    subtitle="Valori collegati alle sessioni"
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
  icon: React.ReactNode;
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
