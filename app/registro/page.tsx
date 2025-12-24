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
import { useKeyboardShortcuts } from '@/lib/keyboard-shortcuts';
import { useAutoSave } from '@/lib/useAutoSave';
import { AutoSaveIndicator } from '@/components/ui/auto-save-indicator';
import { DraftRestoreDialog } from '@/components/ui/draft-restore-dialog';
import { ShortcutsHelp } from '@/components/ui/shortcuts-help';
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
import { MobileStepIndicator, DesktopStepIndicator, type WizardStep } from '@/components/ui/wizard-steps';
import { useFieldValidation, validators } from '@/components/ui/field-validation';

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
    emoji: '🏃‍♂️',
    color: 'orange',
  },
  {
    value: 'test',
    label: 'Test cronometrati',
    hint: 'Valutazioni ufficiali o simulate svolte in pista',
    emoji: '⏱️',
    color: 'blue',
  },
  {
    value: 'gara',
    label: 'Gara',
    hint: 'Competizioni ufficiali o simulazioni complete',
    emoji: '🏆',
    color: 'amber',
  },
  {
    value: 'palestra',
    label: 'Test massimali',
    hint: 'Test di forza massima: squat, girata, stacco, trazioni',
    emoji: '🏋️',
    color: 'purple',
  },
  {
    value: 'scarico',
    label: 'Scarico attivo',
    hint: 'Sessioni leggere di rigenerazione sempre in pista',
    emoji: '🌊',
    color: 'cyan',
  },
  {
    value: 'recupero',
    label: 'Recupero',
    hint: 'Lavori di mobilità, jogging blando o tecnica a bassa intensità',
    emoji: '🧘',
    color: 'green',
  },
  {
    value: 'altro',
    label: 'Altro',
    hint: 'Qualsiasi sessione particolare legata alla pista',
    emoji: '📌',
    color: 'slate',
  },
];

const disciplineTypes = [
  { value: 'ripetute_scioltezza', label: 'Ripetute in scioltezza' },
  { value: 'accelerazioni', label: 'Accelerazioni' },
  { value: 'ripetute_standard', label: 'Ripetute standard' },
  { value: 'tecnica', label: 'Tecnica di corsa' },
  { value: 'resistenza', label: 'Resistenza' },
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
  return sessionType === 'test' || sessionType === 'gara' || sessionType === 'palestra';
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

// Quick-select per distanze comuni
const commonDistances = [30, 60, 100, 150, 200, 300, 400];

// Preset per recuperi comuni
const commonRecoveries = [
  { value: 60, label: '60s' },
  { value: 90, label: '90s' },
  { value: 120, label: '2min' },
  { value: 180, label: '3min' },
  { value: 300, label: '5min' },
];

// Label descrittive per intensità
const intensityLabels = {
  range1: { min: 1, max: 3, label: 'Leggero', color: 'text-green-600' },
  range2: { min: 4, max: 6, label: 'Medio', color: 'text-blue-600' },
  range3: { min: 7, max: 8, label: 'Alto', color: 'text-amber-600' },
  range4: { min: 9, max: 10, label: 'Massimo', color: 'text-red-600' },
};

function getIntensityLabel(value: string | number): { label: string; color: string } {
  const numValue = typeof value === 'string' ? parseInt(value) || 6 : value;
  if (numValue >= 1 && numValue <= 3) return { label: intensityLabels.range1.label, color: intensityLabels.range1.color };
  if (numValue >= 4 && numValue <= 6) return { label: intensityLabels.range2.label, color: intensityLabels.range2.color };
  if (numValue >= 7 && numValue <= 8) return { label: intensityLabels.range3.label, color: intensityLabels.range3.color };
  return { label: intensityLabels.range4.label, color: intensityLabels.range4.color };
}

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
  discipline_type: '',
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
  date: new Date().toISOString().split('T')[0], // Auto-compila con data odierna
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
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

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

  // Auto-save hook
  const formDataForSave = useMemo(() => ({
    sessionForm,
    exerciseBlocks,
    metrics,
    isMetricSession,
  }), [sessionForm, exerciseBlocks, metrics, isMetricSession]);

  const { lastSaved, hasDraft, loadDraft, clearDraft, isSaving } = useAutoSave(formDataForSave, {
    key: 'session-draft',
    interval: 30000, // 30 secondi
    enabled: true,
  });

  // Keyboard shortcuts
  const shortcuts = [
    {
      key: 's',
      ctrl: true,
      description: 'Salva sessione',
      action: () => void handleSubmit(),
      preventDefault: true,
    },
    {
      key: 'Escape',
      description: 'Chiudi form blocco',
      action: () => {
        if (showBlockForm) {
          setShowBlockForm(false);
        }
      },
    },
  ];

  useKeyboardShortcuts(shortcuts);

  useEffect(() => {
    void fetchBlocks();
  }, []);

  // Check draft on mount
  useEffect(() => {
    if (hasDraft) {
      setShowDraftDialog(true);
    }
  }, [hasDraft]);

  useEffect(() => {
    setMetrics(prev => {
      if (isMetricSession) {
        // Auto-fill based on session type
        const getDefaultUnit = () => {
          if (sessionForm.type === 'palestra') return 'kg';
          if (sessionForm.type === 'test' || sessionForm.type === 'gara') return 's';
          return '';
        };

        const getDefaultMetricName = () => {
          if (sessionForm.type === 'palestra') return massimaliExercises[0]; // Squat by default
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

  function handleRestoreDraft() {
    const draft = loadDraft();
    if (draft) {
      setSessionForm(draft.sessionForm);
      setExerciseBlocks(draft.exerciseBlocks);
      setMetrics(draft.metrics);
    }
    setShowDraftDialog(false);
  }

  function handleDiscardDraft() {
    clearDraft();
    setShowDraftDialog(false);
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

  // Auto-avanza alla sezione successiva quando quella corrente è completa
  useEffect(() => {
    const detailsComplete = Boolean(sessionForm.date && sessionForm.type && sessionForm.location);
    const exercisesComplete = isMetricSession || (
      exerciseBlocks.length > 0 &&
      exerciseBlocks.every(block => 
        block.exercises.every(ex => ex.name.trim() && ex.discipline_type && ex.sets && ex.repetitions)
      )
    );

    if (detailsComplete && expandedSection === 'details' && !isMetricSession) {
      // Auto-apri sezione esercizi quando dettagli completati
      setTimeout(() => {
        setExpandedSection('exercises');
        handleScrollToSection('exercises');
      }, 300);
    } else if (exercisesComplete && expandedSection === 'exercises') {
      // Auto-apri sezione metriche quando esercizi completati
      setTimeout(() => {
        setExpandedSection('metrics');
        handleScrollToSection('metrics');
      }, 300);
    }
  }, [sessionForm.date, sessionForm.type, sessionForm.location, exerciseBlocks, isMetricSession, expandedSection]);

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

  function validateBlockForm() {
    const newErrors: Record<string, string> = {};

    if (!blockForm.name) {
      newErrors.name = 'Inserisci un nome per il blocco';
    }
    if (!blockForm.start_date) {
      newErrors.start_date = 'Inserisci la data di inizio';
    }
    if (!blockForm.end_date) {
      newErrors.end_date = 'Inserisci la data di fine';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleCreateBlock() {
    if (!validateBlockForm()) {
      return;
    }

    setLoadingBlocks(true);
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

    setLoadingBlocks(false);

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

  function handleAddExerciseBlock() {
    const newBlock: ExerciseBlockForm = {
      ...defaultExerciseBlock,
      id: crypto.randomUUID(),
      block_number: exerciseBlocks.length + 1,
      name: `Blocco ${exerciseBlocks.length + 1}`,
      exercises: [{ ...defaultExercise }],
    };
    setExerciseBlocks(prev => [...prev, newBlock]);
  }

  function handleDuplicateExerciseBlock(blockIndex: number) {
    const blockToDuplicate = exerciseBlocks[blockIndex];
    if (!blockToDuplicate) return;

    const duplicatedBlock = {
      ...blockToDuplicate,
      id: crypto.randomUUID(),
      block_number: exerciseBlocks.length + 1,
      name: `${blockToDuplicate.name} (Copia)`,
    };
    setExerciseBlocks(prev => [...prev, duplicatedBlock]);
  }

  function handleRemoveExerciseBlock(blockIndex: number) {
    setExerciseBlocks(prev => {
      const updatedBlocks = [...prev];
      updatedBlocks.splice(blockIndex, 1);
      // Rinomina i blocchi rimanenti
      updatedBlocks.forEach((block, idx) => {
        block.block_number = idx + 1;
        block.name = `Blocco ${idx + 1}`;
      });
      return updatedBlocks;
    });
  }

  function handleExerciseBlockChange(
    blockIndex: number,
    field: keyof ExerciseBlockForm,
    value: string
  ) {
    setExerciseBlocks(prev => {
      const updatedBlocks = [...prev];
      updatedBlocks[blockIndex] = {
        ...updatedBlocks[blockIndex],
        [field]: value,
      };
      return updatedBlocks;
    });
  }

  function handleAddExercise(blockIndex: number) {
    setExerciseBlocks(prev => {
      const updatedBlocks = [...prev];
      updatedBlocks[blockIndex].exercises.push({ ...defaultExercise });
      return updatedBlocks;
    });
  }

  function handleDuplicateExercise(blockIndex: number, exerciseIndex: number) {
    setExerciseBlocks(prev => {
      const updatedBlocks = [...prev];
      const exerciseToDuplicate = updatedBlocks[blockIndex].exercises[exerciseIndex];
      if (!exerciseToDuplicate) return updatedBlocks;

      const duplicatedExercise = { ...exerciseToDuplicate };
      updatedBlocks[blockIndex].exercises.push(duplicatedExercise);
      return updatedBlocks;
    });
  }

  function handleRemoveExercise(blockIndex: number, exerciseIndex: number) {
    setExerciseBlocks(prev => {
      const updatedBlocks = [...prev];
      updatedBlocks[blockIndex].exercises.splice(exerciseIndex, 1);
      return updatedBlocks;
    });
  }

  function handleExerciseChange(
    blockIndex: number,
    exerciseIndex: number,
    field: keyof ExerciseForm,
    value: string | number
  ) {
    setExerciseBlocks(prev => {
      const updatedBlocks = [...prev];
      const exerciseToUpdate = updatedBlocks[blockIndex].exercises[exerciseIndex];
      if (!exerciseToUpdate) return updatedBlocks;

      if (field === 'intensity') {
        const parsedValue = parseDecimalInput(String(value));
        const clamped = Math.max(1, Math.min(10, parsedValue ?? 0));
        exerciseToUpdate.intensity = String(clamped);
      } else {
        (exerciseToUpdate as Record<string, string | ExerciseResultForm[]>)[field] = value;
      }

      return updatedBlocks;
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
    
    // Auto-scroll al nuovo esercizio dopo breve delay
    setTimeout(() => {
      const exercisesSection = sectionRefs.exercises.current;
      if (exercisesSection) {
        const allExercises = exercisesSection.querySelectorAll('.rounded-2xl.border.border-slate-200');
        const lastExercise = allExercises[allExercises.length - 1];
        if (lastExercise) {
          lastExercise.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 100);
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
      if (sessionForm.type === 'test' || sessionForm.type === 'gara') {
        // Test e gare richiedono distanza e tempo
        if (!metric.distance_m) {
          validation[`metric-${index}-distance_m`] = 'Indica la distanza della prova';
        }
        if (!metric.time_s) {
          validation[`metric-${index}-time_s`] = 'Inserisci il tempo registrato';
        }
      } else if (sessionForm.type === 'palestra') {
        // Massimali richiedono solo il valore (peso in kg)
        if (!metric.value) {
          validation[`metric-${index}-value`] = 'Inserisci il peso sollevato';
        }
      } else if (!metric.value) {
        // Altri tipi richiedono il valore generico
        validation[`metric-${index}-value`] = 'Inserisci il valore della metrica';
      }
    });

    setErrors(validation);
    return Object.keys(validation).length === 0;
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
        if (sessionForm.type === 'test' || sessionForm.type === 'gara') {
          // Test e gare richiedono distanza e tempo
          return !metric.distance_m || !metric.time_s;
        } else if (sessionForm.type === 'palestra') {
          // Massimali richiedono solo il valore (peso)
          return !metric.value;
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

        if (sessionForm.type === 'palestra') {
          // Massimali: salvano solo valore (peso in kg)
          payload.category = 'massimale';
          payload.value = parseDecimalInput(metric.value);
          payload.unit = 'kg';
          payload.intensity = parseDecimalInput(metric.intensity);
        } else if (sessionForm.type === 'test' || sessionForm.type === 'gara') {
          // Test e gare: salvano distanza, tempo, recupero
          payload.category = 'test';
          payload.metric_target = metric.metric_target || null;
          payload.distance_m = parseIntegerInput(metric.distance_m);
          payload.time_s = parseDecimalInput(metric.time_s);
          const recoveryMinutes = parseDecimalInput(metric.recovery_post_s);
          payload.recovery_post_s = recoveryMinutes != null ? Math.round(recoveryMinutes * 60) : null;
          payload.intensity = parseDecimalInput(metric.intensity);
          payload.unit = 's';
        } else {
          // Altri tipi di metriche
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
      
      // Cancella la bozza salvata
      clearDraft();
      
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
      if (process.env.NODE_ENV === 'development') {
        console.error('Errore salvataggio:', error);
      }
      
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
    <>
      <DraftRestoreDialog
        isOpen={showDraftDialog}
        onRestore={handleRestoreDraft}
        onDiscard={handleDiscardDraft}
        lastSaved={lastSaved}
      />
      <ConfirmDialog
        isOpen={!!blockToDelete}
        onClose={() => setBlockToDelete(null)}
        onConfirm={confirmDeleteBlock}
        title="Conferma eliminazione"
        description={`Sei sicuro di voler eliminare ${blockToDelete?.label}? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        cancelText="Annulla"
      />

      <motion.div
        key="registro-page"
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={pageTransition}
        className="container mx-auto px-4 py-8"
      >
        <PageHeader 
          title="Registro Allenamenti"
          subtitle="Aggiungi una nuova sessione di allenamento in pista"
          icon={Play}
          actions={
            <div className="flex items-center gap-2">
              <AutoSaveIndicator status={isSaving ? 'saving' : lastSaved ? 'saved' : 'idle'} lastSaved={lastSaved} />
              <ShortcutsHelp shortcuts={shortcuts} />
              <Button onClick={() => void handleSubmit()} disabled={loading} size="lg" className="bg-primary/90 hover:bg-primary text-primary-foreground">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Salva sessione
              </Button>
            </div>
          }
        />

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 lg:gap-12">
          {/* Desktop Step Indicator (Sidebar) */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24">
              <h3 className="text-lg font-semibold text-foreground mb-4">Progresso</h3>
              <DesktopStepIndicator 
                steps={stepProgress} 
                onStepClick={handleScrollToSection} 
              />
              <Card className="mt-8 bg-card/80 backdrop-blur-sm border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base">Riepilogo Sessione</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {summaryStats.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </div>
                      <span className="font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9 space-y-8">
            {/* Mobile Step Indicator */}
            <div className="lg:hidden">
              <MobileStepIndicator 
                steps={stepProgress} 
                progress={progressValue}
                onStepClick={handleScrollToSection}
              />
            </div>

            {/* Sezione Dettagli Sessione */}
            <motion.div ref={sectionRefs.details} variants={staggerItem}>
              <Card className="bg-card/80 backdrop-blur-sm border-primary/20 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Dettagli Sessione</CardTitle>
                      <p className="text-sm text-muted-foreground">Informazioni base sulla seduta odierna.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={sessionForm.date}
                      onChange={e => {
                        setSessionForm(prev => ({ ...prev, date: e.target.value }));
                        clearError('date');
                      }}
                      className={cn(errors.date && 'border-destructive')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo di sessione</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {sessionTypes.slice(0, 4).map(type => (
                        <Button
                          key={type.value}
                          variant={sessionForm.type === type.value ? 'default' : 'outline'}
                          onClick={() => handleQuickTypeSelect(type.value)}
                          className="w-full justify-start text-left"
                        >
                          <span className="mr-2">{type.emoji}</span>
                          {type.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="location">Luogo</Label>
                    <div className="flex gap-2">
                      {locationOptions.map(opt => {
                        const Icon = locationIcons[opt.value];
                        return (
                          <Button
                            key={opt.value}
                            variant={sessionForm.location === opt.value ? 'default' : 'outline'}
                            onClick={() => handleLocationSelect(opt.value)}
                          >
                            {Icon && <Icon className="mr-2 h-4 w-4" />}
                            {opt.label}
                          </Button>
                        );
                      })}
                    </div>
                    {usingCustomLocation && (
                      <Input
                        type="text"
                        placeholder="Specifica il luogo..."
                        value={customLocation}
                        onChange={e => handleCustomLocationChange(e.target.value)}
                        className={cn('mt-2', errors.location && 'border-destructive')}
                      />
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Note sulla sessione</Label>
                    <Textarea
                      id="notes"
                      placeholder="Sensazioni, focus, condizioni meteo..."
                      value={sessionForm.notes}
                      onChange={e => setSessionForm(prev => ({ ...prev, notes: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Sezione Esercizi o Metriche */}
            <AnimatePresence mode="wait">
              {isMetricSession ? (
                <motion.div
                  key="metrics-section"
                  ref={sectionRefs.metrics}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <Card className="bg-card/80 backdrop-blur-sm border-primary/20 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Target className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle>Metriche & Test</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Registra i risultati di test, gare o massimali.
                          </p>
                        </div>
                      </div>
                      <Button onClick={addMetric} variant="outline" size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Prova
                      </Button>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {metrics.map((metric, index) => (
                        <div key={index} className="p-4 rounded-lg border bg-background/50 relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7"
                            onClick={() => removeMetric(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2 md:col-span-2">
                              <Label htmlFor={`metric-name-${index}`}>Nome Prova</Label>
                              <Input
                                id={`metric-name-${index}`}
                                name="metric_name"
                                value={metric.metric_name}
                                onChange={e => updateMetric(index, e)}
                                placeholder="Es. Test 30m"
                              />
                            </div>
                            {sessionForm.type === 'palestra' ? (
                              <>
                                <div className="space-y-2">
                                  <Label htmlFor={`metric-value-${index}`}>Peso (kg)</Label>
                                  <Input
                                    id={`metric-value-${index}`}
                                    name="value"
                                    type="number"
                                    value={metric.value}
                                    onChange={e => updateMetric(index, e)}
                                    placeholder="Es. 100"
                                    className={cn(errors[`metric-${index}-value`] && 'border-destructive')}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`metric-intensity-${index}`}>Intensità (1-10)</Label>
                                  <Input
                                    id={`metric-intensity-${index}`}
                                    name="intensity"
                                    type="number"
                                    min="1" max="10"
                                    value={metric.intensity}
                                    onChange={e => updateMetric(index, e)}
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="space-y-2">
                                  <Label htmlFor={`metric-distance-${index}`}>Distanza (m)</Label>
                                  <Input
                                    id={`metric-distance-${index}`}
                                    name="distance_m"
                                    type="number"
                                    value={metric.distance_m}
                                    onChange={e => updateMetric(index, e)}
                                    placeholder="Es. 100"
                                    className={cn(errors[`metric-${index}-distance_m`] && 'border-destructive')}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`metric-time-${index}`}>Tempo (s)</Label>
                                  <Input
                                    id={`metric-time-${index}`}
                                    name="time_s"
                                    type="number"
                                    step="0.01"
                                    value={metric.time_s}
                                    onChange={e => updateMetric(index, e)}
                                    placeholder="Es. 10.52"
                                    className={cn(errors[`metric-${index}-time_s`] && 'border-destructive')}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="exercises-section"
                  ref={sectionRefs.exercises}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {exerciseBlocks.map((block, blockIndex) => (
                    <Card key={block.id} className="bg-card/80 backdrop-blur-sm border-primary/20 overflow-hidden">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg">
                              <Dumbbell className="h-6 w-6 text-primary" />
                            </div>
                            <Input
                              value={block.name}
                              onChange={e => handleExerciseBlockChange(blockIndex, 'name', e.target.value)}
                              className="text-lg font-semibold bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button onClick={() => handleDuplicateExerciseBlock(blockIndex)} variant="ghost" size="sm"><ListPlus className="mr-2 h-4 w-4" />Duplica</Button>
                            <Button onClick={() => handleRemoveExerciseBlock(blockIndex)} variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        {block.exercises.map((exercise, exerciseIndex) => (
                          <div key={exerciseIndex} className="p-4 rounded-lg border bg-background/50 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="space-y-2 md:col-span-2">
                                <Label htmlFor={`ex-name-${block.id}-${exerciseIndex}`}>Nome Esercizio</Label>
                                <Input
                                  id={`ex-name-${block.id}-${exerciseIndex}`}
                                  value={exercise.name}
                                  onChange={e => handleExerciseChange(blockIndex, exerciseIndex, 'name', e.target.value)}
                                  placeholder="Es. Ripetute 150m"
                                  className={cn(errors[`exercise-${block.id}-${exerciseIndex}-name`] && 'border-destructive')}
                                />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Disciplina</Label>
                                <div className="flex flex-wrap gap-2">
                                  {disciplineTypes.map(type => (
                                    <Button
                                      key={type.value}
                                      variant={exercise.discipline_type === type.value ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => handleDisciplineSelect(block.id, exerciseIndex, type.value)}
                                    >
                                      {type.label}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`ex-distance-${block.id}-${exerciseIndex}`}>Distanza (m)</Label>
                                <Input
                                  id={`ex-distance-${block.id}-${exerciseIndex}`}
                                  type="number"
                                  value={exercise.distance_m}
                                  onChange={e => handleExerciseChange(blockIndex, exerciseIndex, 'distance_m', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`ex-sets-${block.id}-${exerciseIndex}`}>Serie</Label>
                                <Input
                                  id={`ex-sets-${block.id}-${exerciseIndex}`}
                                  type="number"
                                  value={exercise.sets}
                                  onChange={e => handleExerciseChange(blockIndex, exerciseIndex, 'sets', e.target.value)}
                                  className={cn(errors[`exercise-${block.id}-${exerciseIndex}-sets`] && 'border-destructive')}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`ex-reps-${block.id}-${exerciseIndex}`}>Ripetizioni</Label>
                                <Input
                                  id={`ex-reps-${block.id}-${exerciseIndex}`}
                                  type="number"
                                  value={exercise.repetitions}
                                  onChange={e => handleExerciseChange(blockIndex, exerciseIndex, 'repetitions', e.target.value)}
                                  className={cn(errors[`exercise-${block.id}-${exerciseIndex}-repetitions`] && 'border-destructive')}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`ex-rest-reps-${block.id}-${exerciseIndex}`}>Recupero tra Rip. (s)</Label>
                                <Input
                                  id={`ex-rest-reps-${block.id}-${exerciseIndex}`}
                                  type="number"
                                  value={exercise.rest_between_reps_s}
                                  onChange={e => handleExerciseChange(blockIndex, exerciseIndex, 'rest_between_reps_s', e.target.value)}
                                />
                              </div>
                              <div className="md:col-span-4">
                                <Label>Intensità (1-10)</Label>
                                <Input 
                                  type="range" 
                                  min="1" max="10" 
                                  value={exercise.intensity}
                                  onChange={e => handleExerciseChange(blockIndex, exerciseIndex, 'intensity', e.target.value)}
                                  className="w-full"
                                />
                                <div className="text-center text-sm text-muted-foreground mt-1">
                                  {getIntensityLabel(exercise.intensity).label}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <Button onClick={() => handleAddExercise(blockIndex)} variant="outline" className="w-full">
                          <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Esercizio
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                   <Button onClick={handleAddExerciseBlock} variant="secondary" className="w-full">
                      <FolderPlus className="mr-2 h-4 w-4" /> Aggiungi Blocco di Esercizi
                    </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </motion.div>
    </>
  );
}
