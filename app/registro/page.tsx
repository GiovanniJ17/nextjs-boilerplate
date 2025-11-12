'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Dumbbell,
  Flame,
  Flag,
  FolderPlus,
  Gauge,
  Loader2,
  ListPlus,
  MapPin,
  MoveRight,
  NotebookPen,
  Package,
  PenSquare,
  PlusCircle,
  RefreshCcw,
  Ruler,
  Sparkles,
  StickyNote,
  Target,
  Timer,
  Trash2,
  Trees,
  Trophy,
  Weight,
  Wind,
  X,
  Play,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { notifyError, notifySuccess } from '@/lib/notifications';
import { PageHeader } from '@/components/ui/page-header';
import { 
  pageTransition, 
  fadeInUp, 
  staggerContainer, 
  staggerItem, 
  scaleIn,
  collapse,
  buttonTap 
} from '@/lib/animations';

type TrainingBlock = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

type SessionFormState = {
  block_id: string;
  date: string;
  type: string;
  phase: string;
  location: string;
  notes: string;
};

type ExerciseResultForm = {
  set_number: string;  // Rinominato da attempt_number
  repetition_number: string;
  time_s: string;
  weight_kg: string;
  rpe: string;
  notes: string;
};

type ExerciseForm = {
  name: string;
  discipline_type: string;
  distance_m: string;
  sets: string;
  repetitions: string;
  rest_between_reps_s: string;
  rest_between_sets_s: string;
  intensity: string;
  notes: string;
  results: ExerciseResultForm[];
};

type ExerciseBlockForm = {
  id: string; // ID temporaneo per React keys
  block_number: number;
  name: string;
  rest_after_block_s: string;
  notes: string;
  exercises: ExerciseForm[];
};

type MetricForm = {
  date: string;
  metric_name: string;
  category: string;
  metric_target: string;
  value: string;
  unit: string;
  notes: string;
  distance_m: string;
  time_s: string;
  recovery_post_s: string;
  intensity: string;
};

type MetricCategory = {
  value: string;
  label: string;
  description: string;
};

const sessionTypes = [
  {
    value: 'pista',
    label: 'Allenamento in pista',
    hint: 'Ripetute, accelerazioni e lavori tecnici sul rettilineo o curva',
  },
  {
    value: 'test',
    label: 'Test cronometrati',
    hint: 'Valutazioni ufficiali o simulate svolte in pista',
  },
  {
    value: 'gara',
    label: 'Gara',
    hint: 'Competizioni ufficiali o simulazioni complete',
  },
  {
    value: 'massimale',
    label: 'Test massimali',
    hint: 'Test di forza massima: squat, girata, stacco, trazioni',
  },
  {
    value: 'scarico',
    label: 'Scarico attivo',
    hint: 'Sessioni leggere di rigenerazione sempre in pista',
  },
  {
    value: 'recupero',
    label: 'Recupero',
    hint: 'Lavori di mobilità, jogging blando o tecnica a bassa intensità',
  },
  {
    value: 'altro',
    label: 'Altro',
    hint: 'Qualsiasi sessione particolare legata alla pista',
  },
];

const disciplineTypes = [
  { value: 'accelerazioni', label: 'Accelerazioni' },
  { value: 'partenze', label: 'Partenze dai blocchi' },
  { value: 'allunghi', label: 'Allunghi / progressioni' },
  { value: 'resistenza', label: 'Resistenza lattacida' },
  { value: 'tecnica', label: 'Tecnica di corsa' },
  { value: 'mobilità', label: 'Mobilità specifica' },
];

const metricCategories: MetricCategory[] = [
  {
    value: 'prestazione',
    label: 'Prestazione',
    description: 'Cronometraggi ufficiali, piazzamenti e riferimenti di competizione.',
  },
  {
    value: 'test',
    label: 'Test',
    description: 'Prove di valutazione interne con cronometro o sensori.',
  },
  {
    value: 'massimale',
    label: 'Massimale',
    description: 'Test di forza massima: squat, girata, stacco, trazioni.',
  },
  {
    value: 'recupero',
    label: 'Recupero',
    description: 'Indicatori di recupero post allenamento o gare impegnative.',
  },
  {
    value: 'altro',
    label: 'Altro',
    description: 'Qualsiasi informazione extra collegata al focus della sessione.',
  },
];

const sessionTypeIcons: Record<string, LucideIcon> = {
  pista: Activity,
  test: Target,
  gara: Trophy,
  massimale: Weight,
  scarico: Wind,
  recupero: RefreshCcw,
  altro: PlusCircle,
};

const locationOptions = [
  { value: 'pista-indoor', label: 'Pista indoor' },
  { value: 'pista-outdoor', label: 'Pista outdoor' },
  { value: 'palestra', label: 'Palestra' },
  { value: 'erba', label: 'Erba' },
  { value: 'custom', label: 'Altro luogo' },
];

const metricCategoryIcons: Record<string, LucideIcon> = {
  prestazione: Trophy,
  test: Target,
  massimale: Weight,
  recupero: Wind,
  altro: NotebookPen,
};

// Esercizi massimali predefiniti per la categoria "massimale"
const massimaliExercises = [
  'Squat',
  'Girata',
  'Stacco',
  'Trazioni',
];

// Helper per determinare se una sessione è di tipo metrica/test
function isMetricSessionType(sessionType: string): boolean {
  return sessionType === 'test' || sessionType === 'gara' || sessionType === 'massimale';
}

// Helper per determinare se una sessione è di allenamento con ripetute
function isTrainingSessionType(sessionType: string): boolean {
  return !isMetricSessionType(sessionType);
}

function buildRangeBackground(value: string | number, min = 1, max = 10): CSSProperties {
  const parsed = typeof value === 'number' ? value : Number(value);
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : 1;
  const range = Math.max(safeMax - safeMin, 1);
  const clamped = Math.min(Math.max(Number.isFinite(parsed) ? parsed : safeMin, safeMin), safeMax);
  const progress = ((clamped - safeMin) / range) * 100;

  return {
    background: `linear-gradient(to right, rgb(14 165 233) 0%, rgb(14 165 233) ${progress}%, rgb(226 232 240) ${progress}%, rgb(226 232 240) 100%)`,
  };
}

const locationIcons: Record<string, LucideIcon> = {
  'pista-indoor': Activity,
  'pista-outdoor': Flag,
  palestra: Dumbbell,
  erba: Trees,
  custom: PenSquare,
};

const disciplineIcons: Record<string, LucideIcon> = {
  accelerazioni: Activity,
  partenze: Flag,
  allunghi: Wind,
  resistenza: Flame,
  tecnica: Target,
  mobilità: MoveRight,
};

const defaultExerciseResult: ExerciseResultForm = {
  set_number: '1',
  repetition_number: '1',
  time_s: '',
  weight_kg: '',
  rpe: '',
  notes: '',
};

const defaultExercise: ExerciseForm = {
  name: '',
  discipline_type: 'accelerazioni',
  distance_m: '',
  sets: '1',
  repetitions: '1',
  rest_between_reps_s: '',
  rest_between_sets_s: '',
  intensity: '6',
  notes: '',
  results: [],
};

const defaultExerciseBlock: ExerciseBlockForm = {
  id: crypto.randomUUID(),
  block_number: 1,
  name: 'Blocco 1',
  rest_after_block_s: '',
  notes: '',
  exercises: [{ ...defaultExercise }],
};

const defaultSession: SessionFormState = {
  block_id: '',
  date: '',
  type: '',
  phase: '',
  location: '',
  notes: '',
};

const defaultMetric: MetricForm = {
  date: '',
  metric_name: '',
  category: 'test',
  metric_target: '',
  value: '',
  unit: '',
  notes: '',
  distance_m: '',
  time_s: '',
  recovery_post_s: '',
  intensity: '8',
};

type MetricSuggestion = {
  metric_name: string;
  category: string;
  metric_target?: string;
  unit?: string;
  notes?: string;
  hint: string;
};

const metricPlaybook: Record<string, MetricSuggestion[]> = {
  pista: [
    {
      metric_name: 'Tempo 30m',
      category: 'test',
      metric_target: 'Accelerazioni',
      unit: 's',
      hint: 'Cronometra i tratti esplosivi chiave della seduta.',
    },
    {
      metric_name: 'Velocità massima GPS',
      category: 'test',
      unit: 'km/h',
      hint: 'Inserisci il picco registrato dai sensori in pista.',
    },
  ],
  test: [
    {
      metric_name: 'Test CMJ',
      category: 'fisico',
      unit: 'cm',
      hint: 'Collega i valori di forza esplosiva al ciclo di test.',
    },
    {
      metric_name: 'Tempo prova ufficiale',
      category: 'prestazione',
      unit: 's',
      hint: 'Segna il riferimento cronometrico principale del test.',
    },
  ],
  gara: [
    {
      metric_name: 'Tempo ufficiale',
      category: 'prestazione',
      unit: 's',
      hint: 'Registra il crono finale della gara.',
    },
    {
      metric_name: 'Split 200m',
      category: 'test',
      unit: 's',
      hint: 'Aggiungi passaggi intermedi utili per l’analisi.',
    },
  ],
  scarico: [
    {
      metric_name: 'HRV mattutina',
      category: 'recupero',
      unit: 'ms',
      hint: 'Controlla lo stato di recupero nei giorni di scarico.',
    },
  ],
  recupero: [
    {
      metric_name: 'Sensazione gambe',
      category: 'recupero',
      unit: '1-10',
      hint: 'Registra come rispondono le gambe dopo il lavoro in pista.',
    },
  ],
  altro: [
    {
      metric_name: 'Nota chiave',
      category: 'altro',
      hint: 'Qualsiasi informazione extra collegata al focus.',
    },
  ],
};

const disciplineMetricPlaybook: Record<string, MetricSuggestion[]> = {
  accelerazioni: [
    {
      metric_name: 'Tempo medio 30m',
      category: 'test',
      metric_target: 'Accelerazioni',
      unit: 's',
      hint: 'Valuta la rapidità di uscita dalle prime falcate.',
    },
    {
      metric_name: 'Reazione blocchi',
      category: 'test',
      unit: 'ms',
      hint: 'Inserisci la risposta del sistema di cronometraggio.',
    },
  ],
  partenze: [
    {
      metric_name: 'Tempo 10m',
      category: 'test',
      metric_target: 'Partenze',
      unit: 's',
      hint: 'Confronta la progressione dei primi appoggi.',
    },
  ],
  allunghi: [
    {
      metric_name: 'Passaggio 60m',
      category: 'test',
      unit: 's',
      hint: 'Monitora la fase di costruzione della velocità.',
    },
  ],
  resistenza: [
    {
      metric_name: 'Tempo medio serie',
      category: 'test',
      metric_target: 'Ripetute lattacide',
      unit: 's',
      hint: 'Confronta ogni serie con l’obiettivo prefissato.',
    },
  ],
  tecnica: [
    {
      metric_name: 'Valutazione tecnica',
      category: 'test',
      unit: '1-5',
      notes: 'Riporta feedback o aspetti da migliorare.',
      hint: 'Inserisci una scala rapida per il lavoro tecnico.',
    },
  ],
  mobilità: [
    {
      metric_name: 'Range articolare',
      category: 'test',
      metric_target: 'Mobilità specifica',
      unit: '°',
      hint: 'Annota i progressi sulla mobilità dedicata alla corsa.',
    },
  ],
};

type StepKey = 'details' | 'exercises' | 'metrics';

type StepDefinition = {
  key: StepKey;
  label: string;
  description: string;
  icon: LucideIcon;
  status: 'done' | 'active' | 'todo';
};

const stepStatusLabel: Record<StepDefinition['status'], string> = {
  done: 'Completo',
  active: 'In corso',
  todo: 'Da compilare',
};

function mapIntensityToEffort(intensity: number | null) {
  if (intensity == null || Number.isNaN(intensity)) return null;
  if (intensity <= 3) return 'basso';
  if (intensity <= 6) return 'medio';
  if (intensity <= 8) return 'alto';
  return 'massimo';
}

function formatDateHuman(date: string) {
  if (!date) return '';
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short' }).format(
    new Date(date)
  );
}

function parseDecimalInput(value: string | null | undefined) {
  if (value == null) return null;
  const normalized = value.replace(',', '.').trim();
  if (normalized === '') return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIntegerInput(value: string | null | undefined) {
  const parsed = parseDecimalInput(value);
  if (parsed == null) return null;
  return Math.round(parsed);
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

type ExerciseSeriesGroup = {
  seriesNumber: number;
  entries: {
    result: ExerciseResultForm;
    resultIndex: number;
    repetitionNumber: number;
  }[];
};

function groupResultsBySeries(results: ExerciseResultForm[]): ExerciseSeriesGroup[] {
  const groupMap = new Map<number, ExerciseSeriesGroup['entries']>();

  results.forEach((result, index) => {
    const seriesNumber = parseIntegerInput(result.set_number) ?? 1;
    const repetitionNumber = parseIntegerInput(result.repetition_number) ?? index + 1;

    if (!groupMap.has(seriesNumber)) {
      groupMap.set(seriesNumber, []);
    }

    groupMap.get(seriesNumber)!.push({
      result,
      resultIndex: index,
      repetitionNumber,
    });
  });

  return Array.from(groupMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([seriesNumber, entries]) => ({
      seriesNumber,
      entries: entries.slice().sort((a, b) => a.repetitionNumber - b.repetitionNumber),
    }));
}

function normalizeExerciseResults(results: ExerciseResultForm[]) {
  const grouped = groupResultsBySeries(results);
  const normalized: ExerciseResultForm[] = [];

  grouped.forEach((group, groupIndex) => {
    group.entries.forEach((entry, repIndex) => {
      normalized.push({
        ...entry.result,
        set_number: String(groupIndex + 1),
        repetition_number: String(repIndex + 1),
      });
    });
  });

  return normalized;
}

export default function RegistroPage() {
  const [sessionForm, setSessionForm] = useState<SessionFormState>(defaultSession);
  const [exerciseBlocks, setExerciseBlocks] = useState<ExerciseBlockForm[]>([
    { ...defaultExerciseBlock }
  ]);
  const [metrics, setMetrics] = useState<MetricForm[]>([]);
  const [trainingBlocks, setTrainingBlocks] = useState<TrainingBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockActionLoading, setBlockActionLoading] = useState<string | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<{ id: string; label: string } | null>(null);
  const [blockForm, setBlockForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    goal: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [usingCustomLocation, setUsingCustomLocation] = useState(false);
  const [customLocation, setCustomLocation] = useState('');

  // Check if session type requires metrics (test/gara/massimale) instead of exercises
  const isMetricSession = isMetricSessionType(sessionForm.type);

  // Mobile accordion state
  const [expandedSection, setExpandedSection] = useState<'details' | 'exercises' | 'metrics' | null>('details');

  const sectionRefs = {
    details: useRef<HTMLDivElement | null>(null),
    exercises: useRef<HTMLDivElement | null>(null),
    metrics: useRef<HTMLDivElement | null>(null),
  } as const;
  const numberFormatter = useMemo(() => new Intl.NumberFormat('it-IT'), []);

  useEffect(() => {
    void fetchBlocks();
  }, []);

  useEffect(() => {
    setMetrics(prev => {
      if (isMetricSession) {
        // Auto-fill based on session type
        const getDefaultUnit = () => {
          if (sessionForm.type === 'massimale') return 'kg';
          if (sessionForm.type === 'test' || sessionForm.type === 'gara') return 's';
          return '';
        };

        const getDefaultMetricName = () => {
          if (sessionForm.type === 'massimale') return massimaliExercises[0]; // Squat by default
          return 'Prova 1';
        };

        if (prev.length === 0) {
          return [
            {
              ...defaultMetric,
              category: 'test',
              metric_name: getDefaultMetricName(),
              unit: getDefaultUnit(),
            },
          ];
        }

        // Update existing metrics with correct unit based on session type
        return prev.map(metric => ({
          ...metric,
          category: 'test',
          unit: metric.unit || getDefaultUnit(),
          metric_name: metric.metric_name || getDefaultMetricName(),
        }));
      }

      return [];
    });
  }, [isMetricSession, sessionForm.type]);

  async function fetchBlocks() {
    setLoadingBlocks(true);
    const { data, error } = await supabase
      .from('training_blocks')
      .select('id, name, start_date, end_date')
      .order('start_date', { ascending: false });

    if (!error && data) {
      setTrainingBlocks(data as TrainingBlock[]);
    }
    setLoadingBlocks(false);
  }

  const volumePreview = useMemo(() => {
    return exerciseBlocks.reduce((blockAcc, block) => {
      const blockVolume = block.exercises.reduce((exAcc, ex) => {
        const distance = parseIntegerInput(ex.distance_m) || 0;
        const sets = parseIntegerInput(ex.sets) || 0;
        const reps = parseIntegerInput(ex.repetitions) || 0;
        if (!distance || !sets || !reps) return exAcc;
        return exAcc + distance * sets * reps;
      }, 0);
      return blockAcc + blockVolume;
    }, 0);
  }, [exerciseBlocks]);

  const totalResults = useMemo(() => {
    return exerciseBlocks.reduce((blockAcc, block) => {
      const blockResults = block.exercises.reduce((exAcc, ex) => exAcc + ex.results.length, 0);
      return blockAcc + blockResults;
    }, 0);
  }, [exerciseBlocks]);

  const disciplineDistribution = useMemo(() => {
    const counter = new Map<string, number>();
    for (const block of exerciseBlocks) {
      for (const exercise of block.exercises) {
        const key = exercise.discipline_type || 'altro';
        counter.set(key, (counter.get(key) ?? 0) + 1);
      }
    }

    const total = exerciseBlocks.reduce((sum, block) => sum + block.exercises.length, 0) || 1;
    return Array.from(counter.entries()).map(([key, value]) => ({
      key,
      label: disciplineTypes.find(type => type.value === key)?.label ?? key,
      value,
      percentage: Math.round((value / total) * 100),
    }));
  }, [exerciseBlocks]);

  const metricSuggestions = useMemo(() => {
    if (isMetricSession) {
      return [] as MetricSuggestion[];
    }

    const collected = new Map<string, MetricSuggestion>();

    if (sessionForm.type && metricPlaybook[sessionForm.type]) {
      for (const suggestion of metricPlaybook[sessionForm.type]) {
        const key = `${suggestion.metric_name}-${suggestion.category}`;
        if (!collected.has(key)) {
          collected.set(key, suggestion);
        }
      }
    }

    for (const block of exerciseBlocks) {
      for (const exercise of block.exercises) {
        const library = disciplineMetricPlaybook[exercise.discipline_type] ?? [];
        for (const suggestion of library) {
          const key = `${suggestion.metric_name}-${suggestion.category}`;
          if (!collected.has(key)) {
            collected.set(key, suggestion);
          }
        }
      }
    }

    return Array.from(collected.values());
  }, [exerciseBlocks, isMetricSession, sessionForm.type]);

  const stepProgress = useMemo<StepDefinition[]>(() => {
    const detailsComplete = Boolean(sessionForm.date && sessionForm.type && sessionForm.location);
    const exercisesComplete =
      isMetricSession ||
      (exerciseBlocks.length > 0 &&
        exerciseBlocks.every(block => 
          block.exercises.every(ex => ex.name.trim() && ex.discipline_type && ex.sets && ex.repetitions)
        ));
    const metricsComplete = metrics.length === 0
      ? true
      : metrics.every(metric => {
          if (!metric.metric_name.trim()) return true;
          if (isMetricSession) {
            return Boolean(metric.time_s && metric.distance_m);
          }
          return Boolean(metric.value);
        });

    const base: StepDefinition[] = [
      {
        key: 'details',
        label: 'Dettagli sessione',
        description: 'Data, tipologia e luogo',
        icon: Calendar,
        status: detailsComplete ? 'done' : 'todo',
      },
      {
        key: 'exercises',
        label: 'Ripetute',
        description: 'Serie, intensità e risultati in pista',
        icon: Flag,
        status: exercisesComplete ? 'done' : 'todo',
      },
      {
        key: 'metrics',
        label: 'Metriche',
        description: 'Parametri aggiuntivi',
        icon: Activity,
        status: metricsComplete ? 'done' : 'todo',
      },
    ];

    const firstIncompleteIndex = base.findIndex(step => step.status !== 'done');
    if (firstIncompleteIndex !== -1) {
      base[firstIncompleteIndex] = { ...base[firstIncompleteIndex], status: 'active' };
    }

    return base;
  }, [exerciseBlocks, isMetricSession, metrics, sessionForm.date, sessionForm.location, sessionForm.type]);

  const completedSteps = stepProgress.filter(step => step.status === 'done').length;
  const progressValue =
    stepProgress.length > 0 ? Math.round((completedSteps / stepProgress.length) * 100) : 0;
  const progressBarWidth = progressValue === 0 ? '6%' : `${progressValue}%`;

  const totalExercises = useMemo(
    () => exerciseBlocks.reduce((sum, block) => sum + block.exercises.length, 0),
    [exerciseBlocks]
  );

  const summaryStats = useMemo(
    () => [
      { icon: Flag, label: 'Ripetute', value: totalExercises },
      { icon: Timer, label: 'Tentativi', value: totalResults },
      {
        icon: Ruler,
        label: 'Volume stimato',
        value: volumePreview > 0 ? `${numberFormatter.format(volumePreview)} m` : '—',
      },
      { icon: NotebookPen, label: 'Metriche collegate', value: metrics.length },
    ],
    [totalExercises, metrics.length, numberFormatter, totalResults, volumePreview]
  );

  function handleScrollToSection(section: StepKey) {
    const target = sectionRefs[section].current;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function clearError(field: string) {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleQuickTypeSelect(value: string) {
    setSessionForm(prev => ({ ...prev, type: value }));
    clearError('type');
  }

  function handleLocationSelect(optionValue: string) {
    if (optionValue === 'custom') {
      setUsingCustomLocation(true);
      setSessionForm(prev => ({ ...prev, location: customLocation }));
      if (customLocation) {
        clearError('location');
      }
      return;
    }

    const selected = locationOptions.find(option => option.value === optionValue);
    const valueToAssign = selected ? selected.label : '';
    setUsingCustomLocation(false);
    setCustomLocation('');
    setSessionForm(prev => ({ ...prev, location: valueToAssign }));
    clearError('location');
  }

  function handleCustomLocationChange(value: string) {
    setCustomLocation(value);
    setSessionForm(prev => ({ ...prev, location: value }));
    if (value.trim()) {
      clearError('location');
    }
  }

  function handleBlockSelect(blockId: string | null) {
    setSessionForm(prev => ({ ...prev, block_id: blockId ?? '' }));
  }

  function requestDeleteBlock(blockId: string) {
    const block = trainingBlocks.find(item => item.id === blockId);
    const label = block?.name ? `"${block.name}"` : 'questo blocco';
    setBlockToDelete({ id: blockId, label });
  }

  async function confirmDeleteBlock() {
    if (!blockToDelete) return;

    const { id } = blockToDelete;
    setBlockActionLoading(id);
    const { error } = await supabase.from('training_blocks').delete().eq('id', id);

    if (error) {
      notifyError("Errore durante l'eliminazione del blocco", {
        description: 'Riprova tra qualche secondo.',
      });
      setBlockActionLoading(null);
      setBlockToDelete(null);
      return;
    }

    notifySuccess('Blocco eliminato', {
      description: 'La sessione non sarà più collegata a questo periodo.',
    });
    setTrainingBlocks(prev => prev.filter(item => item.id !== id));
    setBlockActionLoading(null);
    setBlockToDelete(null);
    if (sessionForm.block_id === id) {
      handleBlockSelect(null);
    }
  }

  function handleCreateBlockShortcut() {
    setShowBlockForm(true);
    handleScrollToSection('details');
  }

  function handleSessionChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setSessionForm(prev => ({ ...prev, [name]: value }));
    clearError(name);
  }

  // Block management functions
  function addBlock() {
    setExerciseBlocks(prev => {
      const newBlockNumber = prev.length + 1;
      return [
        ...prev,
        {
          ...defaultExerciseBlock,
          id: crypto.randomUUID(),
          block_number: newBlockNumber,
          name: `Blocco ${newBlockNumber}`,
          exercises: [{ ...defaultExercise }],
        },
      ];
    });
  }

  function removeBlock(blockId: string) {
    setExerciseBlocks(prev => {
      const filtered = prev.filter(b => b.id !== blockId);
      // Rinumera i blocchi rimanenti
      return filtered.map((block, idx) => ({
        ...block,
        block_number: idx + 1,
        name: block.name.startsWith('Blocco ') ? `Blocco ${idx + 1}` : block.name,
      }));
    });
  }

  function handleBlockChange(
    blockId: string,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setExerciseBlocks(prev => {
      return prev.map(block => {
        if (block.id !== blockId) return block;
        return { ...block, [name]: value };
      });
    });
  }

  // Exercise management functions (now work within blocks)
  function handleExerciseChange(
    blockId: string,
    exerciseIndex: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setExerciseBlocks(prev => {
      return prev.map(block => {
        if (block.id !== blockId) return block;
        
        const exercises = [...block.exercises];
        const exercise = { ...exercises[exerciseIndex] };
        
        if (name === 'intensity') {
          const parsedValue = parseDecimalInput(value);
          const clamped = Math.max(1, Math.min(10, parsedValue ?? 0));
          exercise.intensity = String(clamped);
        } else {
          (exercise as Record<string, string | ExerciseResultForm[]>)[name] = value;
        }
        
        exercises[exerciseIndex] = exercise;
        return { ...block, exercises };
      });
    });

    clearError(`exercise-${blockId}-${exerciseIndex}-name`);
  }

  function handleDisciplineSelect(blockId: string, exerciseIndex: number, value: string) {
    setExerciseBlocks(prev => {
      return prev.map(block => {
        if (block.id !== blockId) return block;
        
        const exercises = [...block.exercises];
        exercises[exerciseIndex] = { ...exercises[exerciseIndex], discipline_type: value };
        return { ...block, exercises };
      });
    });
    clearError(`exercise-${blockId}-${exerciseIndex}-discipline`);
  }

  function handleResultChange(
    blockId: string,
    exerciseIndex: number,
    resultIndex: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setExerciseBlocks(prev => {
      return prev.map(block => {
        if (block.id !== blockId) return block;
        
        const exercises = [...block.exercises];
        const exercise = { ...exercises[exerciseIndex] };
        const results = [...exercise.results];
        const target = { ...results[resultIndex] } as Record<string, string>;
        target[name] = value;
        results[resultIndex] = target as ExerciseResultForm;
        exercise.results = results;
        exercises[exerciseIndex] = exercise;
        
        return { ...block, exercises };
      });
    });
  }

  function addExercise(blockId: string) {
    setExerciseBlocks(prev => {
      return prev.map(block => {
        if (block.id !== blockId) return block;
        return {
          ...block,
          exercises: [...block.exercises, { ...defaultExercise }],
        };
      });
    });
  }

  function removeExercise(blockId: string, exerciseIndex: number) {
    setExerciseBlocks(prev => {
      return prev.map(block => {
        if (block.id !== blockId) return block;
        return {
          ...block,
          exercises: block.exercises.filter((_, i) => i !== exerciseIndex),
        };
      });
    });
  }

  function addSeries(blockId: string, exerciseIndex: number) {
    setExerciseBlocks(prev => {
      return prev.map(block => {
        if (block.id !== blockId) return block;
        
        const exercises = [...block.exercises];
        const exercise = { ...exercises[exerciseIndex] };
        const normalized = normalizeExerciseResults(exercise.results);
        const currentSeries = groupResultsBySeries(normalized);
        const nextSeriesNumber = currentSeries.length + 1;
        const repetitionsTarget = Math.max(parseIntegerInput(exercise.repetitions) ?? 1, 1);

        const newEntries = Array.from({ length: repetitionsTarget }, (_, repIndex) => ({
          ...defaultExerciseResult,
          set_number: String(nextSeriesNumber),
          repetition_number: String(repIndex + 1),
        }));

        exercise.results = [...normalized, ...newEntries];
        exercises[exerciseIndex] = exercise;
        return { ...block, exercises };
      });
    });
  }

  function addRepetition(blockId: string, exerciseIndex: number, seriesNumber: number) {
    setExerciseBlocks(prev => {
      return prev.map(block => {
        if (block.id !== blockId) return block;
        
        const exercises = [...block.exercises];
        const exercise = { ...exercises[exerciseIndex] };
        const normalized = normalizeExerciseResults(exercise.results);
        const groups = groupResultsBySeries(normalized);
        const targetGroup = groups.find(group => group.seriesNumber === seriesNumber);

        if (!targetGroup) {
          return block;
        }

        const nextRepNumber = targetGroup.entries.length + 1;
        const newResult: ExerciseResultForm = {
          ...defaultExerciseResult,
          set_number: String(seriesNumber),
          repetition_number: String(nextRepNumber),
        };

        exercise.results = normalizeExerciseResults([...normalized, newResult]);
        exercises[exerciseIndex] = exercise;
        return { ...block, exercises };
      });
    });
  }

  function removeResult(blockId: string, exerciseIndex: number, resultIndex: number) {
    setExerciseBlocks(prev => {
      return prev.map(block => {
        if (block.id !== blockId) return block;
        
        const exercises = [...block.exercises];
        const exercise = { ...exercises[exerciseIndex] };
        const filtered = exercise.results.filter((_, i) => i !== resultIndex);
        exercise.results = normalizeExerciseResults(filtered);
        exercises[exerciseIndex] = exercise;
        return { ...block, exercises };
      });
    });
  }

  function removeSeries(blockId: string, exerciseIndex: number, seriesNumber: number) {
    setExerciseBlocks(prev => {
      return prev.map(block => {
        if (block.id !== blockId) return block;
        
        const exercises = [...block.exercises];
        const exercise = { ...exercises[exerciseIndex] };
        const filtered = exercise.results.filter(result => {
          const setNum = parseIntegerInput(result.set_number) ?? 0;
          return setNum !== seriesNumber;
        });
        exercise.results = normalizeExerciseResults(filtered);
        exercises[exerciseIndex] = exercise;
        return { ...block, exercises };
      });
    });
  }

  function addMetric() {
    setMetrics(prev => [
      ...prev,
      {
        ...defaultMetric,
        category: isMetricSession ? 'test' : defaultMetric.category,
        metric_name: isMetricSession ? `Prova ${prev.length + 1}` : '',
      },
    ]);
  }

  function handleAddMetricFromSuggestion(suggestion: MetricSuggestion) {
    setMetrics(prev => {
      const exists = prev.some(
        metric =>
          metric.metric_name === suggestion.metric_name && metric.category === suggestion.category
      );

      if (exists) {
        return prev;
      }

      return [
        ...prev,
        {
          ...defaultMetric,
          metric_name: suggestion.metric_name,
          category: suggestion.category || defaultMetric.category,
          metric_target: suggestion.metric_target ?? '',
          unit: suggestion.unit ?? '',
          notes: suggestion.notes ?? '',
        },
      ];
    });
  }

  function handleMetricCategorySelect(index: number, category: string) {
    setMetrics(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], category };
      return copy;
    });
  }

  function updateMetric(
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setMetrics(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [name]: value };
      return copy;
    });

    if (name === 'value') {
      clearError(`metric-${index}-value`);
    }
    if (name === 'distance_m') {
      clearError(`metric-${index}-distance_m`);
    }
    if (name === 'time_s') {
      clearError(`metric-${index}-time_s`);
    }
  }

  function removeMetric(index: number) {
    setMetrics(prev => prev.filter((_, i) => i !== index));
  }

  function duplicateLastSeries(blockId: string, exerciseIndex: number) {
    setExerciseBlocks(prev => {
      return prev.map(block => {
        if (block.id !== blockId) return block;
        
        const exercises = [...block.exercises];
        const exercise = { ...exercises[exerciseIndex] };
        const normalized = normalizeExerciseResults(exercise.results);
        const groups = groupResultsBySeries(normalized);

        if (groups.length === 0) {
          return block;
        }

        const lastGroup = groups[groups.length - 1];
        const nextSeriesNumber = groups.length + 1;
        const duplicatedResults = lastGroup.entries.map(entry => ({
          ...entry.result,
          set_number: String(nextSeriesNumber),
          repetition_number: String(entry.repetitionNumber),
        }));

        exercise.results = normalizeExerciseResults([...normalized, ...duplicatedResults]);
        exercises[exerciseIndex] = exercise;
        return { ...block, exercises };
      });
    });
  }

  function validateForms() {
    const validation: Record<string, string> = {};

    if (!sessionForm.date) validation.date = 'Inserisci una data valida';
    if (!sessionForm.type) validation.type = 'Seleziona il tipo di sessione';
    if (!sessionForm.location) validation.location = 'Indica il luogo della sessione';

    if (!isMetricSession) {
      exerciseBlocks.forEach((block) => {
        block.exercises.forEach((ex, index) => {
          const errorPrefix = `exercise-${block.id}-${index}`;
          if (!ex.name.trim()) validation[`${errorPrefix}-name`] = 'Nome obbligatorio';
          if (!ex.discipline_type) validation[`${errorPrefix}-discipline`] = 'Seleziona la disciplina';
          if (!ex.sets) validation[`${errorPrefix}-sets`] = 'Inserisci le serie';
          if (!ex.repetitions) validation[`${errorPrefix}-repetitions`] = 'Inserisci le ripetizioni';
        });
      });
    }

    metrics.forEach((metric, index) => {
      if (!metric.metric_name.trim()) return;
      if (isMetricSession) {
        if (!metric.distance_m) {
          validation[`metric-${index}-distance_m`] = 'Indica la distanza della prova';
        }
        if (!metric.time_s) {
          validation[`metric-${index}-time_s`] = 'Inserisci il tempo registrato';
        }
      } else if (!metric.value) {
        validation[`metric-${index}-value`] = 'Inserisci il valore della metrica';
      }
    });

    setErrors(validation);
    return Object.keys(validation).length === 0;
  }

  async function handleCreateBlock() {
    if (!blockForm.name || !blockForm.start_date || !blockForm.end_date) {
      notifyError('Compila nome e date del blocco', {
        description: 'Inserisci tutte le informazioni richieste per creare il periodo.',
      });
      return;
    }

    const { data, error } = await supabase
      .from('training_blocks')
      .insert([
        {
          name: blockForm.name,
          start_date: blockForm.start_date,
          end_date: blockForm.end_date,
          goal: blockForm.goal || null,
          notes: blockForm.notes || null,
        },
      ])
      .select()
      .single();

    if (error) {
      notifyError('Errore durante la creazione del blocco', {
        description: 'Controlla la connessione e riprova.',
      });
      return;
    }

    notifySuccess('Blocco creato', {
      description: 'Ora puoi collegarlo alla sessione in corso.',
    });
    setBlockForm({ name: '', start_date: '', end_date: '', goal: '', notes: '' });
    setShowBlockForm(false);
    await fetchBlocks();
    if (data?.id) {
      setSessionForm(prev => ({ ...prev, block_id: data.id }));
    }
  }

  async function handleSubmit() {
    if (!validateForms()) {
      const missingFields: string[] = [];
      let firstErrorSection: StepKey | null = null;
      
      // Verifica quali sezioni hanno errori
      if (!sessionForm.date || !sessionForm.type || !sessionForm.location) {
        const missing = [];
        if (!sessionForm.date) missing.push('Data');
        if (!sessionForm.type) missing.push('Tipo di sessione');
        if (!sessionForm.location) missing.push('Luogo');
        missingFields.push(`Dettagli sessione: ${missing.join(', ')}`);
        if (!firstErrorSection) firstErrorSection = 'details';
      }
      
      if (!isMetricSession) {
        const exerciseErrors = exerciseBlocks.some(block =>
          block.exercises.some(ex => !ex.name.trim() || !ex.discipline_type || !ex.sets || !ex.repetitions)
        );
        if (exerciseErrors) {
          missingFields.push('Ripetute e risultati');
          if (!firstErrorSection) firstErrorSection = 'exercises';
        }
      }
      
      const metricErrors = metrics.some((metric) => {
        if (!metric.metric_name.trim()) return false;
        if (isMetricSession) {
          return !metric.distance_m || !metric.time_s;
        }
        return !metric.value;
      });
      
      if (metricErrors) {
        missingFields.push('Metriche & Test');
        if (!firstErrorSection) firstErrorSection = 'metrics';
      }
      
      const detailMessage = missingFields.length > 0 
        ? `Completa: ${missingFields.join(' • ')}`
        : 'Alcuni dati obbligatori non sono ancora completi.';
      
      notifyError('Controlla i campi evidenziati', {
        description: detailMessage,
      });
      
      // Scroll alla prima sezione con errori
      if (firstErrorSection) {
        handleScrollToSection(firstErrorSection);
      }
      
      return;
    }

    setLoading(true);

    try {
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .insert([
          {
            block_id: sessionForm.block_id || null,
            date: sessionForm.date,
            type: sessionForm.type,
            phase: sessionForm.phase || null,
            location: sessionForm.location,
            notes: sessionForm.notes || null,
          },
        ])
        .select()
        .single();

      if (sessionError || !session) {
        throw sessionError ?? new Error('Sessione non creata');
      }

      if (!isMetricSession) {
        // Inserisci i blocchi di esercizi
        for (const block of exerciseBlocks) {
          const { data: insertedBlock, error: blockError } = await supabase
            .from('exercise_blocks')
            .insert([
              {
                session_id: session.id,
                block_number: block.block_number,
                name: block.name,
                rest_after_block_s: parseIntegerInput(block.rest_after_block_s),
                notes: block.notes || null,
              },
            ])
            .select()
            .single();

          if (blockError || !insertedBlock) {
            throw blockError ?? new Error('Errore inserimento blocco esercizi');
          }

          // Inserisci gli esercizi di questo blocco
          for (const [exerciseIdx, ex] of block.exercises.entries()) {
            const intensityNumber = parseDecimalInput(ex.intensity);
            const effortType = mapIntensityToEffort(Number.isFinite(intensityNumber) ? intensityNumber : null);

            const { data: insertedExercise, error: exerciseError } = await supabase
              .from('exercises')
              .insert([
                {
                  block_id: insertedBlock.id,
                  exercise_number: exerciseIdx + 1,
                  name: ex.name,
                  discipline_type: ex.discipline_type,
                  distance_m: parseIntegerInput(ex.distance_m),
                  sets: parseIntegerInput(ex.sets),
                  repetitions: parseIntegerInput(ex.repetitions),
                  rest_between_reps_s: parseIntegerInput(ex.rest_between_reps_s),
                  rest_between_sets_s: parseIntegerInput(ex.rest_between_sets_s),
                  intensity: parseDecimalInput(ex.intensity),
                  effort_type: effortType,
                  notes: ex.notes || null,
                },
              ])
              .select()
              .single();

            if (exerciseError || !insertedExercise) {
              throw exerciseError ?? new Error('Errore inserimento esercizio');
            }

            // Inserisci i risultati dell'esercizio
            for (const [idx, res] of ex.results.entries()) {
              const hasValues = [res.time_s, res.weight_kg, res.rpe, res.notes].some(
                value => Boolean(value && value.trim())
              );

              if (!hasValues) continue;

              const { error: resultError } = await supabase.from('exercise_results').insert([
                {
                  exercise_id: insertedExercise.id,
                  set_number: parseIntegerInput(res.set_number) ?? idx + 1,
                  repetition_number: parseIntegerInput(res.repetition_number),
                  time_s: parseDecimalInput(res.time_s),
                  weight_kg: parseDecimalInput(res.weight_kg),
                  rpe: parseDecimalInput(res.rpe),
                  notes: res.notes || null,
                },
              ]);

              if (resultError) {
                throw resultError;
              }
            }
          }
        }
      }

      for (const metric of metrics) {
        if (!metric.metric_name.trim()) continue;

        const payload: Record<string, unknown> = {
          date: metric.date || sessionForm.date,
          metric_name: metric.metric_name,
          session_id: session.id,
          notes: metric.notes || null,
        };

        if (isMetricSession) {
          payload.category = 'test';
          payload.metric_target = metric.metric_target || null;
          payload.distance_m = parseIntegerInput(metric.distance_m);
          payload.time_s = parseDecimalInput(metric.time_s);
          const recoveryMinutes = parseDecimalInput(metric.recovery_post_s);
          payload.recovery_post_s = recoveryMinutes != null ? Math.round(recoveryMinutes * 60) : null;
          payload.intensity = parseDecimalInput(metric.intensity);
          payload.unit = 's';
        } else {
          payload.category = metric.category || null;
          payload.metric_target = metric.metric_target || null;
          payload.value = parseDecimalInput(metric.value);
          payload.unit = metric.unit || null;
        }

        const { error: metricError } = await supabase.from('metrics').insert([payload]);

        if (metricError) {
          throw metricError;
        }
      }

      notifySuccess('Allenamento registrato', {
        description: 'La sessione è stata aggiunta allo storico.',
      });
      setSessionForm(defaultSession);
      setExerciseBlocks([
        {
          ...defaultExerciseBlock,
          id: crypto.randomUUID(),
          exercises: [{ ...defaultExercise, results: [{ ...defaultExerciseResult }] }],
        },
      ]);
      setMetrics([]);
      setErrors({});
      setUsingCustomLocation(false);
      setCustomLocation('');
      setShowBlockForm(false);
    } catch (error) {
      console.error('Errore salvataggio:', error);
      
      // Estrai informazioni dettagliate dall'errore
      let errorMessage = 'Riprova più tardi o verifica la connessione.';
      
      if (error && typeof error === 'object') {
        const dbError = error as any;
        
        // Errori comuni di Supabase
        if (dbError.message) {
          console.error('Dettaglio errore:', dbError.message);
          
          // Errori di validazione o constraint del database
          if (dbError.code === '23505') {
            errorMessage = 'Questa sessione è già stata registrata.';
          } else if (dbError.code === '23503') {
            errorMessage = 'Riferimento non valido. Verifica che il blocco selezionato esista.';
          } else if (dbError.code === '23502') {
            errorMessage = 'Alcuni campi obbligatori del database sono mancanti.';
          } else if (dbError.message.includes('JWT') || dbError.message.includes('auth')) {
            errorMessage = 'Sessione scaduta. Ricarica la pagina e riprova.';
          } else if (dbError.message.includes('Network') || dbError.message.includes('fetch')) {
            errorMessage = 'Errore di connessione. Verifica la tua connessione internet.';
          } else {
            // Mostra il messaggio di errore originale se disponibile
            errorMessage = `Errore database: ${dbError.message}`;
          }
        }
      }
      
      notifyError('Si è verificato un errore durante il salvataggio', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  const selectedBlock = trainingBlocks.find(block => block.id === sessionForm.block_id);

  return (
    <motion.div 
      className="space-y-4"
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Hero Section - Gradient Style */}
      <motion.section 
        className="rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-5 text-white shadow-xl"
        variants={fadeInUp}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <motion.div 
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium"
              variants={scaleIn}
            >
              <Play className="h-4 w-4" strokeWidth={2} /> Registro Allenamento
            </motion.div>
            <h1 className="text-3xl font-semibold">Registra la tua sessione</h1>
            <p className="max-w-xl text-sm text-white/75">
              Inserisci esercizi, serie, ripetizioni e metriche. Monitora il progresso in tempo reale.
            </p>
          </div>

          <motion.div 
            className="rounded-3xl bg-white/10 px-6 py-5 text-center"
            variants={scaleIn}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <p className="text-xs uppercase tracking-widest text-white/60">Completamento</p>
            <p className="text-4xl font-semibold">{progressValue}%</p>
            <p className="text-xs text-white/60">{completedSteps} di {stepProgress.length} step</p>
          </motion.div>
        </div>
        
        {/* Stats in hero */}
        <motion.div 
          className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {summaryStats.slice(0, 4).map(stat => {
            const Icon = stat.icon;
            const formattedValue = typeof stat.value === 'number' ? numberFormatter.format(stat.value) : stat.value;
            return (
              <motion.div 
                key={stat.label} 
                className="rounded-2xl bg-white/10 px-4 py-3 text-sm"
                variants={staggerItem}
                whileHover={{ y: -4, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between text-white/75">
                  <span className="text-xs uppercase tracking-widest text-white/60">{stat.label}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-white">{formattedValue}</p>
              </motion.div>
            );
          })}
        </motion.div>
        
        <AnimatePresence>
          {selectedBlock && (
            <motion.div 
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Package className="h-4 w-4" strokeWidth={2} />
              {selectedBlock.name}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Step Progress */}
      <div className="card-compact">
        <div className="flex flex-wrap gap-2">
          {stepProgress.map(step => {
            const Icon = step.icon;

            return (
              <button
                key={step.key}
                type="button"
                onClick={() => handleScrollToSection(step.key)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition',
                  step.status === 'active' && 'border-sky-200 bg-sky-50 text-sky-700',
                  step.status === 'done' && 'border-green-200 bg-green-50 text-green-700',
                  step.status === 'todo' && 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{step.label}</span>
                {step.status === 'done' && <CheckCircle2 className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4">
        {/* Dettagli sessione */}
        <div ref={sectionRefs.details} className="scroll-mt-24">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader 
              className="pb-2.5 cursor-pointer md:cursor-default"
              onClick={() => setExpandedSection(prev => prev === 'details' ? null : 'details')}
            >
              <CardTitle className="flex items-center justify-between text-lg text-slate-800">
                <span className="flex items-center gap-2">
                  <NotebookPen className="h-5 w-5 text-sky-600" strokeWidth={2} /> Dettagli sessione
                </span>
                <ChevronDown 
                  className={cn(
                    "h-5 w-5 text-slate-400 transition-transform md:hidden",
                    expandedSection === 'details' && "rotate-180"
                  )} 
                />
              </CardTitle>
            </CardHeader>
            <CardContent className={cn(
              "p-4 space-y-4",
              expandedSection !== 'details' && "hidden md:block"
            )}>
            {/* Blocco + Data */}
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Blocco di allenamento</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleBlockSelect(null)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition',
                      sessionForm.block_id
                        ? 'border-slate-200 text-slate-500 hover:border-slate-300'
                        : 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                    )}
                    aria-pressed={!sessionForm.block_id}
                  >
                    Nessun blocco
                  </button>
                  {trainingBlocks.length === 0 && (
                    <span className="inline-flex items-center rounded-2xl bg-slate-100 px-3 py-2 text-[11px] text-slate-500">
                      Nessun blocco salvato
                    </span>
                  )}
                  {trainingBlocks.map(block => {
                    const isSelected = sessionForm.block_id === block.id;
                    return (
                      <div
                        key={block.id}
                        className={cn(
                          'relative flex items-center gap-3 rounded-2xl border px-3 py-2 pr-10 text-left transition',
                          isSelected
                            ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleBlockSelect(block.id)}
                          className="flex flex-col text-left"
                          aria-pressed={isSelected}
                        >
                          <span className="text-xs font-semibold">{block.name}</span>
                          <span className="text-[11px] text-slate-500">
                            {formatDateHuman(block.start_date)} → {formatDateHuman(block.end_date)}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full border border-transparent bg-white/80 px-2 py-1 text-[10px] font-semibold text-slate-400 transition-colors hover:border-red-200 hover:text-red-500"
                          onClick={() => requestDeleteBlock(block.id)}
                          disabled={blockActionLoading === block.id}
                          aria-label={`Elimina ${block.name}`}
                          title="Rimuovi definitivamente il blocco"
                        >
                          {blockActionLoading === block.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          <span>Elimina</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowBlockForm(prev => !prev)}
                    className="gap-2 rounded-full border-slate-200 h-8 text-xs px-3"
                  >
                    <PenSquare className="h-3.5 w-3.5" />
                    {showBlockForm ? 'Nascondi editor' : 'Nuovo blocco'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void fetchBlocks()}
                    className="gap-2 border-transparent bg-transparent text-xs text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-sky-600 h-8 px-3"
                  >
                    {loadingBlocks ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-3.5 w-3.5" />
                    )}
                    Aggiorna
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Data</Label>
                <Input
                  type="date"
                  name="date"
                  value={sessionForm.date}
                  onChange={handleSessionChange}
                  className={cn('rounded-xl bg-slate-50 h-9', errors.date && 'border-red-500')}
                />
                {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
              </div>
            </div>

            {showBlockForm && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <Target className="h-4 w-4" /> Nuovo blocco di allenamento
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Nome</Label>
                    <Input
                      value={blockForm.name}
                      onChange={event => setBlockForm(prev => ({ ...prev, name: event.target.value }))}
                      placeholder="Macro ciclo, preparazione indoor..."
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Inizio</Label>
                    <Input
                      type="date"
                      value={blockForm.start_date}
                      onChange={event => setBlockForm(prev => ({ ...prev, start_date: event.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Fine</Label>
                    <Input
                      type="date"
                      value={blockForm.end_date}
                      onChange={event => setBlockForm(prev => ({ ...prev, end_date: event.target.value }))}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Obiettivo</Label>
                    <Input
                      value={blockForm.goal}
                      onChange={event => setBlockForm(prev => ({ ...prev, goal: event.target.value }))}
                      placeholder="Es. Migliorare accelerazione"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Note</Label>
                    <Textarea
                      value={blockForm.notes}
                      onChange={event => setBlockForm(prev => ({ ...prev, notes: event.target.value }))}
                      placeholder="Appunti generali, gare obiettivo..."
                      className="min-h-[72px]"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button type="button" onClick={handleCreateBlock} disabled={loadingBlocks} className="gap-2 h-9">
                    {loadingBlocks && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salva blocco
                  </Button>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100"></div>

            {/* Tipo di sessione */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-700">Tipo di sessione</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                  {sessionTypes.map(type => {
                    const Icon = sessionTypeIcons[type.value] ?? Activity;
                    const isSelected = sessionForm.type === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleQuickTypeSelect(type.value)}
                        className={cn(
                          'flex h-full flex-col items-start gap-1 rounded-2xl border px-3 py-2 text-left transition',
                          isSelected
                            ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200'
                        )}
                        aria-pressed={isSelected}
                      >
                        <span className="inline-flex items-center gap-2 text-xs font-semibold">
                          <span className={cn('flex h-5 w-5 items-center justify-center rounded-xl', isSelected ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500')}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          {type.label}
                        </span>
                        <span className="text-[11px] text-slate-500">{type.hint}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.type && <p className="text-xs text-red-500">{errors.type}</p>}
              </div>

            {/* Fase e Luogo */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Fase / Periodo</Label>
                <Input
                  name="phase"
                  value={sessionForm.phase}
                  onChange={handleSessionChange}
                  placeholder="Es. Accumulo, Intensificazione, Taper"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-700">Luogo</Label>
                <div className="flex flex-wrap gap-2">
                  {locationOptions.map(option => {
                    const isSelected =
                      option.value === 'custom'
                        ? usingCustomLocation
                        : sessionForm.location === option.label;
                    const Icon = locationIcons[option.value] ?? MapPin;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleLocationSelect(option.value)}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
                          isSelected
                            ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-sky-200 hover:text-sky-600'
                        )}
                        aria-pressed={isSelected}
                        title={option.value === 'custom' ? 'Personalizza luogo' : option.label}
                      >
                        <Icon className="h-3.5 w-3.5" /> {option.label}
                      </button>
                    );
                  })}
                </div>
                {usingCustomLocation && (
                  <div className="space-y-1">
                    <Input
                      value={customLocation}
                      onChange={event => handleCustomLocationChange(event.target.value)}
                      placeholder="Specificare luogo..."
                      className={cn('mt-1', errors.location && 'border-red-500')}
                    />
                    <p className="text-[11px] text-slate-500">Personalizza il luogo quando non rientra tra le proposte rapide.</p>
                  </div>
                )}
                {!usingCustomLocation && sessionForm.location && (
                  <p className="text-[11px] text-slate-500">Selezionato: {sessionForm.location}</p>
                )}
                {errors.location && <p className="text-xs text-red-500">{errors.location}</p>}
              </div>
            </div>

            <div className="border-t border-slate-100"></div>

            {/* Note sessione */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Note sessione</Label>
              <Textarea
                name="notes"
                value={sessionForm.notes}
                onChange={handleSessionChange}
                placeholder="Inserisci sensazioni, clima, focus tecnico..."
                className="mt-1"
              />
            </div>
          </CardContent>
          </Card>
        </div>

        {/* Ripetute */}
        <div ref={sectionRefs.exercises} className="scroll-mt-24">
          {isMetricSession ? (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader 
                className="pb-2.5 cursor-pointer md:cursor-default"
                onClick={() => setExpandedSection(prev => prev === 'exercises' ? null : 'exercises')}
              >
                <CardTitle className="flex items-center justify-between text-lg text-slate-800">
                  <span className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-sky-600" strokeWidth={2} /> Ripetute
                  </span>
                  <ChevronDown 
                    className={cn(
                      "h-5 w-5 text-slate-400 transition-transform md:hidden",
                      expandedSection === 'exercises' && "rotate-180"
                    )} 
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className={cn(
                "flex flex-col items-center gap-3 pb-4 text-center",
                expandedSection !== 'exercises' && "hidden md:flex"
              )}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                  <Target className="h-5 w-5" strokeWidth={2} />
                </div>
                <p className="text-lg text-slate-800 font-semibold">
                  Ripetute disabilitate per questo tipo di sessione
                </p>
                <p className="text-sm text-slate-600">
                  Le sessioni di tipo <span className="font-semibold text-slate-700">test</span>,{' '}
                  <span className="font-semibold text-slate-700">gara</span> o{' '}
                  <span className="font-semibold text-slate-700">massimale</span> utilizzano la sezione{' '}
                  <span className="font-semibold text-sky-600">«Metriche &amp; Test»</span>.
                </p>
                <p className="text-xs text-slate-500">
                  Seleziona un tipo di allenamento standard (pista, scarico, recupero) per registrare ripetute ed esercizi.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader 
                className="pb-2.5 cursor-pointer md:cursor-default"
                onClick={() => setExpandedSection(prev => prev === 'exercises' ? null : 'exercises')}
              >
                <CardTitle className="flex items-center justify-between text-lg text-slate-800">
                  <span className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-sky-600" strokeWidth={2} /> Ripetute
                  </span>
                  <ChevronDown 
                    className={cn(
                      "h-5 w-5 text-slate-400 transition-transform md:hidden",
                      expandedSection === 'exercises' && "rotate-180"
                    )} 
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className={cn(
                "space-y-4 p-4",
                expandedSection !== 'exercises' && "hidden md:block"
              )}>
              {disciplineDistribution.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-sky-600" /> Focus ripetute
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      Le ripetute aggiunte guidano i suggerimenti dei risultati e delle metriche
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {disciplineDistribution.map(item => {
                      const Icon = disciplineIcons[item.key] ?? Activity;
                      return (
                        <span
                          key={item.key}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-600 shadow-sm"
                        >
                          <Icon className="h-3.5 w-3.5 text-sky-500" /> {item.label} · {item.value}
                          <span className="text-slate-400">({item.percentage}%)</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {exerciseBlocks.map((block) => (
                <div key={block.id} className="space-y-4">
                  {/* Block Header */}
                  <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-sky-600" strokeWidth={2} />
                        <Input
                          value={block.name}
                          onChange={(e) => handleBlockChange(block.id, e)}
                          name="name"
                          placeholder="Nome blocco"
                          className="h-8 w-48 border-sky-200 bg-white text-sm font-semibold"
                        />
                      </div>
                      {exerciseBlocks.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeBlock(block.id)}
                          className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs text-slate-600">Recupero dopo blocco (sec)</Label>
                        <Input
                          type="number"
                          value={block.rest_after_block_s}
                          onChange={(e) => handleBlockChange(block.id, e)}
                          name="rest_after_block_s"
                          placeholder="Es: 180"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600">Note blocco</Label>
                        <Input
                          value={block.notes}
                          onChange={(e) => handleBlockChange(block.id, e)}
                          name="notes"
                          placeholder="Es: Velocità massimale"
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Exercises in this block */}
                  {block.exercises.map((exercise, index) => {
                const DisciplineIcon = disciplineIcons[exercise.discipline_type] ?? Flag;
                const intensityNumber = parseDecimalInput(exercise.intensity);
                const effortType = mapIntensityToEffort(intensityNumber);
                const sliderValue =
                  typeof intensityNumber === 'number' && Number.isFinite(intensityNumber)
                    ? Math.round(intensityNumber)
                    : 0;
                const seriesGroups = groupResultsBySeries(exercise.results);
                const seriesCount = seriesGroups.length;
                const totalRepetitions = seriesGroups.reduce(
                  (acc, group) => acc + group.entries.length,
                  0
                );
                const timeValues = exercise.results
                  .map(result => parseDecimalInput(result.time_s))
                  .filter((value): value is number => isFiniteNumber(value) && value > 0);
                const recoveryValues = exercise.results
                  .map(result => parseDecimalInput(result.weight_kg))
                  .filter((value): value is number => isFiniteNumber(value) && value >= 0);
                const rpeValues = exercise.results
                  .map(result => parseDecimalInput(result.rpe))
                  .filter((value): value is number => isFiniteNumber(value) && value > 0);
                const distanceValue = parseIntegerInput(exercise.distance_m);
                const bestTime = timeValues.length > 0 ? Math.min(...timeValues) : null;
                const slowestTime = timeValues.length > 0 ? Math.max(...timeValues) : null;
                const averageRpe =
                  rpeValues.length > 0
                    ? Math.round((rpeValues.reduce((acc, curr) => acc + curr, 0) / rpeValues.length) * 10) / 10
                    : null;
                const averageTime =
                  timeValues.length > 0
                    ? Math.round((timeValues.reduce((acc, value) => acc + value, 0) / timeValues.length) * 100) / 100
                    : null;
                const averageRecovery =
                  recoveryValues.length > 0
                    ? Math.round((recoveryValues.reduce((acc, value) => acc + value, 0) / recoveryValues.length) * 10) /
                      10
                    : null;
                const easiestRpe = rpeValues.length > 0 ? Math.min(...rpeValues) : null;
                const highlightCards = (
                  [
                    {
                      key: 'series',
                      label: 'Serie registrate',
                      value: seriesCount,
                      description:
                        seriesCount > 1
                          ? 'Struttura delle serie completa'
                          : 'Aggiungi le serie pianificate per iniziare',
                    },
                    totalRepetitions > 0 && {
                      key: 'repetitions',
                      label: 'Ripetizioni registrate',
                      value: totalRepetitions,
                      description:
                        totalRepetitions > 1
                          ? 'Analizza i tempi e i recuperi per ogni ripetizione'
                          : 'Compila i dati della prima ripetizione',
                    },
                    distanceValue != null && {
                      key: 'distance',
                      label: 'Distanza obiettivo',
                      value: `${distanceValue} m`,
                      description: 'Valore inserito nella scheda ripetute',
                    },
                    bestTime != null && {
                      key: 'best-time',
                      label: 'Miglior tempo',
                      value: `${bestTime.toFixed(2)}s`,
                      description:
                        averageTime != null
                          ? `Media sessione ${averageTime.toFixed(2)}s`
                          : 'Aggiungi tempi per calcolare la media',
                    },
                    slowestTime != null && slowestTime !== bestTime && {
                      key: 'slowest-time',
                      label: 'Tempo più alto',
                      value: `${slowestTime.toFixed(2)}s`,
                      description: 'Aiuta a valutare la dispersione delle prove',
                    },
                    averageRpe != null && {
                      key: 'avg-rpe',
                      label: 'RPE medio',
                      value: `RPE ${averageRpe.toFixed(1)}`,
                      description: 'Percezione complessiva della sessione',
                    },
                    averageRecovery != null && {
                      key: 'avg-recovery',
                      label: 'Recupero medio',
                      value: `${averageRecovery.toFixed(1)}s`,
                      description: 'Confronta il recupero rispetto al piano',
                    },
                    easiestRpe != null && {
                      key: 'min-rpe',
                      label: 'RPE minimo',
                      value: `RPE ${easiestRpe.toFixed(1)}`,
                      description: 'Tieni traccia della percezione più bassa',
                    },
                  ].filter(Boolean) as {
                    key: string;
                    label: string;
                    value: string | number;
                    description: string;
                  }[]
                ).slice(0, 4);

              return (
                <div key={index} className="rounded-2xl border border-slate-200 bg-white/70 p-3.5 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                        <DisciplineIcon className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <div>
                <p className="text-base">Blocco ripetute #{index + 1}</p>
                        <p className="text-xs text-slate-500">{exercise.name || 'Dettagli ripetuta'}</p>
                      </div>
                    </div>
                    {block.exercises.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExercise(block.id, index)}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" /> Rimuovi
                      </button>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-12">
                    <div className="lg:col-span-5 space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700">Nome ripetuta</Label>
                      <Input
                        name="name"
                        value={exercise.name}
                        onChange={event => handleExerciseChange(block.id, index, event)}
                        placeholder="Es. 4×60m blocchi, 3×150m progressivi"
                        className={cn('h-9', errors[`exercise-${block.id}-${index}-name`] && 'border-red-500')}
                      />
                    </div>

                    <div className="lg:col-span-7 space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700">Focus tecnico</Label>
                      <div className="flex flex-wrap gap-2">
                        {disciplineTypes.map(type => {
                          const Icon = disciplineIcons[type.value] ?? Activity;
                          const isActive = exercise.discipline_type === type.value;
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => handleDisciplineSelect(block.id, index, type.value)}
                              className={cn(
                                'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition',
                                isActive
                                  ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200'
                              )}
                              aria-pressed={isActive}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {type.label}
                            </button>
                          );
                        })}
                      </div>
                      {errors[`exercise-${index}-discipline`] && (
                        <p className="text-[11px] text-red-500">{errors[`exercise-${index}-discipline`]}</p>
                      )}
                    </div>
                  </div>

                  {/* Distanza, Serie, Ripetizioni, Recupero tra rep, Recupero serie */}
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700">Distanza (m)</Label>
                      <Input
                        name="distance_m"
                        type="number"
                        min={0}
                        value={exercise.distance_m}
                        onChange={event => handleExerciseChange(block.id, index, event)}
                        placeholder="Es. 150"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700">Serie</Label>
                      <Input
                        name="sets"
                        type="number"
                        min={0}
                        value={exercise.sets}
                        onChange={event => handleExerciseChange(block.id, index, event)}
                        className={cn('h-9', errors[`exercise-${block.id}-${index}-sets`] && 'border-red-500')}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700">Ripetizioni</Label>
                      <Input
                        name="repetitions"
                        type="number"
                        min={0}
                        value={exercise.repetitions}
                        onChange={event => handleExerciseChange(block.id, index, event)}
                        className={cn('h-9', errors[`exercise-${block.id}-${index}-repetitions`] && 'border-red-500')}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700">Recupero rep. (s)</Label>
                      <Input
                        name="rest_between_reps_s"
                        type="number"
                        min={0}
                        value={exercise.rest_between_reps_s}
                        onChange={event => handleExerciseChange(block.id, index, event)}
                        placeholder="60"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-slate-700">Recupero serie (s)</Label>
                      <Input
                        name="rest_between_sets_s"
                        type="number"
                        min={0}
                        value={exercise.rest_between_sets_s}
                        onChange={event => handleExerciseChange(block.id, index, event)}
                        placeholder="180"
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Intensità percepita */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Intensità percepita</Label>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                        <input
                          type="range"
                          min={1}
                          max={10}
                          step={1}
                          name="intensity"
                          value={exercise.intensity}
                          onChange={event => handleExerciseChange(block.id, index, event)}
                          className="range-input w-full"
                          style={buildRangeBackground(exercise.intensity)}
                        />
                        <div className="mt-2 grid grid-cols-10 gap-0.5 text-[9px]">
                          {Array.from({ length: 10 }).map((_, tickIndex) => {
                            const tickValue = tickIndex + 1;
                            const isActive = sliderValue >= tickValue;
                            return (
                              <div key={tickValue} className="flex flex-col items-center gap-0.5">
                                <span
                                  className={cn(
                                    'block h-1.5 w-0.5 rounded-full transition-colors',
                                    isActive ? 'bg-sky-500' : 'bg-slate-300'
                                  )}
                                />
                                <span
                                  className={cn(
                                    'font-medium',
                                    isActive ? 'text-slate-600' : 'text-slate-400'
                                  )}
                                >
                                  {tickValue}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-1.5 grid grid-cols-4 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                          <span className="text-left">Basso</span>
                          <span className="text-center">Medio</span>
                          <span className="text-center">Alto</span>
                          <span className="text-right">Massimo</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-sky-700 font-medium">
                            <Flame className="h-3 w-3" /> {exercise.intensity || '—'}/10
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-500 text-[10px]">
                            <Clock className="h-3 w-3" /> Effort: {effortType ?? '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                  {/* Note esercizio */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700">Note esercizio</Label>
                    <Textarea
                      name="notes"
                      value={exercise.notes}
                      onChange={event => handleExerciseChange(block.id, index, event)}
                      placeholder="Dettagli su esecuzione, appunti tecnici, feedback..."
                      className="min-h-[72px]"
                    />
                  </div>

                    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Timer className="h-4 w-4 text-slate-500" /> Registro serie e ripetute
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => addSeries(block.id, index)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                          >
                            <ListPlus className="h-3 w-3" /> Aggiungi serie
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateLastSeries(block.id, index)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100"
                            disabled={seriesGroups.length === 0}
                          >
                            <PlusCircle className="h-3 w-3" /> Duplica ultima serie
                          </button>
                        </div>
                      </div>

                      <p className="mt-4 text-xs text-slate-500">
                        Organizza le ripetute per serie e registra tempi, recuperi e sensazioni percepite durante ogni prova.
                      </p>

                      {highlightCards.length > 0 && (
                        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                          {highlightCards.map(card => (
                            <div key={card.key} className="rounded-2xl bg-white px-3 py-2 text-[11px] text-slate-500">
                              <p className="text-xs font-semibold text-slate-600">{card.label}</p>
                              <p className="text-lg font-semibold text-slate-800">{card.value}</p>
                              <p className="text-[10px] text-slate-400">{card.description}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {seriesGroups.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4 text-xs text-slate-600">
                          <p className="text-sm font-semibold text-slate-700">Nessuna serie registrata</p>
                          <p className="mt-1 text-slate-500">
                            Definisci serie e ripetizioni nel piano e aggiungi la prima serie per iniziare a raccogliere i tempi.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                            {exercise.sets && exercise.repetitions && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                                <ListPlus className="h-3 w-3 text-slate-500" /> Piano: {exercise.sets} serie × {exercise.repetitions} rip.
                              </span>
                            )}
                            {distanceValue != null && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                                <Ruler className="h-3 w-3 text-slate-500" /> {distanceValue} m
                              </span>
                            )}
                            {exercise.rest_between_reps_s && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                                <RefreshCcw className="h-3 w-3 text-slate-500" /> Recupero tra ripetizioni: {exercise.rest_between_reps_s}s
                              </span>
                            )}
                            {exercise.rest_between_sets_s && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                                <Clock className="h-3 w-3 text-slate-500" /> Recupero tra serie: {exercise.rest_between_sets_s}s
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => addSeries(block.id, index)}
                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-700"
                          >
                            <PlusCircle className="h-3 w-3" /> Aggiungi la prima serie
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-4">
                          {seriesGroups.map(group => (
                            <div key={group.seriesNumber} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-700">Serie #{group.seriesNumber}</p>
                                  <p className="text-xs text-slate-500">Ripetizioni registrate: {group.entries.length}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => addRepetition(block.id, index, group.seriesNumber)}
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                                  >
                                    <ListPlus className="h-3 w-3" /> Aggiungi ripetizione
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeSeries(block.id, index, group.seriesNumber)}
                                    className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-3 w-3" /> Rimuovi serie
                                  </button>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                {distanceValue != null && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                                    <Ruler className="h-3 w-3 text-slate-500" /> {distanceValue} m
                                  </span>
                                )}
                                {exercise.rest_between_reps_s && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                                    <RefreshCcw className="h-3 w-3 text-slate-500" /> Recupero previsto: {exercise.rest_between_reps_s}s
                                  </span>
                                )}
                                {exercise.rest_between_sets_s && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                                    <Clock className="h-3 w-3 text-slate-500" /> Pausa tra serie: {exercise.rest_between_sets_s}s
                                  </span>
                                )}
                              </div>

                              <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-sm">
                                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                      <th className="px-3 py-2 text-left">Ripetizione</th>
                                      <th className="px-3 py-2 text-left">Tempo (s)</th>
                                      <th className="px-3 py-2 text-left">Recupero (s)</th>
                                      <th className="px-3 py-2 text-left">RPE</th>
                                      <th className="px-3 py-2 text-left">Note</th>
                                      <th className="px-3 py-2 text-right">Azioni</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {group.entries.map(entry => {
                                      const numericTime = parseDecimalInput(entry.result.time_s);
                                      const numericRecovery = parseDecimalInput(entry.result.weight_kg);
                                      const numericRpe = parseDecimalInput(entry.result.rpe);
                                      const isBestTime =
                                        numericTime != null &&
                                        bestTime != null &&
                                        Math.abs(numericTime - bestTime) < 0.001;
                                      const isEasiestRpe =
                                        numericRpe != null &&
                                        easiestRpe != null &&
                                        Math.abs(numericRpe - easiestRpe) < 0.001;

                                      return (
                                        <tr
                                          key={`${group.seriesNumber}-${entry.repetitionNumber}-${entry.resultIndex}`}
                                          className="bg-white"
                                        >
                                          <td className="px-3 py-3 align-top text-sm font-medium text-slate-600">
                                            Rip. #{entry.repetitionNumber}
                                          </td>
                                          <td className="px-3 py-3 align-top">
                                            <div className="space-y-1">
                                              <Input
                                                name="time_s"
                                                type="number"
                                                step="0.01"
                                                min={0}
                                                value={entry.result.time_s}
                                                onChange={event => handleResultChange(block.id, index, entry.resultIndex, event)}
                                              />
                                              {isBestTime && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                                  <Trophy className="h-3 w-3" /> PB di giornata
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-3 py-3 align-top">
                                            <div className="space-y-1">
                                              <Input
                                                name="weight_kg"
                                                type="number"
                                                step="0.5"
                                                min={0}
                                                value={entry.result.weight_kg}
                                                onChange={event => handleResultChange(block.id, index, entry.resultIndex, event)}
                                              />
                                              {numericRecovery == null && exercise.rest_between_reps_s && (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                                  <RefreshCcw className="h-3 w-3" /> Previsto {exercise.rest_between_reps_s}s
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-3 py-3 align-top">
                                            <div className="space-y-1">
                                              <Input
                                                name="rpe"
                                                type="number"
                                                step="0.1"
                                                min={0}
                                                max={10}
                                                value={entry.result.rpe}
                                                onChange={event => handleResultChange(block.id, index, entry.resultIndex, event)}
                                              />
                                              {isEasiestRpe && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                                                  <Gauge className="h-3 w-3" /> RPE più basso
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-3 py-3 align-top">
                                            <Textarea
                                              name="notes"
                                              value={entry.result.notes}
                                              onChange={event => handleResultChange(block.id, index, entry.resultIndex, event)}
                                              placeholder="Condizioni, feedback, adattamenti..."
                                              rows={2}
                                            />
                                          </td>
                                          <td className="px-3 py-3 align-top text-right">
                                            <button
                                              type="button"
                                              onClick={() => removeResult(block.id, index, entry.resultIndex)}
                                              className="inline-flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600"
                                            >
                                              <Trash2 className="h-3 w-3" /> Rimuovi
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                </div>
              );
            })}

                  {/* Add Exercise to Block Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addExercise(block.id)}
                    className="group flex w-full items-center justify-center gap-2 rounded-2xl border-dashed border-slate-300 py-3 text-sm text-slate-600 hover:border-sky-300 hover:bg-sky-50"
                  >
                    <PlusCircle className="h-4 w-4 transition-colors group-hover:text-sky-600" />
                    Aggiungi esercizio al blocco
                  </Button>
                </div>
              ))}

              {/* Add New Block Button */}
              <Button
                type="button"
                variant="outline"
                onClick={addBlock}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl border-dashed border-sky-300 bg-sky-50/50 py-4 text-sky-700 hover:border-sky-400 hover:bg-sky-100"
              >
                <Package className="h-5 w-5 transition-colors group-hover:text-sky-600" strokeWidth={2} />
                Aggiungi nuovo blocco di ripetute
              </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Metriche */}
        <div ref={sectionRefs.metrics} className="scroll-mt-24">
          {!isMetricSession ? (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader 
                className="pb-2.5 cursor-pointer md:cursor-default"
                onClick={() => setExpandedSection(prev => prev === 'metrics' ? null : 'metrics')}
              >
                <CardTitle className="flex items-center justify-between text-lg text-slate-800">
                  <span className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-slate-600" strokeWidth={2} /> Metriche e test
                  </span>
                  <ChevronDown 
                    className={cn(
                      "h-5 w-5 text-slate-400 transition-transform md:hidden",
                      expandedSection === 'metrics' && "rotate-180"
                    )} 
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className={cn(
                "flex flex-col items-center gap-3 pb-4 text-center",
                expandedSection !== 'metrics' && "hidden md:flex"
              )}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                  <Target className="h-5 w-5" strokeWidth={2} />
                </div>
                <p className="text-lg text-slate-800 font-semibold">
                  Sezione riservata a test, gare e massimali
                </p>
                <p className="text-sm text-slate-600">
                  Per registrare metriche, test o massimali cambia il tipo di sessione in:{' '}
                  <span className="font-semibold text-amber-600">Test</span>,{' '}
                  <span className="font-semibold text-rose-600">Gara</span> o{' '}
                  <span className="font-semibold text-emerald-600">Massimale</span>.
                </p>
                <p className="text-xs text-slate-500">
                  Gli allenamenti standard utilizzano la sezione «Ripetute» per registrare esercizi e serie.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader 
                className="pb-2.5 cursor-pointer md:cursor-default"
                onClick={() => setExpandedSection(prev => prev === 'metrics' ? null : 'metrics')}
              >
                <CardTitle className="flex items-center justify-between text-lg text-slate-800">
                  <span className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-sky-600" strokeWidth={2} /> Metriche e test
                  </span>
                  <ChevronDown 
                    className={cn(
                      "h-5 w-5 text-slate-400 transition-transform md:hidden",
                      expandedSection === 'metrics' && "rotate-180"
                    )} 
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className={cn(
                "space-y-4 p-4",
                expandedSection !== 'metrics' && "hidden md:block"
              )}>
                {metrics.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center text-sm text-slate-500">
                  <p>
                    {isMetricSession
                      ? 'Aggiungi le prove della gara o del test: distanza, tempo e recupero.'
                      : 'Collega metriche come tempi test, valori massimali o dati di recupero alla sessione.'}
                  </p>
                  <Button
                    type="button"
                    onClick={addMetric}
                    variant="outline"
                    className="mt-3 gap-2 rounded-full border-slate-300"
                  >
                    <PlusCircle className="h-4 w-4" />
                    {isMetricSession ? 'Aggiungi prova' : 'Aggiungi metrica'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {!isMetricSession && metricSuggestions.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Sparkles className="h-4 w-4 text-sky-600" /> Suggerimenti rapidi
                        </div>
                        <p className="text-xs text-slate-500">
                          Usa i preset per legare subito le metriche al tipo di allenamento o disciplina.
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {metricSuggestions.map(suggestion => (
                          <button
                            key={`${suggestion.metric_name}-${suggestion.category}`}
                            type="button"
                            onClick={() => handleAddMetricFromSuggestion(suggestion)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-sky-200 hover:text-sky-600"
                            title={suggestion.hint}
                          >
                            <PlusCircle className="h-3 w-3" />
                            <span>{suggestion.metric_name}</span>
                            <span className="text-slate-400">
                              · {metricCategories.find(cat => cat.value === suggestion.category)?.label ?? suggestion.category}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {metrics.map((metric, index) => {
                    const intensityNumber = parseDecimalInput(metric.intensity) ?? 0;
                    return (
                      <div key={index} className="rounded-2xl border border-slate-200 bg-white/70 p-3.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Activity className="h-4 w-4 text-slate-500" />
                            {isMetricSession ? `Prova #${index + 1}` : `Metrica #${index + 1}`}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMetric(index)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" /> Rimuovi
                          </button>
                        </div>

                        {isMetricSession ? (
                          <div className="mt-3 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-700">Data della sessione</Label>
                                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                                  <Calendar className="h-4 w-4 text-slate-400" />
                                  <span>
                                    {sessionForm.date
                                      ? formatDateHuman(sessionForm.date)
                                      : 'Imposta la data nella sezione Dettagli sessione'}
                                  </span>
                                </div>
                                {!sessionForm.date && (
                                  <p className="text-[11px] text-rose-500">
                                    La data verrà salvata automaticamente quando compili i dettagli della sessione.
                                  </p>
                                )}
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-700">
                                  {sessionForm.type === 'massimale' ? 'Esercizio' : 'Prova / Distanza'}
                                </Label>
                                {sessionForm.type === 'massimale' ? (
                                  <select
                                    name="metric_name"
                                    value={metric.metric_name}
                                    onChange={event => updateMetric(index, event)}
                                    className="flex h-9 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {massimaliExercises.map(exercise => (
                                      <option key={exercise} value={exercise}>
                                        {exercise}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <Input
                                    name="metric_name"
                                    value={metric.metric_name}
                                    onChange={event => updateMetric(index, event)}
                                    placeholder="Es. Test 150m massimo sforzo"
                                    className="h-9"
                                  />
                                )}
                              </div>
                            </div>

                            {sessionForm.type === 'massimale' ? (
                              // Per massimali: solo Valore e RPE (no distanza/tempo/recupero)
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-medium text-slate-700">Valore (kg)</Label>
                                  <Input
                                    name="value"
                                    type="number"
                                    step="0.5"
                                    min={0}
                                    value={metric.value}
                                    onChange={event => updateMetric(index, event)}
                                    className={cn('h-9', errors[`metric-${index}-value`] && 'border-red-500')}
                                    placeholder="Es. 120"
                                  />
                                  {errors[`metric-${index}-value`] && (
                                    <p className="text-[11px] text-red-500">{errors[`metric-${index}-value`]}</p>
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-medium text-slate-700">RPE (1-10)</Label>
                                  <Input
                                    name="intensity"
                                    type="number"
                                    min={1}
                                    max={10}
                                    step={1}
                                    value={metric.intensity}
                                    onChange={event => updateMetric(index, event)}
                                    className="h-9"
                                  />
                                  <p className="text-[11px] text-slate-500">
                                    {intensityNumber <= 3
                                      ? 'Scarico o ritmo blando'
                                      : intensityNumber <= 6
                                      ? 'Intensità controllata'
                                      : intensityNumber <= 8
                                      ? 'Spinta elevata'
                                      : 'Massimo sforzo'}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              // Per test/gara: Distanza, Tempo, Recupero, RPE
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-medium text-slate-700">Distanza (m)</Label>
                                  <Input
                                    name="distance_m"
                                    type="number"
                                    min={0}
                                    value={metric.distance_m}
                                    onChange={event => updateMetric(index, event)}
                                    className={cn('h-9', errors[`metric-${index}-distance_m`] && 'border-red-500')}
                                  />
                                  {errors[`metric-${index}-distance_m`] && (
                                    <p className="text-[11px] text-red-500">{errors[`metric-${index}-distance_m`]}</p>
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-medium text-slate-700">Tempo (s)</Label>
                                  <Input
                                    name="time_s"
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={metric.time_s}
                                    onChange={event => updateMetric(index, event)}
                                    className={cn('h-9', errors[`metric-${index}-time_s`] && 'border-red-500')}
                                  />
                                  {errors[`metric-${index}-time_s`] && (
                                    <p className="text-[11px] text-red-500">{errors[`metric-${index}-time_s`]}</p>
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-medium text-slate-700">Recupero (min)</Label>
                                  <Input
                                    name="recovery_post_s"
                                    type="number"
                                    min={0}
                                    step="0.1"
                                    value={metric.recovery_post_s}
                                    onChange={event => updateMetric(index, event)}
                                    placeholder="Es. 7"
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-medium text-slate-700">RPE (1-10)</Label>
                                  <Input
                                    name="intensity"
                                    type="number"
                                    min={1}
                                    max={10}
                                    step={1}
                                    value={metric.intensity}
                                    onChange={event => updateMetric(index, event)}
                                    className="h-9"
                                  />
                                  <p className="text-[11px] text-slate-500">
                                    {intensityNumber <= 3
                                      ? 'Scarico o ritmo blando'
                                      : intensityNumber <= 6
                                      ? 'Intensità controllata'
                                      : intensityNumber <= 8
                                      ? 'Spinta elevata'
                                      : 'Massimo sforzo'}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-600">Note</Label>
                              <Textarea
                                name="notes"
                                value={metric.notes}
                                onChange={event => updateMetric(index, event)}
                                placeholder="Sensazioni, feedback, contesto..."
                                className="min-h-[80px]"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-600">Data</Label>
                                <Input
                                  type="date"
                                  name="date"
                                  value={metric.date}
                                  onChange={event => updateMetric(index, event)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-600">Nome metrica</Label>
                                <Input
                                  name="metric_name"
                                  value={metric.metric_name}
                                  onChange={event => updateMetric(index, event)}
                                  placeholder="Es. Peso corporeo, Test 30m"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-600">Categoria</Label>
                                <div className="flex flex-wrap gap-2">
                                  {metricCategories.map(category => {
                                    const Icon = metricCategoryIcons[category.value] ?? Activity;
                                    const isActive = metric.category === category.value;
                                    return (
                                      <button
                                        key={category.value}
                                        type="button"
                                        onClick={() => handleMetricCategorySelect(index, category.value)}
                                        className={cn(
                                          'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition',
                                          isActive
                                            ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200'
                                        )}
                                        aria-pressed={isActive}
                                      >
                                        <Icon className="h-3.5 w-3.5" />
                                        {category.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  {metricCategories.find(cat => cat.value === metric.category)?.description ??
                                    'Abbina rapidamente la metrica all\'allenamento'}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-4">
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-600">
                                  {sessionForm.type === 'massimale' ? 'Esercizio' : 'Target / Test'}
                                </Label>
                                {sessionForm.type === 'massimale' ? (
                                  <select
                                    name="metric_target"
                                    value={metric.metric_target}
                                    onChange={event => updateMetric(index, event)}
                                    className="flex h-9 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {massimaliExercises.map(exercise => (
                                      <option key={exercise} value={exercise}>
                                        {exercise}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <Input
                                    name="metric_target"
                                    value={metric.metric_target}
                                    onChange={event => updateMetric(index, event)}
                                    placeholder="Es. 60m indoor"
                                  />
                                )}
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-600">Valore</Label>
                                <Input
                                  name="value"
                                  type="number"
                                  step="0.01"
                                  value={metric.value}
                                  onChange={event => updateMetric(index, event)}
                                  className={cn(errors[`metric-${index}-value`] && 'border-red-500')}
                                />
                                {errors[`metric-${index}-value`] && (
                                  <p className="text-[11px] text-red-500">{errors[`metric-${index}-value`]}</p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-600">Unità</Label>
                                <Input
                                  name="unit"
                                  value={metric.unit}
                                  onChange={event => updateMetric(index, event)}
                                  placeholder="kg, s, cm..."
                                  readOnly={sessionForm.type === 'massimale' || sessionForm.type === 'test' || sessionForm.type === 'gara'}
                                  className={cn(
                                    (sessionForm.type === 'massimale' || sessionForm.type === 'test' || sessionForm.type === 'gara') && 
                                    'bg-slate-50 cursor-not-allowed'
                                  )}
                                />
                              </div>
                              <div className="space-y-1 md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-600">Note</Label>
                                <Textarea
                                  name="notes"
                                  value={metric.notes}
                                  onChange={event => updateMetric(index, event)}
                                  placeholder="Sensazioni, contesto del test..."
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addMetric}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-dashed border-slate-300 py-3 text-slate-600 hover:border-sky-300 hover:bg-sky-50"
                  >
                    <PlusCircle className="h-4 w-4" />
                    {isMetricSession ? 'Aggiungi un’altra prova' : 'Aggiungi un’altra metrica'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </div>
      </div>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 rounded-full px-6 py-3 text-base shadow-lg"
        >
          {loading && <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />}
          Salva allenamento
        </Button>
      </div>
      <ConfirmDialog
        open={blockToDelete != null}
        title="Eliminare il blocco?"
        description={
          blockToDelete
            ? `Confermando rimuoverai il collegamento con ${blockToDelete.label}.`
            : undefined
        }
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        tone="danger"
        processing={blockToDelete ? blockActionLoading === blockToDelete.id : false}
        onCancel={() => setBlockToDelete(null)}
        onConfirm={confirmDeleteBlock}
      />
    </motion.div>
  );
}
