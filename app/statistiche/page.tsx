'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

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
  { value: 'gara', label: 'Gara' },
  { value: 'scarico', label: 'Scarico' },
  { value: 'recupero', label: 'Recupero' },
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

type ExerciseBlockRow = {
  id: string;
  session_id: string | null;
  block_number: number | null;
  name: string | null;
  rest_after_block_s: number | null;
};

type ExerciseRow = {
  id: string;
  block_id: string | null;
  exercise_number: number | null;
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
  distance_m: number | null;
  time_s: number | null;
  recovery_post_s: number | null;
  intensity: number | null;
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
  // Nuovi campi per analisi avanzate
  weeklyVolume: { week: string; volume: number; sessions: number }[];
  timeProgressionByDistance: { [distance: number]: { date: string; time: number }[] };
  intensityDistribution: { range: string; count: number }[];
  avgSpeed: number | null;
  trainingDensity: number;
  workload: number;
  optimalRecovery: number | null;
  improvementTrend: number | null;
  comparisonPreviousPeriod: {
    sessions: number;
    volume: number;
    avgIntensity: number;
  } | null;
  performanceByDayOfWeek: { day: string; avgTime: number | null; count: number }[];
  alerts: { type: 'warning' | 'info' | 'success'; message: string }[];
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
  const [activeTab, setActiveTab] = useState<'base' | 'graphs' | 'advanced' | 'insights'>('base');
  const [rangePreset, setRangePreset] = useState<string>('');

  async function loadBlocks() {
    const { data } = await supabase.from('training_blocks').select('id, name').order('start_date', {
      ascending: false,
    });
    if (data) {
      setBlocks(data as TrainingBlock[]);
    }
  }

  const loadStats = useCallback(async () => {
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
    let blocks: ExerciseBlockRow[] = [];
    const blockIdToSessionId = new Map<string, string>();
    
    if (sessionIds.length > 0) {
      const { data: blocksData } = await supabase
        .from('exercise_blocks')
        .select('id, session_id, block_number, name, rest_after_block_s')
        .in('session_id', sessionIds)
        .order('block_number', { ascending: true });
      
      if (blocksData && blocksData.length > 0) {
        blocks = blocksData as ExerciseBlockRow[];
        blocks.forEach(block => {
          if (block.session_id) {
            blockIdToSessionId.set(block.id, block.session_id);
          }
        });
        
        const blockIds = blocks.map(block => block.id);
        const { data: exercisesData } = await supabase
          .from('exercises')
          .select('id, block_id, exercise_number, discipline_type, distance_m, sets, repetitions, intensity, rest_between_sets_s')
          .in('block_id', blockIds)
          .order('exercise_number', { ascending: true });
        if (exercisesData) {
          exercises = exercisesData as ExerciseRow[];
        }
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
        .select(
          'session_id, value, unit, metric_name, metric_target, category, distance_m, time_s, recovery_post_s, intensity'
        )
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

    const distanceFilteredMetrics = metrics.filter(metric => {
      if (distanceFilter === 'all') return true;
      if (metric.distance_m == null) return false;
      return matchesDistance(metric.distance_m, distanceFilter);
    });

    const totalSessions = sessions.length;
    const totalExerciseDistance = distanceFilteredExercises.reduce((sum, exercise) => {
      const distance = exercise.distance_m || 0;
      const sets = exercise.sets || 0;
      const repetitions = exercise.repetitions || 0;
      return sum + distance * sets * repetitions;
    }, 0);
    const totalMetricDistance = distanceFilteredMetrics.reduce(
      (sum, metric) => sum + (metric.distance_m ?? 0),
      0
    );
    const totalDistance = totalExerciseDistance + totalMetricDistance;
    const avgDistancePerSession = totalSessions > 0 ? totalDistance / totalSessions : 0;

    const exerciseIntensityValues = distanceFilteredExercises
      .map(exercise => exercise.intensity)
      .filter((value): value is number => typeof value === 'number');
    const metricIntensityValues = distanceFilteredMetrics
      .map(metric => metric.intensity)
      .filter((value): value is number => typeof value === 'number');
    const intensityValues = [...exerciseIntensityValues, ...metricIntensityValues];
    const avgIntensity = intensityValues.length
      ? intensityValues.reduce((sum, value) => sum + value, 0) / intensityValues.length
      : null;

    const exerciseRestValues = distanceFilteredExercises
      .map(exercise => exercise.rest_between_sets_s)
      .filter((value): value is number => typeof value === 'number');
    const metricRestValues = distanceFilteredMetrics
      .map(metric => metric.recovery_post_s)
      .filter((value): value is number => typeof value === 'number');
    const restValues = [...exerciseRestValues, ...metricRestValues];
    const restAverage = restValues.length
      ? restValues.reduce((sum, value) => sum + value, 0) / restValues.length
      : null;

    type PerformanceEntry = { time: number; distance: number | null };

    const exerciseById = new Map(distanceFilteredExercises.map(exercise => [exercise.id, exercise]));

    const exercisePerformances: PerformanceEntry[] = [];
    for (const result of filteredResults) {
      if (typeof result.time_s !== 'number' || Number.isNaN(result.time_s)) continue;
      const exercise = result.exercise_id ? exerciseById.get(result.exercise_id) : undefined;
      exercisePerformances.push({
        time: result.time_s,
        distance: exercise?.distance_m ?? null,
      });
    }

    const metricPerformances: PerformanceEntry[] = [];
    for (const metric of distanceFilteredMetrics) {
      if (typeof metric.time_s !== 'number' || Number.isNaN(metric.time_s)) continue;
      metricPerformances.push({
        time: metric.time_s,
        distance: metric.distance_m ?? null,
      });
    }

    const performances = [...exercisePerformances, ...metricPerformances];
    const times = performances.map(performance => performance.time);

    let bestTime: number | null = null;
    let bestTimeDistance: number | null = null;

    if (times.length) {
      bestTime = Math.min(...times);
      const bestPerformance = performances.find(performance => performance.time === bestTime);
      if (bestPerformance) {
        bestTimeDistance = bestPerformance.distance ?? null;
      }
    }

    const avgTime = times.length ? times.reduce((sum, time) => sum + time, 0) / times.length : null;

    const metricsCount = metrics.length;

    const highIntensitySessionIds = new Set<string>();
    distanceFilteredExercises.forEach(exercise => {
      if ((exercise.intensity || 0) >= 8 && exercise.block_id) {
        const sessionId = blockIdToSessionId.get(exercise.block_id);
        if (sessionId) highIntensitySessionIds.add(sessionId);
      }
    });
    distanceFilteredMetrics.forEach(metric => {
      if ((metric.intensity || 0) >= 8 && metric.session_id) {
        highIntensitySessionIds.add(metric.session_id);
      }
    });
    const highIntensitySessions = highIntensitySessionIds.size;

    const lowIntensitySessionIds = new Set<string>();
    distanceFilteredExercises.forEach(exercise => {
      if ((exercise.intensity || 0) <= 4 && exercise.block_id) {
        const sessionId = blockIdToSessionId.get(exercise.block_id);
        if (sessionId) lowIntensitySessionIds.add(sessionId);
      }
    });
    distanceFilteredMetrics.forEach(metric => {
      if ((metric.intensity || 0) <= 4 && metric.session_id) {
        lowIntensitySessionIds.add(metric.session_id);
      }
    });
    const lowIntensitySessions = lowIntensitySessionIds.size;

    const typeBreakdownMap = sessions.reduce<Record<string, number>>((acc, session) => {
      const key = session.type ?? 'Altro';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const typeBreakdown = Object.entries(typeBreakdownMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const pbMap = new Map<number, number>();
    for (const performance of performances) {
      if (performance.distance == null) continue;
      const existing = pbMap.get(performance.distance);
      if (existing == null || performance.time < existing) {
        pbMap.set(performance.distance, performance.time);
      }
    }
    const pbByDistance = Array.from(pbMap.entries())
      .map(([distance, time]) => ({ distance, time }))
      .sort((a, b) => a.distance - b.distance);

    const insights: string[] = [];
    if (bestTime != null) {
      if (bestTimeDistance != null) {
        insights.push(`PB sui ${bestTimeDistance}m: ${bestTime.toFixed(2)}s`);
      } else {
        insights.push(`Tempo migliore registrato: ${bestTime.toFixed(2)}s`);
      }
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

    // ============================================
    // NUOVI CALCOLI PER ANALISI AVANZATE
    // ============================================

    // 1. Volume settimanale
    const weeklyVolumeMap = new Map<string, { volume: number; sessions: Set<string> }>();
    sessions.forEach(session => {
      if (!session.date) return;
      const date = new Date(session.date);
      // Calcola il lunedì della settimana
      const monday = new Date(date);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      const weekKey = monday.toISOString().split('T')[0];
      
      if (!weeklyVolumeMap.has(weekKey)) {
        weeklyVolumeMap.set(weekKey, { volume: 0, sessions: new Set() });
      }
      
      const weekData = weeklyVolumeMap.get(weekKey)!;
      weekData.sessions.add(session.id);
      
      // Calcola volume per questa sessione
      const sessionExercises = distanceFilteredExercises.filter(ex => {
        if (!ex.block_id) return false;
        return blockIdToSessionId.get(ex.block_id) === session.id;
      });
      const sessionVolume = sessionExercises.reduce((sum, ex) => {
        return sum + (ex.distance_m || 0) * (ex.sets || 0) * (ex.repetitions || 0);
      }, 0);
      weekData.volume += sessionVolume;
    });

    const weeklyVolume = Array.from(weeklyVolumeMap.entries())
      .map(([week, data]) => ({
        week: new Date(week).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
        volume: data.volume,
        sessions: data.sessions.size,
      }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
      .slice(-8); // Ultime 8 settimane

    // 2. Progressione tempi per distanza (per grafici)
    const timeProgressionByDistance: { [distance: number]: { date: string; time: number }[] } = {};
    
    for (const performance of performances) {
      if (performance.distance == null) continue;
      if (!timeProgressionByDistance[performance.distance]) {
        timeProgressionByDistance[performance.distance] = [];
      }
      
      // Trova la data associata alla performance
      let perfDate = '';
      const exercise = exerciseById.get(performance.time.toString()); // Questo è un workaround
      if (exercise?.block_id) {
        const sessionId = blockIdToSessionId.get(exercise.block_id);
        const session = sessions.find(s => s.id === sessionId);
        if (session?.date) perfDate = session.date;
      }
      
      if (perfDate) {
        timeProgressionByDistance[performance.distance].push({
          date: perfDate,
          time: performance.time,
        });
      }
    }

    // Ordina per data
    Object.keys(timeProgressionByDistance).forEach(distance => {
      timeProgressionByDistance[Number(distance)].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    });

    // 3. Distribuzione intensità
    const intensityRanges = [
      { range: '1-3 (Leggero)', min: 1, max: 3 },
      { range: '4-6 (Medio)', min: 4, max: 6 },
      { range: '7-8 (Alto)', min: 7, max: 8 },
      { range: '9-10 (Massimo)', min: 9, max: 10 },
    ];

    const intensityDistribution = intensityRanges.map(range => ({
      range: range.range,
      count: intensityValues.filter(v => v >= range.min && v <= range.max).length,
    }));

    // 4. Velocità media (m/s)
    const speedCalculations = performances
      .filter(p => p.distance && p.time)
      .map(p => p.distance! / p.time);
    const avgSpeed = speedCalculations.length
      ? speedCalculations.reduce((sum, s) => sum + s, 0) / speedCalculations.length
      : null;

    // 5. Densità allenamento (sessioni per settimana)
    const dateRange = sessions.reduce((range, s) => {
      if (!s.date) return range;
      const date = new Date(s.date).getTime();
      return {
        min: range.min ? Math.min(range.min, date) : date,
        max: range.max ? Math.max(range.max, date) : date,
      };
    }, { min: 0, max: 0 });

    const weeks = dateRange.min && dateRange.max
      ? Math.max(1, (dateRange.max - dateRange.min) / (7 * 24 * 60 * 60 * 1000))
      : 1;
    const trainingDensity = totalSessions / weeks;

    // 6. Carico di lavoro (volume × intensità media)
    const workload = avgIntensity ? (totalDistance * avgIntensity) / 10 : 0;

    // 7. Recupero ottimale (recupero medio delle migliori performance)
    const topPerformances = performances
      .filter(p => p.time && p.time < (avgTime || Infinity))
      .slice(0, 10); // Top 10 performance

    const topPerformanceRecoveries: number[] = [];
    topPerformances.forEach(perf => {
      const exercise = Array.from(exerciseById.values()).find(ex => {
        const exResults = filteredResults.filter(r => r.exercise_id === ex.id);
        return exResults.some(r => r.time_s === perf.time);
      });
      if (exercise?.rest_between_sets_s) {
        topPerformanceRecoveries.push(exercise.rest_between_sets_s);
      }
    });

    const optimalRecovery = topPerformanceRecoveries.length
      ? topPerformanceRecoveries.reduce((sum, r) => sum + r, 0) / topPerformanceRecoveries.length
      : null;

    // 8. Trend di miglioramento (% miglioramento PB nelle ultime settimane)
    let improvementTrend: number | null = null;
    if (pbByDistance.length > 0 && timeProgressionByDistance) {
      const improvementPercentages: number[] = [];
      
      Object.entries(timeProgressionByDistance).forEach(([distance, progression]) => {
        if (progression.length >= 2) {
          const recent = progression.slice(-3); // Ultime 3 performance
          const first = recent[0].time;
          const last = recent[recent.length - 1].time;
          const improvement = ((first - last) / first) * 100;
          if (!isNaN(improvement)) improvementPercentages.push(improvement);
        }
      });

      if (improvementPercentages.length > 0) {
        improvementTrend = improvementPercentages.reduce((sum, p) => sum + p, 0) / improvementPercentages.length;
      }
    }

    // 9. Confronto con periodo precedente
    let comparisonPreviousPeriod: StatsSnapshot['comparisonPreviousPeriod'] = null;
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      const periodDays = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
      
      const prevFrom = new Date(from);
      prevFrom.setDate(from.getDate() - periodDays);
      const prevTo = new Date(from);
      prevTo.setDate(from.getDate() - 1);

      let prevQuery = supabase
        .from('training_sessions')
        .select('id, date')
        .gte('date', prevFrom.toISOString().split('T')[0])
        .lte('date', prevTo.toISOString().split('T')[0]);

      if (typeFilter) prevQuery = prevQuery.eq('type', typeFilter);
      if (blockFilter) prevQuery = prevQuery.eq('block_id', blockFilter);

      const { data: prevSessions } = await prevQuery;
      
      if (prevSessions && prevSessions.length > 0) {
        const prevSessionIds = prevSessions.map((s: any) => s.id);
        
        const { data: prevBlocks } = await supabase
          .from('exercise_blocks')
          .select('id')
          .in('session_id', prevSessionIds);

        if (prevBlocks && prevBlocks.length > 0) {
          const prevBlockIds = (prevBlocks as any[]).map(b => b.id);
          
          const { data: prevExercises } = await supabase
            .from('exercises')
            .select('distance_m, sets, repetitions, intensity')
            .in('block_id', prevBlockIds);

          if (prevExercises) {
            const prevVolume = (prevExercises as any[]).reduce((sum, ex) => 
              sum + (ex.distance_m || 0) * (ex.sets || 0) * (ex.repetitions || 0), 0
            );
            
            const prevIntensities = (prevExercises as any[])
              .map(ex => ex.intensity)
              .filter((v): v is number => typeof v === 'number');
            const prevAvgIntensity = prevIntensities.length
              ? prevIntensities.reduce((sum, v) => sum + v, 0) / prevIntensities.length
              : 0;

            comparisonPreviousPeriod = {
              sessions: prevSessions.length,
              volume: prevVolume,
              avgIntensity: prevAvgIntensity,
            };
          }
        }
      }
    }

    // 10. Performance per giorno della settimana
    const performanceByDay = new Map<number, { times: number[]; count: number }>();
    
    sessions.forEach(session => {
      if (!session.date) return;
      const dayOfWeek = new Date(session.date).getDay();
      
      const sessionPerformances = performances.filter(p => {
        // Trova se questa performance appartiene a questa sessione
        const exercise = Array.from(exerciseById.values()).find(ex => {
          if (!ex.block_id) return false;
          return blockIdToSessionId.get(ex.block_id) === session.id;
        });
        return exercise != null;
      });

      if (!performanceByDay.has(dayOfWeek)) {
        performanceByDay.set(dayOfWeek, { times: [], count: 0 });
      }

      const dayData = performanceByDay.get(dayOfWeek)!;
      dayData.count += 1;
      sessionPerformances.forEach(p => {
        if (p.time) dayData.times.push(p.time);
      });
    });

    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const performanceByDayOfWeek = Array.from(performanceByDay.entries())
      .map(([day, data]) => ({
        day: dayNames[day],
        avgTime: data.times.length ? data.times.reduce((sum, t) => sum + t, 0) / data.times.length : null,
        count: data.count,
      }))
      .sort((a, b) => dayNames.indexOf(a.day) - dayNames.indexOf(b.day));

    // 11. Alert e suggerimenti intelligenti
    const alerts: StatsSnapshot['alerts'] = [];

    // Alert sovrallenamento
    if (trainingDensity > 5) {
      alerts.push({
        type: 'warning',
        message: `Stai allenandoti ${trainingDensity.toFixed(1)} volte a settimana. Considera di includere più giorni di recupero.`,
      });
    }

    // Alert intensità troppo alta
    const highIntensityPercentage = (highIntensitySessions / totalSessions) * 100;
    if (highIntensityPercentage > 70) {
      alerts.push({
        type: 'warning',
        message: `${highIntensityPercentage.toFixed(0)}% delle sessioni sono ad alta intensità. Bilancia con sedute più leggere.`,
      });
    }

    // Congratulazioni miglioramento
    if (improvementTrend && improvementTrend > 2) {
      alerts.push({
        type: 'success',
        message: `Ottimo! I tuoi tempi stanno migliorando in media del ${improvementTrend.toFixed(1)}%. Continua così!`,
      });
    }

    // Suggerimento recupero
    if (optimalRecovery && restAverage && Math.abs(restAverage - optimalRecovery) > 60) {
      alerts.push({
        type: 'info',
        message: `Le tue migliori performance hanno recuperi medi di ${Math.round(optimalRecovery)}s. Attuale: ${Math.round(restAverage)}s.`,
      });
    }

    // Confronto periodo precedente
    if (comparisonPreviousPeriod) {
      const volumeChange = ((totalDistance - comparisonPreviousPeriod.volume) / comparisonPreviousPeriod.volume) * 100;
      if (Math.abs(volumeChange) > 20) {
        alerts.push({
          type: volumeChange > 0 ? 'info' : 'warning',
          message: `Volume ${volumeChange > 0 ? 'aumentato' : 'diminuito'} del ${Math.abs(volumeChange).toFixed(0)}% rispetto al periodo precedente.`,
        });
      }
    }

    // Densità troppo bassa
    if (trainingDensity < 2 && totalSessions > 0) {
      alerts.push({
        type: 'info',
        message: `Stai allenandoti solo ${trainingDensity.toFixed(1)} volte a settimana. Considera di aumentare la frequenza.`,
      });
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
      // Nuove metriche
      weeklyVolume,
      timeProgressionByDistance,
      intensityDistribution,
      avgSpeed,
      trainingDensity,
      workload,
      optimalRecovery,
      improvementTrend,
      comparisonPreviousPeriod,
      performanceByDayOfWeek,
      alerts,
    });

    setLoading(false);
  }, [blockFilter, distanceFilter, fromDate, toDate, typeFilter]);

  useEffect(() => {
    void loadBlocks();
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  function applyRangePreset(key: string) {
    if (rangePreset === key) {
      setRangePreset('');
      setFromDate('');
      setToDate('');
      return;
    }

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
  }

  const tabs = useMemo(
    () => [
      { key: 'base', label: 'Panoramica' },
      { key: 'graphs', label: 'Grafici' },
      { key: 'advanced', label: 'Analisi Avanzate' },
      { key: 'insights', label: 'Insights & Consigli' },
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
        label: 'Metriche monitorate',
        value: stats ? formatNumber(stats.metricsCount) : '—',
        icon: Brain,
      },
    ],
    [stats]
  );

  return (
    <div className="space-y-4 animate-page">
      <section className="rounded-3xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-500 p-5 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1 text-[11px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/10"
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

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-4">
          {/* Range Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-600 mr-2">Periodo:</span>
            {rangePresets.map(preset => {
              const isActive = rangePreset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => applyRangePreset(preset.key)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-slate-50'
                  )}
                  aria-pressed={isActive}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100"></div>

          {/* Date Range + Reset */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-5 space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Da</Label>
              <Input 
                type="date" 
                value={fromDate} 
                onChange={event => handleFromDateChange(event.target.value)}
                className="h-9"
              />
            </div>
            <div className="lg:col-span-5 space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">A</Label>
              <Input 
                type="date" 
                value={toDate} 
                onChange={event => handleToDateChange(event.target.value)}
                className="h-9"
              />
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

          {/* Filters Row */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Tipo</Label>
              <div className="flex flex-wrap gap-1.5">
                {sessionTypeFilters.map(option => {
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
                      aria-pressed={isActive}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Blocco</Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setBlockFilter('')}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    blockFilter
                      ? 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50'
                      : 'border-emerald-500 bg-emerald-50 text-emerald-700'
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
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        isActive
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50'
                      )}
                      aria-pressed={isActive}
                    >
                      {block.name ?? 'Senza nome'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Distanza</Label>
              <div className="flex flex-wrap gap-1.5">
                {distanceOptions.map(option => {
                  const isActive = distanceFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDistanceFilter(option.value)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        isActive
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50'
                      )}
                      aria-pressed={isActive}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg">
        <CardHeader className="pb-2.5">
          <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
            <TrendingUp className="h-5 w-5 text-sky-600" strokeWidth={2} /> Andamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Calcolo statistiche...
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
                      icon={<Activity className="h-5 w-5" strokeWidth={2} />}
                      accent="bg-sky-100 text-sky-600"
                    />
                    <SummaryCard
                      title="Distanza totale"
                      value={`${formatNumber(stats.totalDistance)} m`}
                      subtitle="Somma di tutte le ripetute"
                      icon={<BarChart3 className="h-5 w-5" strokeWidth={2} />}
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
                      icon={<Medal className="h-5 w-5" strokeWidth={2} />}
                      accent="bg-amber-100 text-amber-600"
                    />
                    <SummaryCard
                      title="Tempo medio"
                      value={stats.avgTime ? `${stats.avgTime.toFixed(2)} s` : 'N/D'}
                      subtitle="Media delle prove cronometrate"
                      icon={<Target className="h-5 w-5" strokeWidth={2} />}
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
                          className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
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

              {activeTab === 'graphs' && (
                <div className="space-y-4">
                  {/* Alert e suggerimenti in evidenza */}
                  {stats.alerts.length > 0 && (
                    <div className="space-y-2">
                      {stats.alerts.map((alert, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'flex items-start gap-3 rounded-2xl border p-4 text-sm',
                            alert.type === 'warning' && 'border-amber-200 bg-amber-50 text-amber-900',
                            alert.type === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
                            alert.type === 'info' && 'border-sky-200 bg-sky-50 text-sky-900'
                          )}
                        >
                          {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" strokeWidth={2} />}
                          {alert.type === 'success' && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" strokeWidth={2} />}
                          {alert.type === 'info' && <Sparkles className="h-5 w-5 flex-shrink-0 text-sky-600" strokeWidth={2} />}
                          <p>{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grafico Volume Settimanale */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                      <BarChart3 className="h-5 w-5 text-sky-600" strokeWidth={2} />
                      Volume Settimanale
                    </h3>
                    {stats.weeklyVolume.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={stats.weeklyVolume}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#64748b" />
                          <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              fontSize: '12px',
                            }}
                            formatter={(value: any) => [`${value} m`, 'Volume']}
                          />
                          <Bar dataKey="volume" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="py-12 text-center text-sm text-slate-500">
                        Non ci sono dati sufficienti per visualizzare il grafico
                      </p>
                    )}
                  </div>

                  {/* Grafico Distribuzione Intensità */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                        <Zap className="h-5 w-5 text-violet-600" strokeWidth={2} />
                        Distribuzione Intensità
                      </h3>
                      {stats.intensityDistribution.some(d => d.count > 0) ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={stats.intensityDistribution.filter(d => d.count > 0)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry: any) => `${entry.range}: ${((entry.percent || 0) * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                            >
                              {stats.intensityDistribution.filter(d => d.count > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#94a3b8', '#60a5fa', '#f59e0b', '#ef4444'][index % 4]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="py-12 text-center text-sm text-slate-500">
                          Registra l'intensità delle sessioni per visualizzare la distribuzione
                        </p>
                      )}
                    </div>

                    {/* Performance per giorno della settimana */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                        <Calendar className="h-5 w-5 text-indigo-600" strokeWidth={2} />
                        Performance per Giorno
                      </h3>
                      {stats.performanceByDayOfWeek.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <RechartsBarChart data={stats.performanceByDayOfWeek}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#64748b" angle={-45} textAnchor="end" height={80} />
                            <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '12px',
                              }}
                              formatter={(value: any) => value ? [`${value.toFixed(2)} s`, 'Tempo medio'] : ['N/D', 'Tempo medio']}
                            />
                            <Bar dataKey="avgTime" fill="#6366f1" radius={[8, 8, 0, 0]} />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="py-12 text-center text-sm text-slate-500">
                          Aggiungi più sessioni per analizzare i pattern settimanali
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Grafici progressione tempi per distanza */}
                  {Object.keys(stats.timeProgressionByDistance).length > 0 && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                        <TrendingUp className="h-5 w-5 text-emerald-600" strokeWidth={2} />
                        Progressione Tempi per Distanza
                      </h3>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {Object.entries(stats.timeProgressionByDistance)
                          .slice(0, 4)
                          .map(([distance, progression]) => (
                            <div key={distance}>
                              <p className="mb-2 text-sm font-semibold text-slate-700">{distance}m</p>
                              {progression.length > 1 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                  <AreaChart data={progression}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                      dataKey="date"
                                      tick={{ fontSize: 10 }}
                                      stroke="#64748b"
                                      tickFormatter={(value) => new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} stroke="#64748b" domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                                    <Tooltip
                                      contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                      }}
                                      labelFormatter={(value) => new Date(value).toLocaleDateString('it-IT')}
                                      formatter={(value: any) => [`${value.toFixed(2)} s`, 'Tempo']}
                                    />
                                    <Area type="monotone" dataKey="time" stroke="#10b981" fill="#d1fae5" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              ) : (
                                <p className="py-8 text-center text-xs text-slate-500">
                                  Servono almeno 2 performance per visualizzare il trend
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="space-y-4">
                  {/* Metriche avanzate principali */}
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                      title="Velocità media"
                      value={stats.avgSpeed ? `${stats.avgSpeed.toFixed(2)} m/s` : 'N/D'}
                      subtitle={stats.avgSpeed ? `≈ ${(stats.avgSpeed * 3.6).toFixed(1)} km/h` : 'Registra tempi per calcolare'}
                      icon={<Zap className="h-5 w-5" strokeWidth={2} />}
                      accent="bg-amber-100 text-amber-600"
                    />
                    <SummaryCard
                      title="Densità allenamento"
                      value={`${stats.trainingDensity.toFixed(1)} /settimana`}
                      subtitle="Frequenza media sessioni"
                      icon={<Calendar className="h-5 w-5" strokeWidth={2} />}
                      accent="bg-sky-100 text-sky-600"
                    />
                    <SummaryCard
                      title="Carico di lavoro"
                      value={formatNumber(Math.round(stats.workload))}
                      subtitle="Volume × Intensità"
                      icon={<Activity className="h-5 w-5" strokeWidth={2} />}
                      accent="bg-violet-100 text-violet-600"
                    />
                    <SummaryCard
                      title="Recupero ottimale"
                      value={stats.optimalRecovery ? `${Math.round(stats.optimalRecovery)} s` : 'N/D'}
                      subtitle="Medio nelle migliori performance"
                      icon={<Clock className="h-5 w-5" strokeWidth={2} />}
                      accent="bg-emerald-100 text-emerald-600"
                    />
                  </div>

                  {/* Trend di miglioramento */}
                  {stats.improvementTrend !== null && (
                    <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-5 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="flex items-center gap-2 text-lg font-semibold text-emerald-900">
                            <TrendingUp className="h-5 w-5 text-emerald-600" strokeWidth={2} />
                            Trend di Miglioramento
                          </h3>
                          <p className="mt-2 text-sm text-emerald-700">
                            Analisi dell'andamento delle tue performance recenti
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-2">
                            {stats.improvementTrend > 0 ? (
                              <ArrowUpRight className="h-8 w-8 text-emerald-600" />
                            ) : stats.improvementTrend < 0 ? (
                              <ArrowDownRight className="h-8 w-8 text-rose-600" />
                            ) : (
                              <Minus className="h-8 w-8 text-slate-600" />
                            )}
                            <span className={cn(
                              "text-3xl font-bold",
                              stats.improvementTrend > 0 ? "text-emerald-700" : stats.improvementTrend < 0 ? "text-rose-700" : "text-slate-700"
                            )}>
                              {Math.abs(stats.improvementTrend).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-emerald-600">
                            {stats.improvementTrend > 0 ? 'Miglioramento' : stats.improvementTrend < 0 ? 'Peggioramento' : 'Stabile'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confronto con periodo precedente */}
                  {stats.comparisonPreviousPeriod && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                        <BarChart className="h-5 w-5 text-indigo-600" strokeWidth={2} />
                        Confronto con Periodo Precedente
                      </h3>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-slate-600">Sessioni</p>
                          <div className="mt-2 flex items-end gap-2">
                            <p className="text-2xl font-bold text-slate-800">{stats.totalSessions}</p>
                            <div className="flex items-center gap-1 text-xs">
                              {stats.totalSessions > stats.comparisonPreviousPeriod.sessions ? (
                                <>
                                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                                  <span className="font-semibold text-emerald-600">
                                    +{stats.totalSessions - stats.comparisonPreviousPeriod.sessions}
                                  </span>
                                </>
                              ) : stats.totalSessions < stats.comparisonPreviousPeriod.sessions ? (
                                <>
                                  <ArrowDownRight className="h-4 w-4 text-rose-600" />
                                  <span className="font-semibold text-rose-600">
                                    {stats.totalSessions - stats.comparisonPreviousPeriod.sessions}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-500">Invariato</span>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Precedente: {stats.comparisonPreviousPeriod.sessions}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-slate-600">Volume (m)</p>
                          <div className="mt-2 flex items-end gap-2">
                            <p className="text-2xl font-bold text-slate-800">{formatNumber(stats.totalDistance)}</p>
                            <div className="flex items-center gap-1 text-xs">
                              {stats.totalDistance > stats.comparisonPreviousPeriod.volume ? (
                                <>
                                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                                  <span className="font-semibold text-emerald-600">
                                    {(((stats.totalDistance - stats.comparisonPreviousPeriod.volume) / stats.comparisonPreviousPeriod.volume) * 100).toFixed(0)}%
                                  </span>
                                </>
                              ) : stats.totalDistance < stats.comparisonPreviousPeriod.volume ? (
                                <>
                                  <ArrowDownRight className="h-4 w-4 text-rose-600" />
                                  <span className="font-semibold text-rose-600">
                                    {(((stats.totalDistance - stats.comparisonPreviousPeriod.volume) / stats.comparisonPreviousPeriod.volume) * 100).toFixed(0)}%
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-500">Invariato</span>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Precedente: {formatNumber(stats.comparisonPreviousPeriod.volume)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-slate-600">Intensità media</p>
                          <div className="mt-2 flex items-end gap-2">
                            <p className="text-2xl font-bold text-slate-800">
                              {stats.avgIntensity ? stats.avgIntensity.toFixed(1) : 'N/D'}
                            </p>
                            {stats.avgIntensity && (
                              <div className="flex items-center gap-1 text-xs">
                                {stats.avgIntensity > stats.comparisonPreviousPeriod.avgIntensity ? (
                                  <>
                                    <ArrowUpRight className="h-4 w-4 text-amber-600" />
                                    <span className="font-semibold text-amber-600">
                                      +{(stats.avgIntensity - stats.comparisonPreviousPeriod.avgIntensity).toFixed(1)}
                                    </span>
                                  </>
                                ) : stats.avgIntensity < stats.comparisonPreviousPeriod.avgIntensity ? (
                                  <>
                                    <ArrowDownRight className="h-4 w-4 text-sky-600" />
                                    <span className="font-semibold text-sky-600">
                                      {(stats.avgIntensity - stats.comparisonPreviousPeriod.avgIntensity).toFixed(1)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-slate-500">Invariato</span>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Precedente: {stats.comparisonPreviousPeriod.avgIntensity.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Altre metriche avanzate */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-700">Distribuzione Intensità</h3>
                      <div className="mt-3 space-y-2">
                        {stats.intensityDistribution.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-xs">
                            <span>{item.range}</span>
                            <span className="font-semibold">{item.count} sessioni</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-700">Riepilogo Avanzato</h3>
                      <ul className="mt-3 space-y-2 text-xs text-slate-600">
                        <li className="flex items-center justify-between rounded-2xl bg-sky-50 px-3 py-2">
                          <span>Sessioni alta intensità</span>
                          <span className="font-semibold text-sky-700">{stats.highIntensitySessions}</span>
                        </li>
                        <li className="flex items-center justify-between rounded-2xl bg-emerald-50 px-3 py-2">
                          <span>Sessioni bassa intensità</span>
                          <span className="font-semibold text-emerald-700">{stats.lowIntensitySessions}</span>
                        </li>
                        <li className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                          <span>Recupero medio</span>
                          <span className="font-semibold">{stats.restAverage ? `${Math.round(stats.restAverage)}s` : 'N/D'}</span>
                        </li>
                        <li className="flex items-center justify-between rounded-2xl bg-violet-50 px-3 py-2">
                          <span>Metriche totali</span>
                          <span className="font-semibold text-violet-700">{stats.metricsCount}</span>
                        </li>
                      </ul>
                    </div>
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
