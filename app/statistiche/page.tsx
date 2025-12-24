'use client';

import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/lib/useLocalStorage';
import {
  calculateRPEDistribution,
  analyzeRecovery,
  calculatePersonalBests,
  calculateTrainingLoad,
  analyzeLocationStats,
  calculateMonthlyProgress,
  analyzePerformanceTrends,
  generateSmartInsights,
  calculatePhaseStats,
} from '@/lib/stats-calculator';
import {
  exportToCSV,
  exportStatisticsToCSV,
  downloadChartAsPNG,
  generatePDFReport,
} from '@/lib/export-utils';
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
  Download,
  FileText,
  MapPin,
  Gauge,
  Award,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Settings,
  Info,
  ChevronRight,
  ChevronDown,
  Star,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatsSkeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { DataManagement } from '@/components/ui/data-management';
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
  ComposedChart,
} from 'recharts';
import { 
  pageTransition, 
  fadeInUp, 
  staggerContainer, 
  staggerItem, 
  scaleIn 
} from '@/lib/animations';

const distanceOptions = [
  { value: 'all', label: 'Tutte' },
  { value: '60', label: '60m' },
  { value: '100', label: '100m' },
  { value: '200', label: '200m' },
  { value: '400', label: '400m' },
  { value: 'short', label: 'Sprint corti (< 80m)' },
  { value: 'mid', label: 'Medi (80-200m)' },
  { value: 'long', label: 'Lunghi (> 200m)' },
];

const sessionTypeFilters = [
  { value: '', label: 'Tutti' },
  { value: 'pista', label: 'Pista' },
  { value: 'test', label: 'Test' },
  { value: 'gara', label: 'Gara' },
  { value: 'massimale', label: 'Massimali' },
  { value: 'scarico', label: 'Scarico' },
  { value: 'recupero', label: 'Recupero' },
  { value: 'altro', label: 'Altro' },
];

const rangePresets = [
  { key: '7', label: 'Ultimi 7 giorni', days: 7 },
  { key: '14', label: 'Ultimi 14 giorni', days: 14 },
  { key: '30', label: 'Ultimi 30 giorni', days: 30 },
  { key: '90', label: 'Ultimi 90 giorni', days: 90 },
  { key: 'month', label: 'Questo mese', type: 'current-month' as const },
  { key: 'year', label: 'Quest\'anno', type: 'current-year' as const },
  { key: 'season', label: 'Stagione (6 mesi)', monthsBack: 6 },
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
  // Nuove metriche aggiuntive
  rpeDistribution: { rpe: number; count: number; percentage: number }[];
  avgRPE: number | null;
  recoveryAnalysis: {
    avgRecoveryBetweenReps: number | null;
    avgRecoveryBetweenSets: number | null;
    optimalRange: { min: number; max: number } | null;
    outliers: { session: string; value: number }[];
  };
  personalBests: {
    distance: number;
    time: number;
    date: string;
    improvement: number | null;
    sessionType: string | null;
  }[];
  trainingLoad: {
    date: string;
    load: number;
    acuteLoad: number;
    chronicLoad: number;
    ratio: number;
  }[];
  locationStats: {
    location: string;
    sessions: number;
    avgPerformance: number | null;
    bestPerformance: number | null;
  }[];
  phaseStats: {
    phase: string;
    sessions: number;
    volume: number;
    avgIntensity: number | null;
  }[];
  monthlyProgress: {
    month: string;
    sessions: number;
    distance: number;
    avgSpeed: number | null;
    pbs: number;
  }[];
  performanceTrends: {
    distance: number;
    trend: 'improving' | 'stable' | 'declining';
    changePercentage: number;
    recentAvg: number;
    previousAvg: number;
  }[];
  smartInsights: {
    category: 'performance' | 'recovery' | 'volume' | 'intensity' | 'health';
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    recommendation: string;
  }[];
};

function matchesDistance(distance: number | null, filter: string) {
  if (filter === 'all' || distance == null) return true;
  // Distanze specifiche (con tolleranza ±5m)
  if (filter === '60') return distance >= 55 && distance <= 65;
  if (filter === '100') return distance >= 95 && distance <= 105;
  if (filter === '200') return distance >= 195 && distance <= 205;
  if (filter === '400') return distance >= 395 && distance <= 405;
  // Categorie generiche
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
  const [fromDate, setFromDate] = useLocalStorage('stats-fromDate', '');
  const [toDate, setToDate] = useLocalStorage('stats-toDate', '');
  const [distanceFilter, setDistanceFilter] = useLocalStorage('stats-distanceFilter', 'all');
  const [typeFilter, setTypeFilter] = useLocalStorage('stats-typeFilter', '');
  const [blockFilter, setBlockFilter] = useLocalStorage('stats-blockFilter', '');
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [stats, setStats] = useState<StatsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'base' | 'graphs' | 'advanced' | 'insights'>('base');
  const [rangePreset, setRangePreset] = useState<string>('');
  const [filtersExpanded, setFiltersExpanded] = useState(false); // Drawer filtri
  const [debouncedFilters, setDebouncedFilters] = useState({
    fromDate: '',
    toDate: '',
    typeFilter: '',
    blockFilter: '',
    distanceFilter: 'all'
  });

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

    // Usa filtri debounced per ridurre query al DB
    const { fromDate: dFromDate, toDate: dToDate, typeFilter: dTypeFilter, blockFilter: dBlockFilter, distanceFilter: dDistanceFilter } = debouncedFilters;

    // Ottimizzazione: single query con join invece di 3 query separate
    let sessionQuery = supabase
      .from('training_sessions')
      .select(`
        id, date, type, block_id,
        exercise_blocks:exercise_blocks (
          id, session_id, block_number, name, rest_after_block_s,
          exercises:exercises (
            id, block_id, exercise_number, discipline_type, distance_m, sets, repetitions, intensity, rest_between_sets_s
          )
        )
      `)
      .order('date', { ascending: false });

    if (dFromDate) sessionQuery = sessionQuery.gte('date', dFromDate);
    if (dToDate) sessionQuery = sessionQuery.lte('date', dToDate);
    if (dTypeFilter) sessionQuery = sessionQuery.eq('type', dTypeFilter);
    if (dBlockFilter) sessionQuery = sessionQuery.eq('block_id', dBlockFilter);

    const { data: sessionsData, error: sessionsError } = await sessionQuery;

    if (sessionsError || !sessionsData) {
      setStats(null);
      setLoading(false);
      return;
    }

    const sessions = sessionsData as any[];
    const sessionIds = sessions.map(session => session.id);

    // Flatten exercise_blocks e exercises per elaborazione
    let exercises: ExerciseRow[] = [];
    let blocks: ExerciseBlockRow[] = [];
    const blockIdToSessionId = new Map<string, string>();
    
    sessions.forEach(session => {
      if (session.exercise_blocks) {
        session.exercise_blocks.forEach((block: any) => {
          blocks.push(block);
          if (block.session_id) {
            blockIdToSessionId.set(block.id, block.session_id);
          }
          if (block.exercises) {
            exercises.push(...block.exercises);
          }
        });
      }
    });

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

      if (dFromDate) metricsQuery = metricsQuery.gte('date', dFromDate);
      if (dToDate) metricsQuery = metricsQuery.lte('date', dToDate);

      const { data: metricsData } = await metricsQuery;
      if (metricsData) {
        metrics = metricsData as MetricRow[];
      }
    }

    const distanceFilteredExercises = exercises.filter(exercise =>
      matchesDistance(exercise.distance_m, dDistanceFilter)
    );
    const filteredExerciseIds = new Set(distanceFilteredExercises.map(exercise => exercise.id));
    const filteredResults = results.filter(result => result.exercise_id && filteredExerciseIds.has(result.exercise_id));

    const distanceFilteredMetrics = metrics.filter(metric => {
      if (dDistanceFilter === 'all') return true;
      if (metric.distance_m == null) return false;
      return matchesDistance(metric.distance_m, dDistanceFilter);
    });

    // Conta solo le sessioni che hanno effettivamente esercizi o metriche con la distanza filtrata
    const sessionIdsWithFilteredContent = new Set<string>();
    
    // Aggiungi session_id da exercises filtrati
    distanceFilteredExercises.forEach(exercise => {
      const sessionId = exercise.block_id ? blockIdToSessionId.get(exercise.block_id) : null;
      if (sessionId) sessionIdsWithFilteredContent.add(sessionId);
    });
    
    // Aggiungi session_id da metrics filtrati
    distanceFilteredMetrics.forEach(metric => {
      if (metric.session_id) sessionIdsWithFilteredContent.add(metric.session_id);
    });
    
    // Filtra le sessioni in base al filtro distanza (usato in tutte le analisi)
    const sessionsToAnalyze = dDistanceFilter === 'all' 
      ? sessions 
      : sessions.filter(s => sessionIdsWithFilteredContent.has(s.id));
    
    // Conta giorni di allenamento unici invece di singole sessioni
    const uniqueTrainingDays = new Set(sessionsToAnalyze.map(s => s.date).filter(Boolean));
    const totalSessions = uniqueTrainingDays.size;
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

    // Mappa session ID -> data per contare giorni invece di sessioni
    const sessionIdToDate = new Map<string, string>();
    sessionsToAnalyze.forEach(s => {
      if (s.id && s.date) sessionIdToDate.set(s.id, s.date);
    });

    const highIntensityDates = new Set<string>();
    distanceFilteredExercises.forEach(exercise => {
      if ((exercise.intensity || 0) >= 8 && exercise.block_id) {
        const sessionId = blockIdToSessionId.get(exercise.block_id);
        if (sessionId) {
          const date = sessionIdToDate.get(sessionId);
          if (date) highIntensityDates.add(date);
        }
      }
    });
    distanceFilteredMetrics.forEach(metric => {
      if ((metric.intensity || 0) >= 8 && metric.session_id) {
        const date = sessionIdToDate.get(metric.session_id);
        if (date) highIntensityDates.add(date);
      }
    });
    const highIntensitySessions = highIntensityDates.size;

    const lowIntensityDates = new Set<string>();
    distanceFilteredExercises.forEach(exercise => {
      if ((exercise.intensity || 0) <= 4 && exercise.block_id) {
        const sessionId = blockIdToSessionId.get(exercise.block_id);
        if (sessionId) {
          const date = sessionIdToDate.get(sessionId);
          if (date) lowIntensityDates.add(date);
        }
      }
    });
    distanceFilteredMetrics.forEach(metric => {
      if ((metric.intensity || 0) <= 4 && metric.session_id) {
        const date = sessionIdToDate.get(metric.session_id);
        if (date) lowIntensityDates.add(date);
      }
    });
    const lowIntensitySessions = lowIntensityDates.size;

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
    const weeklyVolumeMap = new Map<string, { volume: number; dates: Set<string> }>();
    sessionsToAnalyze.forEach(session => {
      if (!session.date) return;
      const date = new Date(session.date);
      // Calcola il lunedì della settimana
      const monday = new Date(date);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      const weekKey = monday.toISOString().split('T')[0];
      
      if (!weeklyVolumeMap.has(weekKey)) {
        weeklyVolumeMap.set(weekKey, { volume: 0, dates: new Set() });
      }
      
      const weekData = weeklyVolumeMap.get(weekKey)!;
      weekData.dates.add(session.date);
      
      // Calcola volume da esercizi
      const sessionExercises = distanceFilteredExercises.filter(ex => {
        if (!ex.block_id) return false;
        return blockIdToSessionId.get(ex.block_id) === session.id;
      });
      const exerciseVolume = sessionExercises.reduce((sum, ex) => {
        return sum + (ex.distance_m || 0) * (ex.sets || 0) * (ex.repetitions || 0);
      }, 0);
      
      // Calcola volume da metrics (per sessioni test/gara)
      const sessionMetrics = distanceFilteredMetrics.filter(m => m.session_id === session.id);
      const metricVolume = sessionMetrics.reduce((sum, m) => sum + (m.distance_m || 0), 0);
      
      weekData.volume += exerciseVolume + metricVolume;
    });

    const weeklyVolume = Array.from(weeklyVolumeMap.entries())
      .map(([week, data]) => ({
        week: new Date(week).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
        volume: data.volume,
        sessions: data.dates.size,
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

    // 5. Densità allenamento (giorni unici per settimana, non sessioni)
    const uniqueTrainingDates = new Set(
      sessions.filter(s => s.date).map(s => s.date!)
    );
    
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
    const trainingDensity = uniqueTrainingDates.size / weeks;

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
          .select('id, session_id')
          .in('session_id', prevSessionIds);

        if (prevBlocks && prevBlocks.length > 0) {
          const prevBlockIds = (prevBlocks as any[]).map(b => b.id);
          
          const { data: prevExercises } = await supabase
            .from('exercises')
            .select('distance_m, sets, repetitions, intensity, block_id')
            .in('block_id', prevBlockIds);

          // Fetch anche metrics del periodo precedente
          const { data: prevMetrics } = await supabase
            .from('metrics')
            .select('distance_m, intensity, session_id')
            .in('session_id', prevSessionIds);

          if (prevExercises) {
            // Filtra gli esercizi del periodo precedente per distanza
            const filteredPrevExercises = (prevExercises as any[]).filter(ex => 
              matchesDistance(ex.distance_m, distanceFilter)
            );
            
            // Filtra i metrics del periodo precedente per distanza
            const filteredPrevMetrics = (prevMetrics || []).filter((m: any) => 
              matchesDistance(m.distance_m, distanceFilter)
            );
            
            // Conta solo le sessioni che hanno esercizi o metrics con la distanza filtrata
            const prevSessionIdsWithContent = new Set<string>();
            const prevBlockIdToSessionId = new Map<string, string>();
            if (prevBlocks) {
              (prevBlocks as any[]).forEach(block => {
                if (block.id && block.session_id) {
                  prevBlockIdToSessionId.set(block.id, block.session_id);
                }
                const hasMatchingExercise = filteredPrevExercises.some(
                  (ex: any) => ex.block_id === block.id
                );
                if (hasMatchingExercise && block.session_id) {
                  prevSessionIdsWithContent.add(block.session_id);
                }
              });
            }
            
            // Aggiungi anche sessioni con metrics filtrati
            filteredPrevMetrics.forEach((m: any) => {
              if (m.session_id) {
                prevSessionIdsWithContent.add(m.session_id);
              }
            });
            
            // Mappa session ID -> data per periodo precedente
            const prevSessionIdToDate = new Map<string, string>();
            prevSessions.forEach((s: any) => {
              if (s.id && s.date) prevSessionIdToDate.set(s.id, s.date);
            });
            
            // Conta giorni di allenamento unici nel periodo precedente
            const prevUniqueDates = new Set<string>();
            if (distanceFilter === 'all') {
              prevSessions.forEach((s: any) => {
                if (s.date) prevUniqueDates.add(s.date);
              });
            } else {
              prevSessionIdsWithContent.forEach(sessionId => {
                const date = prevSessionIdToDate.get(sessionId);
                if (date) prevUniqueDates.add(date);
              });
            }
            
            const prevExerciseVolume = filteredPrevExercises.reduce((sum, ex) => 
              sum + (ex.distance_m || 0) * (ex.sets || 0) * (ex.repetitions || 0), 0
            );
            const prevMetricVolume = filteredPrevMetrics.reduce((sum: number, m: any) => 
              sum + (m.distance_m || 0), 0
            );
            const prevVolume = prevExerciseVolume + prevMetricVolume;
            
            const prevExerciseIntensities = filteredPrevExercises
              .map(ex => ex.intensity)
              .filter((v): v is number => typeof v === 'number');
            const prevMetricIntensities = filteredPrevMetrics
              .map((m: any) => m.intensity)
              .filter((v): v is number => typeof v === 'number');
            const prevIntensities = [...prevExerciseIntensities, ...prevMetricIntensities];
            const prevAvgIntensity = prevIntensities.length
              ? prevIntensities.reduce((sum, v) => sum + v, 0) / prevIntensities.length
              : 0;

            comparisonPreviousPeriod = {
              sessions: prevUniqueDates.size,
              volume: prevVolume,
              avgIntensity: prevAvgIntensity,
            };
          }
        }
      }
    }

    // 10. Performance per giorno della settimana
    const performanceByDay = new Map<number, { times: number[]; count: number }>();
    
    sessionsToAnalyze.forEach(session => {
      if (!session.date) return;
      const dayOfWeek = new Date(session.date).getDay();
      
      // Trova performance da esercizi
      const sessionExercisePerformances = performances.filter(p => {
        const exercise = Array.from(exerciseById.values()).find(ex => {
          if (!ex.block_id) return false;
          return blockIdToSessionId.get(ex.block_id) === session.id;
        });
        return exercise != null;
      });

      // Trova performance da metrics
      const sessionMetricPerformances = metricPerformances.filter(mp => {
        const metric = distanceFilteredMetrics.find(m => 
          m.session_id === session.id && m.time_s === mp.time
        );
        return metric != null;
      });

      const allSessionPerformances = [...sessionExercisePerformances, ...sessionMetricPerformances];

      if (!performanceByDay.has(dayOfWeek)) {
        performanceByDay.set(dayOfWeek, { times: [], count: 0 });
      }

      const dayData = performanceByDay.get(dayOfWeek)!;
      dayData.count += 1;
      allSessionPerformances.forEach(p => {
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

    // ============================================
    // CALCOLI AVANZATI CON STATS-CALCULATOR
    // ============================================

    // Prepara i dati per le analisi avanzate
    const sessionData = sessions.map(s => {
      const sessionExercises = distanceFilteredExercises.filter(ex => {
        if (!ex.block_id) return false;
        return blockIdToSessionId.get(ex.block_id) === s.id;
      });
      
      // Calcola volume da esercizi
      const exerciseVolume = sessionExercises.reduce((sum, ex) => 
        sum + (ex.distance_m || 0) * (ex.sets || 0) * (ex.repetitions || 0), 0
      );

      // Calcola volume da metrics (per sessioni tipo test/gara)
      const sessionMetrics = distanceFilteredMetrics.filter(m => m.session_id === s.id);
      const metricVolume = sessionMetrics.reduce((sum, m) => sum + (m.distance_m || 0), 0);

      const volume = exerciseVolume + metricVolume;

      // Calcola intensità da esercizi e metrics
      const exerciseIntensities = sessionExercises
        .map(ex => ex.intensity)
        .filter((v): v is number => typeof v === 'number');
      
      const metricIntensities = sessionMetrics
        .map(m => m.intensity)
        .filter((v): v is number => typeof v === 'number');
      
      const allIntensities = [...exerciseIntensities, ...metricIntensities];
      
      const rpe = allIntensities.length
        ? allIntensities.reduce((sum, v) => sum + v, 0) / allIntensities.length
        : undefined;

      return {
        date: s.date || '',
        volume,
        rpe,
        type: s.type || undefined,
        blockId: s.block_id || undefined,
      };
    }).filter(s => s.date);

    // 1. Distribuzione RPE
    const rpeValues = sessionData.map(s => s.rpe).filter((v): v is number => v !== undefined);
    const rpeDistribution = calculateRPEDistribution(rpeValues);
    const avgRPE = rpeValues.length
      ? rpeValues.reduce((sum, v) => sum + v, 0) / rpeValues.length
      : null;

    // 2. Analisi recupero
    const recoveryData: { sessionId: string; value: number; type: 'rep' | 'set' }[] = [];
    sessionsToAnalyze.forEach(session => {
      const sessionExercises = distanceFilteredExercises.filter(ex => {
        if (!ex.block_id) return false;
        return blockIdToSessionId.get(ex.block_id) === session.id;
      });
      
      sessionExercises.forEach(ex => {
        if (ex.rest_between_sets_s) {
          recoveryData.push({
            sessionId: session.id,
            value: ex.rest_between_sets_s,
            type: 'set',
          });
        }
      });
    });
    const recoveryAnalysis = analyzeRecovery(recoveryData);

    // 3. Personal Bests con storico
    const performanceData = performances
      .filter(p => p.distance)
      .map(p => {
        // Trova la sessione associata
        let sessionType: string | null = null;
        let perfDate = '';
        
        // Cerca prima negli esercizi
        for (const session of sessions) {
          const hasExercisePerformance = Array.from(exerciseById.values()).some(ex => {
            if (!ex.block_id) return false;
            const sessionId = blockIdToSessionId.get(ex.block_id);
            return sessionId === session.id && ex.distance_m === p.distance;
          });
          
          if (hasExercisePerformance) {
            sessionType = session.type || null;
            perfDate = session.date || '';
            break;
          }
          
          // Cerca nei metrics
          const hasMetricPerformance = distanceFilteredMetrics.some(m =>
            m.session_id === session.id && m.distance_m === p.distance && m.time_s === p.time
          );
          
          if (hasMetricPerformance) {
            sessionType = session.type || null;
            perfDate = session.date || '';
            break;
          }
        }
        
        return {
          distance: p.distance!,
          time: p.time,
          date: perfDate,
          sessionType,
        };
      });
    const personalBests = calculatePersonalBests(performanceData);

    // 4. Training Load (Acute:Chronic Workload Ratio)
    const trainingLoadData = sessionData.map(s => ({
      date: s.date,
      volume: s.volume,
      intensity: s.rpe || 5, // Default RPE 5 se non disponibile
    }));
    const trainingLoad = calculateTrainingLoad(trainingLoadData);

    // 5. Statistiche per località
    const locationData: { location: string; sessionId: string; avgTime: number | null }[] = [];
    sessionsToAnalyze.forEach(session => {
      // Performance da esercizi
      const sessionExercisePerfs = performances.filter(p => {
        const exercise = Array.from(exerciseById.values()).find(ex => {
          if (!ex.block_id) return false;
          return blockIdToSessionId.get(ex.block_id) === session.id;
        });
        return exercise != null;
      });
      
      // Performance da metrics
      const sessionMetricPerfs = metricPerformances.filter(mp => {
        const metric = distanceFilteredMetrics.find(m => 
          m.session_id === session.id && m.time_s === mp.time
        );
        return metric != null;
      });
      
      const allPerfs = [...sessionExercisePerfs, ...sessionMetricPerfs];
      
      const avgTime = allPerfs.length
        ? allPerfs.reduce((sum, p) => sum + p.time, 0) / allPerfs.length
        : null;
      
      locationData.push({
        location: session.location || 'Non specificato',
        sessionId: session.id,
        avgTime,
      });
    });
    const locationStats = analyzeLocationStats(locationData);

    // 6. Progressi mensili - RAGGRUPPA PER GIORNO (non per sessione singola)
    const dayProgressMap = new Map<string, {
      date: string;
      totalDistance: number;
      speeds: number[];
      hasPB: boolean;
    }>();
    
    sessionsToAnalyze.forEach(session => {
      if (!session.date) return;
      
      // Trova tutte le performance di questa sessione (sia da esercizi che da metriche)
      const sessionPerformances = performances.filter(p => {
        const exercise = Array.from(exerciseById.values()).find(ex => {
          if (!ex.block_id) return false;
          return blockIdToSessionId.get(ex.block_id) === session.id;
        });
        return exercise != null && p.distance;
      });
      
      // Aggiungi performance dalle metriche di questa sessione
      const sessionMetrics = distanceFilteredMetrics.filter(m => m.session_id === session.id);
      sessionMetrics.forEach(metric => {
        if (metric.distance_m && metric.time_s) {
          sessionPerformances.push({
            distance: metric.distance_m,
            time: metric.time_s,
          });
        }
      });
      
      // Anche sessioni senza performance (es. solo massimali senza tempo) vengono conteggiate
      const totalDistance = sessionPerformances.reduce((sum, p) => sum + (p.distance || 0), 0);
      const speeds = sessionPerformances
        .filter(p => p.distance && p.time)
        .map(p => p.distance! / p.time);
      
      // Controlla se questa sessione ha almeno un PB
      const hasPB = sessionPerformances.some(p => {
        const pb = pbByDistance.find(pb => pb.distance === p.distance);
        return pb && pb.time === p.time;
      });
      
      // Raggruppa per data (giorno) invece che per sessione
      if (!dayProgressMap.has(session.date)) {
        dayProgressMap.set(session.date, {
          date: session.date,
          totalDistance,
          speeds: [...speeds],
          hasPB,
        });
      } else {
        // Se già esiste una sessione in questo giorno, aggrega i dati
        const dayData = dayProgressMap.get(session.date)!;
        dayData.totalDistance += totalDistance;
        dayData.speeds.push(...speeds);
        dayData.hasPB = dayData.hasPB || hasPB;
      }
    });
    
    const monthlyProgressData = Array.from(dayProgressMap.values()).map(dayData => ({
      date: dayData.date,
      distance: dayData.totalDistance,
      avgSpeed: dayData.speeds.length > 0
        ? dayData.speeds.reduce((sum, s) => sum + s, 0) / dayData.speeds.length
        : null,
      isPB: dayData.hasPB,
    }));
    
    const monthlyProgress = calculateMonthlyProgress(monthlyProgressData);

    // 7. Trend di performance
    const performanceTrends = analyzePerformanceTrends(performanceData);

    // 8. Statistiche per fase (se disponibili blocchi)
    const phaseData = blocks.map(block => {
      const blockSessions = sessions.filter(s => s.block_id === block.id);
      const blockExercises = distanceFilteredExercises.filter(ex => {
        if (!ex.block_id) return false;
        const sessionId = blockIdToSessionId.get(ex.block_id);
        return blockSessions.some(s => s.id === sessionId);
      });
      
      // Calcola distanza da esercizi
      const exerciseDistance = blockExercises.reduce((sum, ex) => 
        sum + (ex.distance_m || 0) * (ex.sets || 0) * (ex.repetitions || 0), 0
      );
      
      // Calcola distanza da metrics per sessioni test/gara del blocco
      const blockSessionIds = blockSessions.map(s => s.id);
      const blockMetrics = distanceFilteredMetrics.filter(m => 
        m.session_id && blockSessionIds.includes(m.session_id)
      );
      const metricDistance = blockMetrics.reduce((sum, m) => sum + (m.distance_m || 0), 0);
      
      const totalDistance = exerciseDistance + metricDistance;
      
      // Calcola intensità da esercizi e metrics
      const exerciseIntensities = blockExercises
        .map(ex => ex.intensity)
        .filter((v): v is number => typeof v === 'number');
      const metricIntensities = blockMetrics
        .map(m => m.intensity)
        .filter((v): v is number => typeof v === 'number');
      const allIntensities = [...exerciseIntensities, ...metricIntensities];
      const avgIntensity = allIntensities.length
        ? allIntensities.reduce((sum, v) => sum + v, 0) / allIntensities.length
        : null;
      
      return {
        phase: block.name || null,
        distance: totalDistance,
        intensity: avgIntensity,
      };
    });
    const phaseStats = calculatePhaseStats(phaseData);

    // 9. Smart Insights
    const smartInsights = generateSmartInsights({
      trainingLoad,
      rpeDistribution,
      avgRPE,
      performanceTrends,
      recoveryAnalysis,
      totalSessions,
      recentDays: sessions.length > 0 && sessions[0].date
        ? Math.ceil((new Date().getTime() - new Date(sessions[0].date).getTime()) / (24 * 60 * 60 * 1000))
        : 0,
    });

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
      // Analisi avanzate
      rpeDistribution,
      avgRPE,
      recoveryAnalysis,
      personalBests,
      trainingLoad,
      locationStats,
      phaseStats,
      monthlyProgress,
      performanceTrends,
      smartInsights,
    });

    setLoading(false);
  }, [debouncedFilters]);

  useEffect(() => {
    void loadBlocks();
  }, []);

  // Debouncing filtri (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters({
        fromDate,
        toDate,
        typeFilter,
        blockFilter,
        distanceFilter
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [fromDate, toDate, typeFilter, blockFilter, distanceFilter]);

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
    } else if ((preset as any)?.type === 'current-month') {
      // Primo giorno del mese corrente
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if ((preset as any)?.type === 'current-year') {
      // Primo giorno dell'anno corrente
      start = new Date(today.getFullYear(), 0, 1);
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
      { key: 'base', label: 'Panoramica', badge: null },
      { key: 'graphs', label: 'Grafici', badge: null },
      { key: 'advanced', label: 'Analisi Avanzate', badge: null },
      { 
        key: 'insights', 
        label: 'Insights & Consigli', 
        badge: ((stats?.smartInsights?.length || 0) + (stats?.alerts?.length || 0)) || null 
      },
    ],
    [stats]
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
        label: 'Giorni allenamento',
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
    <ErrorBoundary>
    <motion.div 
      className="space-y-4"
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {loading ? (
        <StatsSkeleton />
      ) : (
        <>
      {/* Hero Section - Sky Blue Theme (NO animation per evitare flash) */}
      <section 
        className="rounded-2xl md:rounded-3xl bg-gradient-to-br from-sky-700 to-cyan-700 p-4 md:p-6 text-white shadow-lg"
      >
        <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <h1 className="text-xl md:text-2xl font-bold">Statistiche</h1>
            </div>
            <p className="text-sm md:text-base text-white/90 hidden md:block">
              Analizza progressi, trend e performance delle tue sessioni
            </p>
          </div>

          <motion.div 
            className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm px-4 py-2.5 md:px-5 md:py-3"
            variants={scaleIn}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-xs text-white/80 mb-0.5">Distanza totale</p>
            <p className="text-2xl md:text-3xl font-bold">
              {stats ? formatNumber(stats.totalDistance) : '—'}
            </p>
            <p className="text-[10px] text-white/70">metri</p>
          </motion.div>
        </div>

        {/* Stats Grid - 2 cols mobile, 4 desktop */}
        <motion.div 
          className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {heroStats.map(stat => {
            const Icon = stat.icon;
            return (
              <motion.div 
                key={stat.label} 
                className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm px-3 py-2 md:px-4 md:py-3"
                variants={staggerItem}
                whileHover={{ y: -2, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs text-white/70">{stat.label}</span>
                  <Icon className="h-4 w-4 md:h-5 md:w-5 text-white/80" strokeWidth={2} />
                </div>
                <p className="text-lg md:text-xl font-semibold text-white">{stat.value}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Quick Insights - Compatto */}
        <AnimatePresence>
          {(topType || headlinePb) && (
            <motion.div 
              className="mt-3 md:mt-4 grid gap-2 md:gap-3 grid-cols-1 sm:grid-cols-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
            {topType && (
              <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm px-3 py-2.5 md:px-4 md:py-3 text-sm text-white">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 md:gap-2 font-semibold text-xs md:text-sm">
                    <Target className="h-3.5 w-3.5 md:h-4 md:w-4" /> Focus tipologia
                  </span>
                  <span className="text-[10px] md:text-xs text-white/70">{formatNumber(topType.value)} sessioni</span>
                </div>
                <p className="mt-1.5 md:mt-2 text-xs text-white/90">{topType.label}</p>
                <button
                  type="button"
                  onClick={() => setTypeFilter(typeFilter === topType.label ? '' : topType.label)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/30 px-2.5 py-1 text-[10px] md:text-[11px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/10 active:scale-95"
                >
                  <Filter className="h-3 w-3" /> Filtra
                </button>
              </div>
            )}
            {headlinePb && (
              <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm px-3 py-2.5 md:px-4 md:py-3 text-sm text-white">
                <div className="inline-flex items-center gap-1.5 md:gap-2 font-semibold text-xs md:text-sm mb-1.5 md:mb-2">
                  <Medal className="h-3.5 w-3.5 md:h-4 md:w-4" /> Ultimo PB
                </div>
                <p className="text-xl md:text-2xl font-bold">{headlinePb.time.toFixed(2)}<span className="text-sm ml-1">s</span></p>
                <p className="text-[10px] md:text-xs text-white/80">sui {headlinePb.distance}m</p>
              </div>
            )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Floating Filter Button - Bottom Right */}
      <motion.button
        onClick={() => setFiltersExpanded(!filtersExpanded)}
        className={cn(
          "fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all",
          filtersExpanded
            ? "bg-sky-600 text-white"
            : "bg-gradient-to-br from-sky-600 to-sky-700 text-white"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {filtersExpanded ? (
          <ChevronDown className="h-6 w-6" />
        ) : (
          <>
            <Filter className="h-6 w-6" />
            {(fromDate || toDate || typeFilter || blockFilter || distanceFilter !== 'all') && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md">
                {[fromDate, toDate, typeFilter, blockFilter, distanceFilter !== 'all'].filter(Boolean).length}
              </span>
            )}
          </>
        )}
      </motion.button>

      {/* Filter Drawer/Modal */}
      <AnimatePresence>
        {filtersExpanded && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFiltersExpanded(false)}
            />
            
            {/* Drawer */}
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-border/80 bg-card text-foreground shadow-2xl md:inset-x-auto md:right-4 md:bottom-4 md:w-[500px] md:max-h-[calc(100vh-2rem)] md:rounded-3xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/70 bg-[rgba(8,11,20,0.9)] px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <Filter className="h-5 w-5 text-sky-400" />
                  <h2 className="text-lg font-bold text-foreground">Filtri Statistiche</h2>
                  {(fromDate || toDate || typeFilter || blockFilter || distanceFilter !== 'all') && (
                    <span className="rounded-full bg-sky-500 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                      {[fromDate, toDate, typeFilter, blockFilter, distanceFilter !== 'all'].filter(Boolean).length} attivi
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setFiltersExpanded(false)}
                  className="rounded-full p-2 text-muted transition-colors hover:bg-white/10 hover:text-foreground"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-5 pb-28 md:pb-5">
          
          {/* PERIODO Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Periodo</h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
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
                        ? 'border-sky-400/80 bg-[rgba(56,189,248,0.14)] text-foreground shadow-sm'
                        : 'border-border bg-card/60 text-muted hover:border-sky-400/80 hover:bg-[rgba(56,189,248,0.08)] hover:text-foreground'
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-medium text-muted mb-1.5 block">Da</Label>
                <Input 
                  type="date" 
                  value={fromDate} 
                  onChange={event => handleFromDateChange(event.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted mb-1.5 block">A</Label>
                <Input 
                  type="date" 
                  value={toDate} 
                  onChange={event => handleToDateChange(event.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border/70"></div>

          {/* FILTRI Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Filtri</h3>
            </div>

            {/* Tipo sessione */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted">Tipo sessione</Label>
              <div className="flex flex-wrap gap-1.5">
                {sessionTypeFilters.map(option => {
                  const isActive = typeFilter === option.value;
                  return (
                    <button
                      key={option.value || 'all'}
                      type="button"
                      onClick={() => setTypeFilter(typeFilter === option.value ? '' : option.value)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        isActive
                          ? 'border-sky-400/80 bg-[rgba(56,189,248,0.14)] text-foreground shadow-sm'
                          : 'border-border bg-card/60 text-muted hover:border-sky-400/80 hover:bg-[rgba(56,189,248,0.08)] hover:text-foreground'
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
              
            {/* Blocco */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted">Blocco allenamento</Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setBlockFilter('')}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    blockFilter
                      ? 'border-border bg-card/60 text-muted hover:border-sky-400/80 hover:bg-[rgba(56,189,248,0.08)] hover:text-foreground'
                      : 'border-sky-400/80 bg-[rgba(56,189,248,0.14)] text-foreground shadow-sm'
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
                      onClick={() => setBlockFilter(blockFilter === block.id ? '' : block.id ?? '')}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        isActive
                          ? 'border-emerald-400/80 bg-[rgba(16,185,129,0.16)] text-foreground shadow-sm'
                          : 'border-border bg-card/60 text-muted hover:border-emerald-400/70 hover:bg-[rgba(16,185,129,0.12)] hover:text-foreground'
                      )}
                    >
                      {block.name ?? 'Senza nome'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Distanza */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted">Categoria distanza</Label>
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
                          ? 'border-sky-400/80 bg-[rgba(56,189,248,0.14)] text-foreground shadow-sm'
                          : 'border-border bg-card/60 text-muted hover:border-sky-400/80 hover:bg-[rgba(56,189,248,0.08)] hover:text-foreground'
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetFilters}
              className="w-full gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Reset filtri
            </Button>
          </div>
          
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DATA MANAGEMENT SECTION */}
      <motion.div variants={fadeInUp}>
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Download className="h-5 w-5 text-sky-400" /> Gestione Dati
          </CardTitle>
          <p className="text-xs text-muted mt-1">
            Esporta, backup e ripristina i tuoi allenamenti
          </p>
        </CardHeader>
        <CardContent>
          <DataManagement onDataChange={loadStats} />
        </CardContent>
      </Card>
      </motion.div>

      <motion.div 
        variants={fadeInUp}
        className="sticky top-0 z-10 bg-[rgba(15,23,42,0.9)] pb-2 pt-2 backdrop-blur"
      >
      <Card className="shadow-lg">
        <CardHeader className="pb-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-foreground">
              <TrendingUp className="h-5 w-5 text-sky-600" strokeWidth={2} /> Andamento
            </CardTitle>
            {stats && (
              <div className="text-sm text-muted">
                {stats.totalSessions > 0 ? (
                  <span>
                    Analizzando <strong className="text-accent">{stats.totalSessions}</strong> {stats.totalSessions === 1 ? 'sessione' : 'sessioni'}
                  </span>
                ) : (
                  <span className="text-amber-400">
                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                    Nessuna sessione nel periodo selezionato
                  </span>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Badge insights separato - più pulito su mobile */}
          {stats && (stats.smartInsights?.length > 0 || stats.alerts?.length > 0) && (
            <motion.div 
              variants={fadeInUp}
              className="flex items-center gap-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-border px-3 py-2 text-xs"
            >
              <Sparkles className="h-4 w-4 text-sky-600 flex-shrink-0" />
              <span className="text-foreground">
                <strong className="font-semibold">{((stats.smartInsights?.length || 0) + (stats.alerts?.length || 0))} nuovi insights</strong> disponibili nella sezione Insights & Consigli
              </span>
            </motion.div>
          )}

          {/* Tabs semplificati - versione mobile con emoji, desktop con testo */}
          <div className="flex gap-1.5 sm:gap-2 rounded-full border border-border bg-[rgba(255,255,255,0.02)] p-1 text-xs sm:text-sm overflow-x-auto justify-center">
            <button
              type="button"
              onClick={() => setActiveTab('base')}
              className={`rounded-full px-3 sm:px-4 py-1.5 transition whitespace-nowrap flex-shrink-0 ${
                activeTab === 'base'
                  ? 'bg-[rgba(56,189,248,0.16)] text-foreground shadow-sm'
                  : 'text-muted hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <span className="sm:hidden">📊</span>
              <span className="hidden sm:inline">Panoramica</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('graphs')}
              className={`rounded-full px-3 sm:px-4 py-1.5 transition whitespace-nowrap flex-shrink-0 ${
                activeTab === 'graphs'
                  ? 'bg-[rgba(56,189,248,0.16)] text-foreground shadow-sm'
                  : 'text-muted hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <span className="sm:hidden">📈</span>
              <span className="hidden sm:inline">Grafici</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advanced')}
              className={`rounded-full px-3 sm:px-4 py-1.5 transition whitespace-nowrap flex-shrink-0 ${
                activeTab === 'advanced'
                  ? 'bg-[rgba(56,189,248,0.16)] text-foreground shadow-sm'
                  : 'text-muted hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <span className="sm:hidden">🔬</span>
              <span className="hidden sm:inline">Analisi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('insights')}
              className={`rounded-full px-3 sm:px-4 py-1.5 transition whitespace-nowrap flex-shrink-0 ${
                activeTab === 'insights'
                  ? 'bg-[rgba(56,189,248,0.16)] text-foreground shadow-sm'
                  : 'text-muted hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <span className="sm:hidden">✨</span>
              <span className="hidden sm:inline">Insights</span>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted">
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> Calcolo statistiche...
            </div>
          ) : !stats ? (
            <div className="rounded-2xl border border-dashed border-border bg-[rgba(255,255,255,0.03)] py-12 text-center text-sm text-muted">
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
                      accent="bg-[rgba(56,189,248,0.16)] text-sky-100"
                    />
                    <SummaryCard
                      title="Distanza totale"
                      value={`${formatNumber(stats.totalDistance)} m`}
                      subtitle="Somma di tutte le ripetute"
                      icon={<BarChart3 className="h-5 w-5" strokeWidth={2} />}
                      accent="bg-[rgba(59,130,246,0.16)] text-blue-100"
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
                      accent="bg-[rgba(251,191,36,0.18)] text-amber-100"
                    />
                    <SummaryCard
                      title="Tempo medio"
                      value={stats.avgTime ? `${stats.avgTime.toFixed(2)} s` : 'N/D'}
                      subtitle="Media delle prove cronometrate"
                      icon={<Target className="h-5 w-5" strokeWidth={2} />}
                      accent="bg-[rgba(56,189,248,0.16)] text-sky-100"
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                        <span>Distribuzione per tipologia</span>
                        <button
                          type="button"
                          onClick={() => setTypeFilter('')}
                          className="text-xs font-medium text-muted transition-colors hover:text-foreground"
                        >
                          Azzera filtro
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {stats.typeBreakdown.length === 0 ? (
                          <span className="rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1 text-[11px] text-muted">
                            Nessuna sessione registrata
                          </span>
                        ) : (
                          stats.typeBreakdown.map(item => {
                            const isActive = typeFilter === item.label;
                            return (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => setTypeFilter(typeFilter === item.label ? '' : item.label)}
                                className={cn(
                                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition',
                                  isActive
                                    ? 'border-sky-400/60 bg-[rgba(56,189,248,0.12)] text-foreground shadow-sm'
                                    : 'border-border bg-[rgba(255,255,255,0.03)] text-muted hover:border-[rgba(255,255,255,0.14)]'
                                )}
                                aria-pressed={isActive}
                              >
                                <span className="capitalize">{item.label}</span>
                                <span className="text-muted">{formatNumber(item.value)}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                      <p className="mt-3 text-[11px] text-muted">
                        Tocca una tipologia per aggiornare le statistiche in tempo reale.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Medal className="h-4 w-4 text-amber-500" /> Personal Best per distanza
                      </h3>
                      <div className="mt-3 space-y-2 text-xs text-muted">
                        {stats.pbByDistance.length === 0 ? (
                          <p className="rounded-2xl bg-[rgba(255,255,255,0.05)] px-3 py-2">Registra nuovi tempi per popolare la tabella.</p>
                        ) : (
                          stats.pbByDistance.map(item => (
                            <div
                              key={item.distance}
                              className="flex items-center justify-between rounded-2xl bg-[rgba(251,191,36,0.12)] px-3 py-2"
                            >
                              <span>{item.distance} m</span>
                              <span className="font-semibold text-foreground">{item.time.toFixed(2)} s</span>
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
                            alert.type === 'warning' && 'border-amber-400/60 bg-[rgba(251,191,36,0.1)] text-foreground',
                            alert.type === 'success' && 'border-emerald-400/60 bg-[rgba(16,185,129,0.1)] text-foreground',
                            alert.type === 'info' && 'border-sky-400/60 bg-[rgba(56,189,248,0.1)] text-foreground'
                          )}
                        >
                          {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400" strokeWidth={2} />}
                          {alert.type === 'success' && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" strokeWidth={2} />}
                          {alert.type === 'info' && <Sparkles className="h-5 w-5 flex-shrink-0 text-sky-400" strokeWidth={2} />}
                          <p>{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grafico Volume Settimanale */}
                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                      <BarChart3 className="h-5 w-5 text-sky-400" strokeWidth={2} />
                      Volume Settimanale
                    </h3>
                    {stats.weeklyVolume.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <RechartsBarChart data={stats.weeklyVolume}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                          <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0b1324',
                              border: '1px solid #1f2937',
                              borderRadius: '12px',
                              fontSize: '13px',
                              padding: '12px',
                              color: '#e2e8f0',
                            }}
                            formatter={(value: any, name: any) => {
                              if (name === 'volume') return [`${(Number(value) / 1000).toFixed(1)} km`, 'Volume'];
                              if (name === 'sessions') return [value, 'Giorni'];
                              return [value, name];
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px', color: '#e2e8f0' }} />
                          <defs>
                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                            </linearGradient>
                          </defs>
                          <Bar 
                            dataKey="volume" 
                            fill="url(#colorVolume)" 
                            radius={[8, 8, 0, 0]}
                            name="Volume (m)"
                          />
                          <Bar 
                            dataKey="sessions" 
                            fill="#8b5cf6" 
                            radius={[8, 8, 0, 0]}
                            name="Giorni"
                          />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="py-12 text-center text-sm text-muted">
                        Non ci sono dati sufficienti per visualizzare il grafico
                      </p>
                    )}
                  </div>

                  {/* Grafico Distribuzione Intensità */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Zap className="h-5 w-5 text-cyan-600" strokeWidth={2} />
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
                              label={false}
                              outerRadius={90}
                              fill="#8884d8"
                              dataKey="count"
                            >
                              {stats.intensityDistribution.filter(d => d.count > 0).map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={['#10b981', '#60a5fa', '#f59e0b', '#ef4444'][index % 4]}
                                  stroke="#fff"
                                  strokeWidth={2}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '2px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '13px',
                                padding: '12px',
                              }}
                              formatter={(value: any, name: any, props: any) => [
                                `${value} sessioni (${((props.percent || 0) * 100).toFixed(1)}%)`,
                                props.payload.range
                              ]}
                            />
                            <Legend 
                              verticalAlign="bottom" 
                              height={36}
                              iconType="circle"
                              wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }}
                              formatter={(value, entry: any) => entry.payload.range}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="py-12 text-center text-sm text-muted">
                          Registra l'intensità delle sessioni per visualizzare la distribuzione
                        </p>
                      )}
                    </div>

                    {/* Performance per giorno della settimana */}
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Calendar className="h-5 w-5 text-sky-600" strokeWidth={2} />
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
                        <p className="py-12 text-center text-sm text-muted">
                          Aggiungi più sessioni per analizzare i pattern settimanali
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Grafici progressione tempi per distanza */}
                  {Object.keys(stats.timeProgressionByDistance).length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                        <TrendingUp className="h-5 w-5 text-emerald-400" strokeWidth={2} />
                        Progressione Tempi per Distanza
                      </h3>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {Object.entries(stats.timeProgressionByDistance)
                          .slice(0, 4)
                          .map(([distance, progression]) => (
                            <div key={distance}>
                              <p className="mb-2 text-sm font-semibold text-foreground">{distance}m</p>
                              {progression.length > 1 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                  <AreaChart data={progression}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                                    <XAxis
                                      dataKey="date"
                                      tick={{ fontSize: 10 }}
                                      stroke="#94a3b8"
                                      tickFormatter={(value) => new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                                    <Tooltip
                                      contentStyle={{
                                        backgroundColor: '#0b1324',
                                        border: '1px solid #1f2937',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: '#e2e8f0',
                                      }}
                                      labelFormatter={(value) => new Date(value).toLocaleDateString('it-IT')}
                                      formatter={(value: any) => [`${value.toFixed(2)} s`, 'Tempo']}
                                    />
                                    <Area type="monotone" dataKey="time" stroke="#10b981" fill="rgba(16,185,129,0.18)" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              ) : (
                                <p className="py-8 text-center text-xs text-muted">
                                  Servono almeno 2 performance per visualizzare il trend
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* NUOVI GRAFICI AVANZATI */}
                  
                  {/* Grafico RPE Distribution */}
                  {stats.rpeDistribution.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Gauge className="h-5 w-5 text-amber-600" strokeWidth={2} />
                        Distribuzione RPE (Sforzo Percepito)
                      </h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <RechartsBarChart 
                          data={stats.rpeDistribution}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 12 }} stroke="#64748b" />
                          <YAxis 
                            type="category" 
                            dataKey="rpe" 
                            tick={{ fontSize: 12 }} 
                            stroke="#64748b"
                            tickFormatter={(value) => `RPE ${value}/10`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '2px solid #e2e8f0',
                              borderRadius: '12px',
                              fontSize: '13px',
                              padding: '12px',
                            }}
                            formatter={(value: any, name: string) => {
                              if (name === 'count') return [value, 'Sessioni'];
                              if (name === 'percentage') return [`${value.toFixed(1)}%`, 'Percentuale'];
                              return [value, name];
                            }}
                          />
                          <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                            {stats.rpeDistribution.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={
                                  entry.rpe <= 3 ? '#10b981' :
                                  entry.rpe <= 6 ? '#f59e0b' :
                                  entry.rpe <= 8 ? '#fb923c' : '#ef4444'
                                } 
                              />
                            ))}
                          </Bar>
                        </RechartsBarChart>
                      </ResponsiveContainer>
                      {stats.avgRPE && (
                        <div className="mt-4 text-center">
                          <p className="text-sm text-muted">RPE Medio</p>
                          <p className="text-3xl font-bold text-foreground">{stats.avgRPE.toFixed(1)}/10</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grafico Training Load (Acute:Chronic Ratio) */}
                  {stats.trainingLoad.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Activity className="h-5 w-5 text-cyan-600" strokeWidth={2} />
                        Carico Allenamento (A:C Ratio)
                      </h3>
                      <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-lg bg-[rgba(16,185,129,0.12)] p-2 border border-emerald-400/60">
                          <p className="font-semibold text-foreground">0.8 - 1.3</p>
                          <p className="text-muted">Zona Ottimale</p>
                        </div>
                        <div className="rounded-lg bg-[rgba(251,191,36,0.12)] p-2 border border-amber-400/60">
                          <p className="font-semibold text-foreground">1.3 - 1.5</p>
                          <p className="text-muted">Zona Moderata</p>
                        </div>
                        <div className="rounded-lg bg-[rgba(248,113,113,0.12)] p-2 border border-rose-400/60">
                          <p className="font-semibold text-foreground">&gt; 1.5</p>
                          <p className="text-muted">Rischio Infortuni</p>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart 
                          data={stats.trainingLoad.slice(-30)}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 11 }}
                            stroke="#64748b"
                            tickFormatter={(value) => new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }} 
                            stroke="#64748b"
                            domain={[0, 2]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '2px solid #e2e8f0',
                              borderRadius: '12px',
                              fontSize: '13px',
                              padding: '12px',
                            }}
                            labelFormatter={(value) => new Date(value).toLocaleDateString('it-IT')}
                            formatter={(value: any, name: string) => {
                              if (name === 'A:C Ratio') {
                                const ratio = Number(value);
                                let status = 'Moderato';
                                if (ratio >= 0.8 && ratio <= 1.3) status = 'Ottimale';
                                else if (ratio > 1.5) status = 'Alto Rischio';
                                return [`${value.toFixed(2)} (${status})`, 'A:C Ratio'];
                              }
                              if (name === 'Carico Acuto') return [`${value.toFixed(0)}`, 'Carico Acuto (7gg)'];
                              if (name === 'Carico Cronico') return [`${value.toFixed(0)}`, 'Carico Cronico (28gg)'];
                              return [value, name];
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="ratio" 
                            stroke="#8b5cf6" 
                            strokeWidth={3}
                            dot={{ fill: '#8b5cf6', r: 4 }}
                            activeDot={{ r: 6 }}
                            name="A:C Ratio"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="acuteLoad" 
                            stroke="#60a5fa" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            name="Carico Acuto"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="chronicLoad" 
                            stroke="#94a3b8" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            name="Carico Cronico"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Grafico Performance Trends Multi-Distanza */}
                  {stats.performanceTrends.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                        <LineChartIcon className="h-5 w-5 text-sky-400" strokeWidth={2} />
                        Trend Performance per Distanza
                      </h3>
                      <div className="space-y-4">
                        {stats.performanceTrends.slice(0, 6).map((trend, idx) => {
                          const percentage = Math.abs(trend.changePercentage);
                          const barColor = 
                            trend.trend === 'improving' ? '#10b981' :
                            trend.trend === 'declining' ? '#ef4444' : '#94a3b8';
                          
                          return (
                            <div key={idx} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">{trend.distance}m</span>
                                  {trend.trend === 'improving' && (
                                    <span className="flex items-center gap-1 rounded-full bg-[rgba(16,185,129,0.14)] px-2 py-0.5 text-xs font-semibold text-foreground">
                                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                                      Miglioramento
                                    </span>
                                  )}
                                  {trend.trend === 'declining' && (
                                    <span className="flex items-center gap-1 rounded-full bg-[rgba(248,113,113,0.14)] px-2 py-0.5 text-xs font-semibold text-foreground">
                                      <TrendingDown className="h-3 w-3 text-rose-400" />
                                      In calo
                                    </span>
                                  )}
                                  {trend.trend === 'stable' && (
                                    <span className="flex items-center gap-1 rounded-full bg-[rgba(148,163,184,0.15)] px-2 py-0.5 text-xs font-semibold text-foreground">
                                      <Minus className="h-3 w-3 text-muted" />
                                      Stabile
                                    </span>
                                  )}
                                </div>
                                <span className={cn(
                                  "text-sm font-bold",
                                  trend.trend === 'improving' ? "text-emerald-300" :
                                  trend.trend === 'declining' ? "text-rose-400" : "text-muted"
                                )}>
                                  {trend.changePercentage > 0 ? '+' : ''}{trend.changePercentage.toFixed(1)}%
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ 
                                    width: `${Math.min(percentage * 10, 100)}%`,
                                    backgroundColor: barColor,
                                  }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-muted">
                                <span>Recente: {trend.recentAvg.toFixed(2)}s</span>
                                <span>Precedente: {trend.previousAvg.toFixed(2)}s</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Grafico Progressi Mensili Combinato */}
                  {stats.monthlyProgress.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Calendar className="h-5 w-5 text-blue-400" strokeWidth={2} />
                        Progressi Mensili
                      </h3>
                      <div className="mb-3 flex flex-wrap gap-3 justify-center text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                          <span className="text-muted">Distanza</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-sky-500"></div>
                          <span className="text-muted">Sessioni</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                          <span className="text-muted">Velocità Media</span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart 
                          data={stats.monthlyProgress.slice(-12)}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 11 }}
                            stroke="#94a3b8"
                          />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fontSize: 12 }} 
                            stroke="#94a3b8"
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 12 }} 
                            stroke="#94a3b8"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0b1324',
                              border: '1px solid #1f2937',
                              borderRadius: '12px',
                              fontSize: '13px',
                              padding: '12px',
                              color: '#e2e8f0',
                            }}
                            formatter={(value: any, name: string) => {
                              if (name === 'Distanza') return [`${(Number(value) / 1000).toFixed(1)} km`, 'Distanza'];
                              if (name === 'Sessioni') return [value, 'Sessioni'];
                              if (name === 'Velocità Media') return [`${(Number(value) * 3.6).toFixed(1)} km/h`, 'Velocità Media'];
                              return [value, name];
                            }}
                          />
                          <defs>
                            <linearGradient id="colorDistance" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="distance" 
                            fill="url(#colorDistance)" 
                            stroke="#3b82f6"
                            strokeWidth={2}
                            name="Distanza"
                          />
                          <Bar 
                            yAxisId="right"
                            dataKey="sessions" 
                            fill="#8b5cf6" 
                            radius={[8, 8, 0, 0]}
                            name="Sessioni"
                          />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="avgSpeed" 
                            stroke="#f59e0b" 
                            strokeWidth={2}
                            dot={{ fill: '#f59e0b', r: 3 }}
                            name="Velocità Media"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                      {stats.monthlyProgress.slice(-2).length > 0 && (
                        <div className={`mt-6 grid gap-3 ${stats.monthlyProgress.slice(-2).length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                          {stats.monthlyProgress.slice(-2).map((month, idx) => (
                            <div key={idx} className="rounded-xl border border-border bg-[rgba(255,255,255,0.03)] p-4">
                              <p className="font-bold text-foreground mb-2 text-base">{month.month}</p>
                              <div className="space-y-1.5 text-sm text-muted">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">📊</span>
                                  <span>{month.sessions} sessioni</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">📏</span>
                                  <span>{(month.distance / 1000).toFixed(1)} km</span>
                                </div>
                                {month.avgSpeed && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">⚡</span>
                                    <span>{(month.avgSpeed * 3.6).toFixed(1)} km/h</span>
                                  </div>
                                )}
                                {month.pbs > 0 && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">⭐</span>
                                    <span className="font-semibold text-amber-400">{month.pbs} PB</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
                      accent="bg-[rgba(251,191,36,0.18)] text-amber-100"
                    />
                    <SummaryCard
                      title="Densità allenamento"
                      value={`${stats.trainingDensity.toFixed(1)} giorni/settimana`}
                      subtitle="Frequenza media giorni allenamento"
                      icon={<Calendar className="h-5 w-5" strokeWidth={2} />}
                      accent="bg-[rgba(56,189,248,0.16)] text-sky-100"
                    />
                    <SummaryCard
                      title="Carico di lavoro"
                      value={formatNumber(Math.round(stats.workload))}
                      subtitle="Volume × Intensità"
                      icon={<Activity className="h-5 w-5" strokeWidth={2} />}
                      accent="bg-[rgba(34,211,238,0.16)] text-cyan-100"
                    />
                    <SummaryCard
                      title="Recupero ottimale"
                      value={stats.optimalRecovery ? `${Math.round(stats.optimalRecovery)} s` : 'N/D'}
                      subtitle="Medio nelle migliori performance"
                      icon={<Clock className="h-5 w-5" strokeWidth={2} />}
                      accent="bg-[rgba(16,185,129,0.16)] text-emerald-100"
                    />
                  </div>

                  {/* Trend di miglioramento */}
                  {stats.improvementTrend !== null && (
                    <div className="rounded-3xl border-2 border-emerald-500/60 bg-[rgba(16,185,129,0.1)] p-5 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                            <TrendingUp className="h-5 w-5 text-emerald-300" strokeWidth={2} />
                            Trend di Miglioramento
                          </h3>
                          <p className="mt-2 text-sm text-muted">
                            Analisi dell'andamento delle tue performance recenti
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-2">
                            {stats.improvementTrend > 0 ? (
                              <ArrowUpRight className="h-8 w-8 text-emerald-300" />
                            ) : stats.improvementTrend < 0 ? (
                              <ArrowDownRight className="h-8 w-8 text-rose-400" />
                            ) : (
                              <Minus className="h-8 w-8 text-muted" />
                            )}
                            <span className={cn(
                              "text-3xl font-bold",
                              stats.improvementTrend > 0 ? "text-emerald-200" : stats.improvementTrend < 0 ? "text-rose-300" : "text-muted"
                            )}>
                              {Math.abs(stats.improvementTrend).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-emerald-300">
                            {stats.improvementTrend > 0 ? 'Miglioramento' : stats.improvementTrend < 0 ? 'Peggioramento' : 'Stabile'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confronto con periodo precedente */}
                  {stats.comparisonPreviousPeriod && (
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                        <BarChart className="h-5 w-5 text-sky-400" strokeWidth={2} />
                        Confronto con Periodo Precedente
                      </h3>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-4">
                          <p className="text-xs font-semibold text-muted">Sessioni</p>
                          <div className="mt-2 flex items-end gap-2">
                            <p className="text-2xl font-bold text-foreground">{stats.totalSessions}</p>
                            <div className="flex items-center gap-1 text-xs">
                              {stats.totalSessions > stats.comparisonPreviousPeriod.sessions ? (
                                <>
                                  <ArrowUpRight className="h-4 w-4 text-emerald-300" />
                                  <span className="font-semibold text-emerald-200">
                                    +{stats.totalSessions - stats.comparisonPreviousPeriod.sessions}
                                  </span>
                                </>
                              ) : stats.totalSessions < stats.comparisonPreviousPeriod.sessions ? (
                                <>
                                  <ArrowDownRight className="h-4 w-4 text-rose-400" />
                                  <span className="font-semibold text-rose-300">
                                    {stats.totalSessions - stats.comparisonPreviousPeriod.sessions}
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted">Invariato</span>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-[11px] text-muted">
                            Precedente: {stats.comparisonPreviousPeriod.sessions}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-4">
                          <p className="text-xs font-semibold text-muted">Volume (m)</p>
                          <div className="mt-2 flex items-end gap-2">
                            <p className="text-2xl font-bold text-foreground">{formatNumber(stats.totalDistance)}</p>
                            <div className="flex items-center gap-1 text-xs">
                              {stats.totalDistance > stats.comparisonPreviousPeriod.volume ? (
                                <>
                                  <ArrowUpRight className="h-4 w-4 text-emerald-300" />
                                  <span className="font-semibold text-emerald-200">
                                    {(((stats.totalDistance - stats.comparisonPreviousPeriod.volume) / stats.comparisonPreviousPeriod.volume) * 100).toFixed(0)}%
                                  </span>
                                </>
                              ) : stats.totalDistance < stats.comparisonPreviousPeriod.volume ? (
                                <>
                                  <ArrowDownRight className="h-4 w-4 text-rose-400" />
                                  <span className="font-semibold text-rose-300">
                                    {(((stats.totalDistance - stats.comparisonPreviousPeriod.volume) / stats.comparisonPreviousPeriod.volume) * 100).toFixed(0)}%
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted">Invariato</span>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-[11px] text-muted">
                            Precedente: {formatNumber(stats.comparisonPreviousPeriod.volume)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-4">
                          <p className="text-xs font-semibold text-muted">Intensità media</p>
                          <div className="mt-2 flex items-end gap-2">
                            <p className="text-2xl font-bold text-foreground">
                              {stats.avgIntensity ? stats.avgIntensity.toFixed(1) : 'N/D'}
                            </p>
                            {stats.avgIntensity && (
                              <div className="flex items-center gap-1 text-xs">
                                {stats.avgIntensity > stats.comparisonPreviousPeriod.avgIntensity ? (
                                  <>
                                    <ArrowUpRight className="h-4 w-4 text-amber-300" />
                                    <span className="font-semibold text-amber-200">
                                      +{(stats.avgIntensity - stats.comparisonPreviousPeriod.avgIntensity).toFixed(1)}
                                    </span>
                                  </>
                                ) : stats.avgIntensity < stats.comparisonPreviousPeriod.avgIntensity ? (
                                  <>
                                    <ArrowDownRight className="h-4 w-4 text-sky-300" />
                                    <span className="font-semibold text-sky-200">
                                      {(stats.avgIntensity - stats.comparisonPreviousPeriod.avgIntensity).toFixed(1)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-muted">Invariato</span>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-muted">
                            Precedente: {stats.comparisonPreviousPeriod.avgIntensity.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Altre metriche avanzate */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <h3 className="text-sm font-semibold text-foreground">Distribuzione Intensità</h3>
                      <div className="mt-3 space-y-2">
                        {stats.intensityDistribution.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between rounded-2xl border border-border/70 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-xs text-muted">
                            <span>{item.range}</span>
                            <span className="font-semibold text-foreground">{item.count} sessioni</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <h3 className="text-sm font-semibold text-foreground">Riepilogo Avanzato</h3>
                      <ul className="mt-3 space-y-2 text-xs text-muted">
                        <li className="flex items-center justify-between rounded-2xl border border-sky-400/60 bg-[rgba(56,189,248,0.12)] px-3 py-2">
                          <span>Sessioni alta intensità</span>
                          <span className="font-semibold text-foreground">{stats.highIntensitySessions}</span>
                        </li>
                        <li className="flex items-center justify-between rounded-2xl border border-emerald-400/60 bg-[rgba(16,185,129,0.12)] px-3 py-2">
                          <span>Sessioni bassa intensità</span>
                          <span className="font-semibold text-foreground">{stats.lowIntensitySessions}</span>
                        </li>
                        <li className="flex items-center justify-between rounded-2xl border border-border/70 bg-[rgba(255,255,255,0.04)] px-3 py-2">
                          <span>Recupero medio</span>
                          <span className="font-semibold text-foreground">{stats.restAverage ? `${Math.round(stats.restAverage)}s` : 'N/D'}</span>
                        </li>
                        <li className="flex items-center justify-between rounded-2xl border border-cyan-400/60 bg-[rgba(34,211,238,0.12)] px-3 py-2">
                          <span>Metriche totali</span>
                          <span className="font-semibold text-foreground">{stats.metricsCount}</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* NUOVE SEZIONI - ANALISI AVANZATE */}
                  
                  {/* Export Toolbar */}
                  <div className="rounded-2xl border-2 border-border bg-[rgba(255,255,255,0.03)] p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                          <Download className="h-5 w-5 text-sky-400" strokeWidth={2} />
                          Esporta Statistiche
                        </h3>
                        <p className="mt-1 text-sm text-muted">
                          Salva i tuoi dati per analisi esterne o documentazione
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-sky-500/70 bg-card text-foreground hover:bg-[rgba(56,189,248,0.1)]"
                          onClick={() => {
                            if (stats) exportStatisticsToCSV(stats);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Esporta CSV
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-sky-500/70 bg-card text-foreground hover:bg-[rgba(56,189,248,0.1)]"
                          onClick={() => {
                            if (stats) generatePDFReport(stats, 'Report Statistiche');
                          }}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Genera PDF
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* RPE Distribution */}
                  {stats.rpeDistribution.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <Gauge className="h-5 w-5 text-amber-400" strokeWidth={2} />
                        Distribuzione RPE (Perceived Exertion)
                      </h3>
                      <div className="space-y-3">
                        {stats.rpeDistribution.map((item) => (
                          <div key={item.rpe} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-foreground">RPE {item.rpe}/10</span>
                              <span className="text-xs text-muted">
                                {item.count} sessioni ({item.percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                              <div
                                className={cn(
                                  "h-full transition-all",
                                  item.rpe <= 3 ? "bg-emerald-400" :
                                  item.rpe <= 6 ? "bg-amber-400" :
                                  item.rpe <= 8 ? "bg-amber-500" : "bg-rose-400"
                                )}
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                        {stats.avgRPE && (
                          <div className="mt-4 rounded-xl border border-amber-400/60 bg-[rgba(251,191,36,0.12)] p-3 text-center">
                            <p className="text-xs text-muted">RPE Medio</p>
                            <p className="text-2xl font-bold text-foreground">{stats.avgRPE.toFixed(1)}/10</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Personal Bests with Improvement Tracking */}
                  {stats.personalBests.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <Award className="h-5 w-5 text-yellow-400" strokeWidth={2} />
                        Personal Bests e Progressi
                      </h3>
                      <div className="space-y-2">
                        {stats.personalBests.slice(0, 10).map((pb, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-xl border border-border/70 bg-[rgba(251,191,36,0.1)] p-3"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{pb.distance}m</span>
                                {pb.improvement !== null && pb.improvement > 0 && (
                                  <span className="flex items-center gap-1 rounded-full bg-[rgba(16,185,129,0.14)] px-2 py-0.5 text-xs font-semibold text-foreground">
                                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                                    +{pb.improvement.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted mt-0.5">
                                {new Date(pb.date).toLocaleDateString('it-IT')}
                                {pb.sessionType && ` • ${pb.sessionType}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-amber-300">{pb.time.toFixed(2)}s</p>
                              {pb.distance > 0 && (
                                <p className="text-xs text-muted">
                                  {((pb.distance / pb.time) * 3.6).toFixed(1)} km/h
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Training Load (Acute:Chronic Ratio) */}
                  {stats.trainingLoad.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <Activity className="h-5 w-5 text-cyan-400" strokeWidth={2} />
                        Carico Allenamento (A:C Ratio)
                      </h3>
                      <div className="space-y-3">
                        {stats.trainingLoad.slice(-10).map((item, idx) => {
                          const isRiskZone = item.ratio > 1.5 || item.ratio < 0.8;
                          const isOptimal = item.ratio >= 0.8 && item.ratio <= 1.3;
                          
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted">
                                  {new Date(item.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                                    isRiskZone ? "bg-[rgba(248,113,113,0.16)] text-foreground" :
                                    isOptimal ? "bg-[rgba(16,185,129,0.16)] text-foreground" :
                                    "bg-[rgba(251,191,36,0.16)] text-foreground"
                                  )}>
                                    {item.ratio.toFixed(2)}
                                  </span>
                                  {isRiskZone && <Shield className="h-4 w-4 text-rose-400" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-lg border border-emerald-400/60 bg-[rgba(16,185,129,0.12)] p-2">
                            <p className="font-semibold text-foreground">0.8 - 1.3</p>
                            <p className="text-muted">Ottimale</p>
                          </div>
                          <div className="rounded-lg border border-amber-400/60 bg-[rgba(251,191,36,0.12)] p-2">
                            <p className="font-semibold text-foreground">1.3 - 1.5</p>
                            <p className="text-muted">Moderato</p>
                          </div>
                          <div className="rounded-lg border border-rose-400/60 bg-[rgba(248,113,113,0.12)] p-2">
                            <p className="font-semibold text-foreground">&gt; 1.5</p>
                            <p className="text-muted">Rischio</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Performance Trends */}
                  {stats.performanceTrends.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <LineChartIcon className="h-5 w-5 text-sky-400" strokeWidth={2} />
                        Trend di Performance per Distanza
                      </h3>
                      <div className="space-y-3">
                        {stats.performanceTrends.map((trend, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "rounded-xl border p-3",
                              trend.trend === 'improving' ? "border-emerald-400/60 bg-[rgba(16,185,129,0.12)]" :
                              trend.trend === 'declining' ? "border-rose-400/60 bg-[rgba(248,113,113,0.12)]" :
                              "border-border bg-[rgba(255,255,255,0.03)]"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{trend.distance}m</span>
                                {trend.trend === 'improving' && (
                                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-300">
                                    <TrendingUp className="h-3 w-3" />
                                    Miglioramento
                                  </span>
                                )}
                                {trend.trend === 'declining' && (
                                  <span className="flex items-center gap-1 text-xs font-semibold text-rose-300">
                                    <TrendingDown className="h-3 w-3" />
                                    In calo
                                  </span>
                                )}
                                {trend.trend === 'stable' && (
                                  <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                                    <Minus className="h-3 w-3" />
                                    Stabile
                                  </span>
                                )}
                              </div>
                              <span className={cn(
                                "text-sm font-bold",
                                trend.trend === 'improving' ? "text-emerald-300" :
                                trend.trend === 'declining' ? "text-rose-300" :
                                "text-muted"
                              )}>
                                {trend.changePercentage > 0 ? '+' : ''}{trend.changePercentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-xs text-muted">
                              <span>Media recente: {trend.recentAvg.toFixed(2)}s</span>
                              <span>Media precedente: {trend.previousAvg.toFixed(2)}s</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Monthly Progress */}
                  {stats.monthlyProgress.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <Calendar className="h-5 w-5 text-blue-400" strokeWidth={2} />
                        Progressi Mensili
                      </h3>
                      <div className="space-y-2">
                        {stats.monthlyProgress.slice(-6).map((month, idx) => (
                          <div key={idx} className="rounded-xl border border-border bg-[rgba(255,255,255,0.03)] p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-foreground">{month.month}</span>
                              {month.pbs > 0 && (
                                <span className="flex items-center gap-1 rounded-full bg-[rgba(251,191,36,0.16)] px-2 py-0.5 text-xs font-semibold text-foreground">
                                  <Star className="h-3 w-3 text-amber-300" />
                                  {month.pbs} PB
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs text-muted">
                              <div>
                                <p className="text-muted">Sessioni</p>
                                <p className="font-semibold text-foreground">{month.sessions}</p>
                              </div>
                              <div>
                                <p className="text-muted">Distanza</p>
                                <p className="font-semibold text-foreground">{(month.distance / 1000).toFixed(1)} km</p>
                              </div>
                              <div>
                                <p className="text-muted">Vel. media</p>
                                <p className="font-semibold text-foreground">
                                  {month.avgSpeed ? `${(month.avgSpeed * 3.6).toFixed(1)} km/h` : 'N/D'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="space-y-4">
                  {/* Smart Insights */}
                  {stats.smartInsights.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
                        <Sparkles className="h-5 w-5 text-sky-400" strokeWidth={2} />
                        Smart Insights & Raccomandazioni
                      </h3>
                      <div className="space-y-3">
                        {stats.smartInsights.map((insight, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "rounded-xl border p-4",
                              insight.severity === 'high' ? "border-rose-400/70 bg-[rgba(248,113,113,0.12)]" :
                              insight.severity === 'medium' ? "border-amber-400/70 bg-[rgba(251,191,36,0.12)]" :
                              "border-emerald-400/70 bg-[rgba(16,185,129,0.12)]"
                            )}
                          >
                            <div className="flex flex-col gap-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {insight.severity === 'high' && <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />}
                                  {insight.severity === 'medium' && <Info className="h-4 w-4 text-amber-400 flex-shrink-0" />}
                                  {insight.severity === 'low' && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
                                  <h4 className="font-semibold text-sm text-foreground">
                                    {insight.title}
                                  </h4>
                                </div>
                                <span className={cn(
                                  "rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide flex-shrink-0",
                                  insight.severity === 'high' ? "bg-[rgba(248,113,113,0.2)] text-foreground" :
                                  insight.severity === 'medium' ? "bg-[rgba(251,191,36,0.2)] text-foreground" :
                                  "bg-[rgba(16,185,129,0.2)] text-foreground"
                                )}>
                                  {insight.category}
                                </span>
                              </div>
                              
                              <p className="text-sm text-muted">
                                {insight.description}
                              </p>
                              
                              <div className={cn(
                                "rounded-lg p-3 text-sm",
                                insight.severity === 'high' ? "bg-[rgba(248,113,113,0.14)]" :
                                insight.severity === 'medium' ? "bg-[rgba(251,191,36,0.14)]" :
                                "bg-[rgba(16,185,129,0.14)]"
                              )}>
                                <p className="leading-relaxed text-foreground">
                                  <span className="font-semibold block mb-1">Raccomandazione:</span>
                                  <span className="text-foreground">{insight.recommendation}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Original Insights Section */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Medal className="h-4 w-4 text-amber-400" /> Personal Best registrati
                      </h3>
                      <ul className="mt-3 space-y-2 text-xs text-muted">
                        {stats.pbByDistance.length === 0 ? (
                          <li>Nessun tempo registrato nelle ripetute selezionate</li>
                        ) : (
                          stats.pbByDistance.map(item => (
                            <li
                              key={item.distance}
                              className="flex items-center justify-between rounded-2xl border border-amber-400/60 bg-[rgba(251,191,36,0.12)] px-3 py-2 text-foreground"
                            >
                              <span>{item.distance} m</span>
                              <span className="font-semibold text-foreground">{item.time.toFixed(2)} s</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Sparkles className="h-4 w-4 text-sky-400" /> Insight rapidi
                      </h3>
                      <ul className="mt-3 space-y-2 text-xs text-muted">
                        {stats.insights.length === 0 ? (
                          <li>Aggiungi più dati per ottenere suggerimenti personalizzati!</li>
                        ) : (
                          stats.insights.map((insight, index) => (
                            <li
                              key={index}
                              className="rounded-2xl border border-sky-400/60 bg-[rgba(56,189,248,0.14)] px-3 py-2 text-foreground"
                            >
                              {insight}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>
      </>
      )}
    </motion.div>
    </ErrorBoundary>
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
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${accent}`}>
        {icon}
        <span>{title}</span>
      </div>
      <p className="text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted">{subtitle}</p>
    </div>
  );
}
