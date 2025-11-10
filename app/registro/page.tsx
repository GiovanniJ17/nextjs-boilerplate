'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Droplets,
  Dumbbell,
  Flame,
  FolderPlus,
  Gauge,
  ListPlus,
  Loader2,
  MapPin,
  MoveRight,
  NotebookPen,
  PenSquare,
  PlusCircle,
  Ruler,
  Sparkles,
  StickyNote,
  Target,
  Trash2,
  Trophy,
  Weight,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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
  attempt_number: string;
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
  rest_after_exercise_s: string;
  intensity: string;
  notes: string;
  results: ExerciseResultForm[];
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

const sessionTypes = [
  {
    value: 'pista',
    label: 'Allenamento in pista',
    hint: 'Ripetute, lavori di velocità e sessioni tecniche su pista',
  },
  {
    value: 'palestra',
    label: 'Palestra / forza',
    hint: 'Sessioni di potenziamento muscolare e forza',
  },
  {
    value: 'test',
    label: 'Test',
    hint: 'Test di valutazione e prove specifiche',
  },
  {
    value: 'gara',
    label: 'Gara',
    hint: 'Competizioni ufficiali o simulazioni di gara',
  },
  {
    value: 'scarico',
    label: 'Scarico attivo',
    hint: 'Sessioni leggere di recupero con movimento controllato',
  },
  {
    value: 'recupero',
    label: 'Recupero',
    hint: 'Riposo guidato, mobilità e rigenerazione',
  },
  {
    value: 'altro',
    label: 'Altro',
    hint: 'Qualsiasi altro allenamento particolare',
  },
];

const disciplineTypes = [
  { value: 'sprint', label: 'Sprint' },
  { value: 'forza', label: 'Forza' },
  { value: 'mobilità', label: 'Mobilità' },
  { value: 'tecnica', label: 'Tecnica' },
  { value: 'altro', label: 'Altro' },
];

const metricCategories = [
  { value: 'prestazione', label: 'Prestazione', description: 'Tempi, carichi, misurazioni gara' },
  { value: 'fisico', label: 'Fisico', description: 'Peso, misure corporee, stato muscolare' },
  { value: 'recupero', label: 'Recupero', description: 'Qualità del sonno, HRV, percezione' },
  { value: 'test', label: 'Test', description: 'Valutazioni periodiche e benchmark' },
  { value: 'altro', label: 'Altro', description: 'Note e misurazioni extra' },
];

const sessionTypeIcons: Record<string, LucideIcon> = {
  pista: Activity,
  palestra: Dumbbell,
  test: Target,
  gara: Trophy,
  scarico: Clock,
  recupero: CheckCircle2,
  altro: PlusCircle,
};

const locationOptions = [
  { value: 'pista-indoor', label: 'Pista indoor' },
  { value: 'palazzetto', label: 'Palazzetto' },
  { value: 'stadio', label: 'Stadio' },
  { value: 'palestra', label: 'Palestra' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'custom', label: 'Altro luogo' },
];

const locationIcons: Record<string, LucideIcon> = {
  'pista-indoor': Activity,
  palazzetto: Target,
  stadio: Trophy,
  palestra: Dumbbell,
  outdoor: MapPin,
  custom: PenSquare,
};

const disciplineIcons: Record<string, LucideIcon> = {
  sprint: Activity,
  forza: Dumbbell,
  mobilità: MoveRight,
  tecnica: Target,
  altro: PenSquare,
};

const metricCategoryIcons: Record<string, LucideIcon> = {
  prestazione: Trophy,
  fisico: Weight,
  recupero: Droplets,
  test: Target,
  altro: NotebookPen,
};

const defaultExerciseResult: ExerciseResultForm = {
  attempt_number: '1',
  repetition_number: '',
  time_s: '',
  weight_kg: '',
  rpe: '',
  notes: '',
};

const defaultExercise: ExerciseForm = {
  name: '',
  discipline_type: 'sprint',
  distance_m: '',
  sets: '1',
  repetitions: '1',
  rest_between_reps_s: '',
  rest_between_sets_s: '',
  rest_after_exercise_s: '',
  intensity: '6',
  notes: '',
  results: [defaultExerciseResult],
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
  category: 'prestazione',
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
      category: 'prestazione',
      metric_target: 'Sprint breve',
      unit: 's',
      hint: 'Registra i riferimenti sui tratti esplosivi',
    },
    {
      metric_name: 'Lattato post sessione',
      category: 'recupero',
      unit: 'mmol',
      hint: 'Aiuta a monitorare la fatica metabolica',
    },
  ],
  palestra: [
    {
      metric_name: 'Carico massimo',
      category: 'prestazione',
      metric_target: 'Esercizi forza',
      unit: 'kg',
      hint: 'Traccia il peso migliore eseguito in giornata',
    },
    {
      metric_name: 'RPE sessione',
      category: 'recupero',
      unit: 'scala 1-10',
      hint: 'Valuta la percezione globale di fatica',
    },
  ],
  test: [
    {
      metric_name: 'Test CMJ',
      category: 'prestazione',
      unit: 'cm',
      hint: 'Collega il salto verticale al periodo di test',
    },
    {
      metric_name: 'HRV mattutina',
      category: 'recupero',
      unit: 'ms',
      hint: 'Controlla lo stato di recupero nei giorni dei test',
    },
  ],
  gara: [
    {
      metric_name: 'Tempo ufficiale',
      category: 'prestazione',
      unit: 's',
      hint: 'Registra il crono finale della gara',
    },
    {
      metric_name: 'Recupero post gara',
      category: 'recupero',
      unit: 'min',
      hint: 'Segna quanto tempo ti è servito per recuperare',
    },
  ],
  scarico: [
    {
      metric_name: 'Qualità sonno',
      category: 'recupero',
      unit: '1-5',
      notes: 'Nota eventuali sveglie notturne',
      hint: 'Associa la percezione di recupero ai giorni leggeri',
    },
  ],
  recupero: [
    {
      metric_name: 'Dolore muscolare',
      category: 'fisico',
      unit: '1-10',
      hint: 'Traccia il DOMS dopo lavori intensi',
    },
  ],
  altro: [
    {
      metric_name: 'Feeling generale',
      category: 'recupero',
      unit: '1-10',
      hint: 'Segna velocemente come ti senti a fine giornata',
    },
  ],
};

const disciplineMetricPlaybook: Record<string, MetricSuggestion[]> = {
  sprint: [
    {
      metric_name: 'Tempo medio ripetute',
      category: 'prestazione',
      metric_target: 'Serie sprint',
      unit: 's',
      hint: 'Confronta le prove interne alla seduta',
    },
  ],
  forza: [
    {
      metric_name: 'Peak Power',
      category: 'prestazione',
      metric_target: 'Lift principale',
      unit: 'W',
      hint: 'Inserisci il valore migliore rilevato',
    },
  ],
  mobilità: [
    {
      metric_name: 'Range articolare',
      category: 'fisico',
      metric_target: 'Angolo o profondità',
      unit: '°',
      hint: 'Annota i progressi sulla mobilità specifica',
    },
  ],
  tecnica: [
    {
      metric_name: 'Valutazione coach',
      category: 'altro',
      unit: '1-5',
      notes: 'Riporta feedback qualitativi',
      hint: 'Inserisci la nota tecnica ricevuta',
    },
  ],
  altro: [
    {
      metric_name: 'Nota chiave',
      category: 'altro',
      hint: 'Qualsiasi informazione extra collegata al focus',
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

export default function RegistroPage() {
  const [sessionForm, setSessionForm] = useState<SessionFormState>(defaultSession);
  const [exercises, setExercises] = useState<ExerciseForm[]>([
    { ...defaultExercise, results: [{ ...defaultExerciseResult }] },
  ]);
  const [metrics, setMetrics] = useState<MetricForm[]>([]);
  const [trainingBlocks, setTrainingBlocks] = useState<TrainingBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockActionLoading, setBlockActionLoading] = useState<string | null>(null);
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

  const isTestOrRaceSession = sessionForm.type === 'test' || sessionForm.type === 'gara';

  const sectionRefs = {
    details: useRef<HTMLDivElement | null>(null),
    exercises: useRef<HTMLDivElement | null>(null),
    metrics: useRef<HTMLDivElement | null>(null),
  } as const;
  const numberFormatter = useMemo(() => new Intl.NumberFormat('it-IT'), []);

  useEffect(() => {
    void fetchBlocks();
  }, []);

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
    return exercises.reduce((acc, ex) => {
      const distance = Number(ex.distance_m) || 0;
      const sets = Number(ex.sets) || 0;
      const reps = Number(ex.repetitions) || 0;
      if (!distance || !sets || !reps) return acc;
      return acc + distance * sets * reps;
    }, 0);
  }, [exercises]);

  const totalResults = useMemo(() => {
    return exercises.reduce((acc, ex) => acc + ex.results.length, 0);
  }, [exercises]);

  const disciplineDistribution = useMemo(() => {
    const counter = new Map<string, number>();
    for (const exercise of exercises) {
      const key = exercise.discipline_type || 'altro';
      counter.set(key, (counter.get(key) ?? 0) + 1);
    }

    const total = exercises.length || 1;
    return Array.from(counter.entries()).map(([key, value]) => ({
      key,
      label: disciplineTypes.find(type => type.value === key)?.label ?? key,
      value,
      percentage: Math.round((value / total) * 100),
    }));
  }, [exercises]);

  const metricSuggestions = useMemo(() => {
    if (isTestOrRaceSession) {
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

    for (const exercise of exercises) {
      const library = disciplineMetricPlaybook[exercise.discipline_type] ?? [];
      for (const suggestion of library) {
        const key = `${suggestion.metric_name}-${suggestion.category}`;
        if (!collected.has(key)) {
          collected.set(key, suggestion);
        }
      }
    }

    return Array.from(collected.values());
  }, [exercises, isTestOrRaceSession, sessionForm.type]);

  const stepProgress = useMemo<StepDefinition[]>(() => {
    const detailsComplete = Boolean(sessionForm.date && sessionForm.type && sessionForm.location);
    const exercisesComplete =
      isTestOrRaceSession ||
      (exercises.length > 0 &&
        exercises.every(ex => ex.name.trim() && ex.discipline_type && ex.sets && ex.repetitions));
    const metricsComplete = metrics.length === 0
      ? true
      : metrics.every(metric => {
          if (!metric.metric_name.trim()) return true;
          if (isTestOrRaceSession) {
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
        label: 'Esercizi',
        description: 'Serie, intensità e risultati',
        icon: Dumbbell,
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
  }, [exercises, isTestOrRaceSession, metrics, sessionForm.date, sessionForm.location, sessionForm.type]);

  const completedSteps = stepProgress.filter(step => step.status === 'done').length;
  const progressValue =
    stepProgress.length > 0 ? Math.round((completedSteps / stepProgress.length) * 100) : 0;
  const progressBarWidth = progressValue === 0 ? '6%' : `${progressValue}%`;

  const summaryStats = useMemo(
    () => [
      { icon: Dumbbell, label: 'Esercizi', value: exercises.length },
      { icon: Weight, label: 'Tentativi', value: totalResults },
      {
        icon: Ruler,
        label: 'Volume stimato',
        value: volumePreview > 0 ? `${numberFormatter.format(volumePreview)} m` : '—',
      },
      { icon: NotebookPen, label: 'Metriche collegate', value: metrics.length },
    ],
    [exercises.length, metrics.length, numberFormatter, totalResults, volumePreview]
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

  async function handleDeleteBlock(blockId: string) {
    const block = trainingBlocks.find(item => item.id === blockId);
    const confirmationLabel = block?.name ? ` il blocco "${block.name}"` : ' questo blocco';
    const shouldDelete = window.confirm(`Eliminare${confirmationLabel}? Verrà rimosso solo il collegamento.`);
    if (!shouldDelete) return;

    setBlockActionLoading(blockId);
    const { error } = await supabase.from('training_blocks').delete().eq('id', blockId);

    if (error) {
      toast.error('Errore durante l\'eliminazione del blocco');
      setBlockActionLoading(null);
      return;
    }

    toast.success('Blocco eliminato');
    setTrainingBlocks(prev => prev.filter(item => item.id !== blockId));
    setBlockActionLoading(null);
    if (sessionForm.block_id === blockId) {
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

  function handleExerciseChange(
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setExercises(prev => {
      const copy = [...prev];
      const next = { ...copy[index] };
      if (name === 'intensity') {
        const parsed = Math.max(1, Math.min(10, Number(value) || 0));
        next.intensity = String(parsed);
      } else {
        (next as Record<string, string | ExerciseResultForm[]>)[name] = value;
      }
      copy[index] = next;
      return copy;
    });

    const errorKeyMap: Record<string, string | null> = {
      name: `exercise-${index}-name`,
      discipline_type: `exercise-${index}-discipline`,
      sets: `exercise-${index}-sets`,
      repetitions: `exercise-${index}-repetitions`,
    };
    const targetKey = errorKeyMap[name];
    if (targetKey) {
      clearError(targetKey);
    }
  }

  function handleDisciplineSelect(index: number, value: string) {
    setExercises(prev => {
      const copy = [...prev];
      const next = { ...copy[index], discipline_type: value };
      copy[index] = next;
      return copy;
    });
    clearError(`exercise-${index}-discipline`);
  }

  function handleResultChange(
    exerciseIndex: number,
    resultIndex: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setExercises(prev => {
      const copy = [...prev];
      const ex = { ...copy[exerciseIndex] };
      const results = [...ex.results];
      const target = { ...results[resultIndex] } as Record<string, string>;
      target[name] = value;
      results[resultIndex] = target as ExerciseResultForm;
      ex.results = results;
      copy[exerciseIndex] = ex;
      return copy;
    });
  }

  function addExercise() {
    setExercises(prev => [
      ...prev,
      { ...defaultExercise, results: [{ ...defaultExerciseResult }] },
    ]);
  }

  function removeExercise(index: number) {
    setExercises(prev => prev.filter((_, i) => i !== index));
  }

  function addResult(exerciseIndex: number) {
    setExercises(prev => {
      const copy = [...prev];
      const ex = { ...copy[exerciseIndex] };
      ex.results = [...ex.results, { ...defaultExerciseResult }];
      copy[exerciseIndex] = ex;
      return copy;
    });
  }

  function removeResult(exerciseIndex: number, resultIndex: number) {
    setExercises(prev => {
      const copy = [...prev];
      const ex = { ...copy[exerciseIndex] };
      ex.results = ex.results.filter((_, i) => i !== resultIndex);
      copy[exerciseIndex] = ex;
      return copy;
    });
  }

  function addMetric() {
    setMetrics(prev => [...prev, { ...defaultMetric }]);
  }

  function handleMetricCategorySelect(index: number, category: string) {
    setMetrics(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], category };
      return copy;
    });
  }

  function handleAddMetricFromSuggestion(suggestion: MetricSuggestion) {
    setMetrics(prev => {
      const existingIndex = prev.findIndex(metric =>
        metric.metric_name.trim().toLowerCase() === suggestion.metric_name.toLowerCase()
      );

      if (existingIndex !== -1) {
        const copy = [...prev];
        copy[existingIndex] = {
          ...copy[existingIndex],
          category: suggestion.category,
          metric_target: suggestion.metric_target ?? copy[existingIndex].metric_target,
          unit: suggestion.unit ?? copy[existingIndex].unit,
          notes: suggestion.notes ?? copy[existingIndex].notes,
        };
        return copy;
      }

      return [
        ...prev,
        {
          ...defaultMetric,
          metric_name: suggestion.metric_name,
          category: suggestion.category,
          metric_target: suggestion.metric_target ?? '',
          unit: suggestion.unit ?? '',
          notes: suggestion.notes ?? '',
        },
      ];
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

  function duplicateLastResult(exerciseIndex: number) {
    setExercises(prev => {
      const copy = [...prev];
      const ex = { ...copy[exerciseIndex] };
      if (ex.results.length === 0) return prev;
      const lastResult = ex.results[ex.results.length - 1];
      const duplicated: ExerciseResultForm = {
        ...lastResult,
        attempt_number: String((Number(lastResult.attempt_number) || ex.results.length) + 1),
      };
      ex.results = [...ex.results, duplicated];
      copy[exerciseIndex] = ex;
      return copy;
    });
  }

  function validateForms() {
    const validation: Record<string, string> = {};

    if (!sessionForm.date) validation.date = 'Inserisci una data valida';
    if (!sessionForm.type) validation.type = 'Seleziona il tipo di sessione';
    if (!sessionForm.location) validation.location = 'Indica il luogo della sessione';

    if (!isTestOrRaceSession) {
      exercises.forEach((ex, index) => {
        if (!ex.name.trim()) validation[`exercise-${index}-name`] = 'Nome obbligatorio';
        if (!ex.discipline_type) validation[`exercise-${index}-discipline`] = 'Seleziona la disciplina';
        if (!ex.sets) validation[`exercise-${index}-sets`] = 'Inserisci le serie';
        if (!ex.repetitions) validation[`exercise-${index}-repetitions`] = 'Inserisci le ripetizioni';
      });
    }

    metrics.forEach((metric, index) => {
      if (!metric.metric_name.trim()) return;
      if (isTestOrRaceSession) {
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
      toast.error('Compila nome e date del blocco');
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
      toast.error('Errore durante la creazione del blocco');
      return;
    }

    toast.success('Blocco creato con successo');
    setBlockForm({ name: '', start_date: '', end_date: '', goal: '', notes: '' });
    setShowBlockForm(false);
    await fetchBlocks();
    if (data?.id) {
      setSessionForm(prev => ({ ...prev, block_id: data.id }));
    }
  }

  async function handleSubmit() {
    if (!validateForms()) {
      toast.error('Controlla i campi evidenziati');
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

      if (!isTestOrRaceSession) {
        for (const ex of exercises) {
          const intensityNumber = Number(ex.intensity);
          const effortType = mapIntensityToEffort(Number.isFinite(intensityNumber) ? intensityNumber : null);

          const { data: insertedExercise, error: exerciseError } = await supabase
            .from('exercises')
            .insert([
              {
                session_id: session.id,
                name: ex.name,
                discipline_type: ex.discipline_type,
                distance_m: ex.distance_m ? Number(ex.distance_m) : null,
                sets: ex.sets ? Number(ex.sets) : null,
                repetitions: ex.repetitions ? Number(ex.repetitions) : null,
                rest_between_reps_s: ex.rest_between_reps_s ? Number(ex.rest_between_reps_s) : null,
                rest_between_sets_s: ex.rest_between_sets_s ? Number(ex.rest_between_sets_s) : null,
                rest_after_exercise_s: ex.rest_after_exercise_s ? Number(ex.rest_after_exercise_s) : null,
                intensity: ex.intensity ? Number(ex.intensity) : null,
                effort_type: effortType,
                notes: ex.notes || null,
              },
            ])
            .select()
            .single();

          if (exerciseError || !insertedExercise) {
            throw exerciseError ?? new Error('Errore inserimento esercizio');
          }

          for (const [idx, res] of ex.results.entries()) {
            const hasValues = [res.time_s, res.weight_kg, res.rpe, res.notes, res.repetition_number].some(
              value => Boolean(value && value.trim())
            );

            if (!hasValues) continue;

            const { error: resultError } = await supabase.from('exercise_results').insert([
              {
                exercise_id: insertedExercise.id,
                attempt_number: res.attempt_number ? Number(res.attempt_number) : idx + 1,
                repetition_number: res.repetition_number ? Number(res.repetition_number) : null,
                time_s: res.time_s ? Number(res.time_s) : null,
                weight_kg: res.weight_kg ? Number(res.weight_kg) : null,
                rpe: res.rpe ? Number(res.rpe) : null,
                notes: res.notes || null,
              },
            ]);

            if (resultError) {
              throw resultError;
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

        if (isTestOrRaceSession) {
          payload.category = 'test';
          payload.metric_target = metric.metric_target || null;
          payload.distance_m = metric.distance_m ? Number(metric.distance_m) : null;
          payload.time_s = metric.time_s ? Number(metric.time_s) : null;
          payload.recovery_post_s = metric.recovery_post_s
            ? Math.round(Number(metric.recovery_post_s) * 60)
            : null;
          payload.intensity = metric.intensity ? Number(metric.intensity) : null;
          payload.unit = 's';
        } else {
          payload.category = metric.category || null;
          payload.metric_target = metric.metric_target || null;
          payload.value = metric.value ? Number(metric.value) : null;
          payload.unit = metric.unit || null;
        }

        const { error: metricError } = await supabase.from('metrics').insert([payload]);

        if (metricError) {
          throw metricError;
        }
      }

      toast.success('Allenamento registrato con successo');
      setSessionForm(defaultSession);
      setExercises([{ ...defaultExercise, results: [{ ...defaultExerciseResult }] }]);
      setMetrics([]);
      setErrors({});
      setUsingCustomLocation(false);
      setCustomLocation('');
      setShowBlockForm(false);
    } catch (error) {
      console.error(error);
      toast.error('Si è verificato un errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  }

  const selectedBlock = trainingBlocks.find(block => block.id === sessionForm.block_id);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-sky-600 to-blue-600 p-6 text-white shadow-lg">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur">
                <Activity className="h-4 w-4" />
                Registro allenamento
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold leading-tight">Racconta il tuo allenamento passo dopo passo</h1>
                <p className="max-w-xl text-sm text-white/80">
                  Compila i passaggi guidati per salvare sessione, esercizi e metriche. Tutto è pensato per essere chiaro anche da mobile.
                </p>
              </div>
              {selectedBlock ? (
                <div className="inline-flex items-start gap-3 rounded-2xl bg-white/15 px-4 py-3 text-sm">
                  <CheckCircle2 className="mt-1 h-4 w-4" />
                  <div>
                    <p className="font-semibold">Blocco selezionato: {selectedBlock.name}</p>
                    <p className="text-xs text-white/70">
                      {formatDateHuman(selectedBlock.start_date)} → {formatDateHuman(selectedBlock.end_date)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/90 md:flex-row md:items-center md:gap-4">
                  <div className="flex items-start gap-3">
                    <StickyNote className="mt-1 h-5 w-5 text-white/80" />
                    <div>
                      <p className="font-semibold">Abbina la sessione a un blocco</p>
                      <p className="text-xs text-white/70">
                        Ti aiuta a leggere lo storico e monitorare gli obiettivi di periodo.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreateBlockShortcut}
                    className="inline-flex items-center gap-2 rounded-full border-white/40 bg-white/10 px-4 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur transition hover:bg-white/20 hover:text-white"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Crea blocco ora
                  </Button>
                </div>
              )}
            </div>
            <div className="w-full md:w-64">
              <div className="rounded-3xl bg-white/15 px-5 py-6 text-right text-white/90 shadow-inner">
                <p className="text-xs uppercase tracking-[0.35em] text-white/70">Avanzamento</p>
                <p className="mt-2 text-4xl font-semibold">{progressValue}%</p>
                <p className="text-xs text-white/70">
                  {completedSteps} di {stepProgress.length} step completati
                </p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white/90 transition-all duration-300 ease-out"
                    style={{ width: progressBarWidth }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaryStats.map(stat => {
              const Icon = stat.icon;
              const formattedValue =
                typeof stat.value === 'number' ? numberFormatter.format(stat.value) : stat.value;

                return (
                <div key={stat.label} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <div>
                    <p className="text-xs text-white/70">{stat.label}</p>
                    <p className="text-lg font-semibold text-white">{formattedValue}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {stepProgress.map(step => {
              const Icon = step.icon;

              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => handleScrollToSection(step.key)}
                  className={cn(
                    'group flex h-full flex-col justify-between gap-3 rounded-2xl border border-white/20 bg-white/5 p-4 text-left transition hover:bg-white/10',
                    step.status === 'active' && 'bg-white text-sky-700 shadow-lg',
                    step.status === 'done' && 'border-white/40 bg-white/15 text-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-white',
                        step.status === 'active' && 'bg-sky-100 text-sky-600',
                        step.status === 'done' && 'bg-emerald-100 text-emerald-600'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p
                        className={cn(
                          'text-sm font-semibold text-white',
                          step.status === 'active' && 'text-sky-700',
                          step.status === 'done' && 'text-white'
                        )}
                      >
                        {step.label}
                      </p>
                      <p
                        className={cn(
                          'text-xs text-white/70',
                          step.status === 'active' && 'text-sky-600',
                          step.status === 'done' && 'text-white/70'
                        )}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      step.status === 'done'
                        ? 'text-emerald-200'
                        : step.status === 'active'
                        ? 'text-sky-600'
                        : 'text-white/70'
                    )}
                  >
                    {stepStatusLabel[step.status]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-6">
        <div ref={sectionRefs.details} className="scroll-mt-24">
          <Card className="border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                <NotebookPen className="h-5 w-5 text-sky-600" /> Dettagli sessione
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Blocco di allenamento</Label>
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
                          className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full border border-transparent bg-white/80 px-2 py-1 text-[10px] font-semibold text-slate-400 transition hover:border-red-200 hover:text-red-500"
                          onClick={() => handleDeleteBlock(block.id)}
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
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowBlockForm(prev => !prev)}
                    className="gap-2 rounded-full border-slate-200"
                  >
                    <PenSquare className="h-4 w-4" />
                    {showBlockForm ? 'Nascondi editor' : 'Nuovo blocco'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void fetchBlocks()}
                    className="gap-2 border-transparent bg-transparent text-xs text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-sky-600"
                  >
                    <Loader2 className={cn('h-3.5 w-3.5', loadingBlocks ? 'animate-spin' : '')} /> Aggiorna elenco
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Data</Label>
                <Input
                  type="date"
                  name="date"
                  value={sessionForm.date}
                  onChange={handleSessionChange}
                  className={cn('rounded-xl bg-slate-50', errors.date && 'border-red-500')}
                />
                {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
              </div>
            </div>

            {showBlockForm && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Target className="h-4 w-4" /> Nuovo blocco di allenamento
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Nome</Label>
                    <Input
                      value={blockForm.name}
                      onChange={event => setBlockForm(prev => ({ ...prev, name: event.target.value }))}
                      placeholder="Macro ciclo, preparazione indoor..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Inizio</Label>
                    <Input
                      type="date"
                      value={blockForm.start_date}
                      onChange={event => setBlockForm(prev => ({ ...prev, start_date: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Fine</Label>
                    <Input
                      type="date"
                      value={blockForm.end_date}
                      onChange={event => setBlockForm(prev => ({ ...prev, end_date: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Obiettivo</Label>
                    <Input
                      value={blockForm.goal}
                      onChange={event => setBlockForm(prev => ({ ...prev, goal: event.target.value }))}
                      placeholder="Es. Migliorare accelerazione"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Note</Label>
                    <Textarea
                      value={blockForm.notes}
                      onChange={event => setBlockForm(prev => ({ ...prev, notes: event.target.value }))}
                      placeholder="Appunti generali, gare obiettivo..."
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button type="button" onClick={handleCreateBlock} disabled={loadingBlocks} className="gap-2">
                    {loadingBlocks && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salva blocco
                  </Button>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Tipo di sessione</Label>
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
                          <span className={cn('flex h-6 w-6 items-center justify-center rounded-xl', isSelected ? 'bg-sky-100 text-sky-600' : 'bg-slate-100 text-slate-500')}>
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

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Fase / Periodo</Label>
                <Input
                  name="phase"
                  value={sessionForm.phase}
                  onChange={handleSessionChange}
                  placeholder="Es. Accumulo, Intensificazione, Taper"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Luogo</Label>
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

            <div>
              <Label className="text-xs font-semibold text-slate-600">Note sessione</Label>
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

        <div ref={sectionRefs.exercises} className="scroll-mt-24">
          <div className="relative">
            {isTestOrRaceSession && (
              <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/80 p-6 text-center">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">
                    Per test e gare compila solo la sezione "Metriche & Test"
                  </p>
                  <p className="text-xs text-slate-500">
                    Questa scheda resta disponibile per gli allenamenti standard.
                  </p>
                </div>
              </div>
            )}
            <Card
              className={cn(
                'border-none shadow-lg',
                isTestOrRaceSession && 'pointer-events-none opacity-50'
              )}
            >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                <ListPlus className="h-5 w-5 text-sky-600" /> Esercizi e risultati
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {disciplineDistribution.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-sky-600" /> Focus della sessione
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      Gli esercizi aggiunti guidano i suggerimenti dei risultati e delle metriche
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

              {exercises.map((exercise, index) => {
                const intensityNumber = Number(exercise.intensity) || null;
                const effortType = mapIntensityToEffort(intensityNumber);
                const attemptCount = exercise.results.length;
                const timeValues = exercise.results
                  .map(result => Number(result.time_s))
                  .filter(value => Number.isFinite(value) && value > 0);
                const weightValues = exercise.results
                  .map(result => Number(result.weight_kg))
                  .filter(value => Number.isFinite(value) && value > 0);
                const rpeValues = exercise.results
                  .map(result => Number(result.rpe))
                  .filter(value => Number.isFinite(value) && value > 0);
                const bestTime = timeValues.length > 0 ? Math.min(...timeValues) : null;
                const bestWeight = weightValues.length > 0 ? Math.max(...weightValues) : null;
                const averageRpe =
                  rpeValues.length > 0
                    ? Math.round((rpeValues.reduce((acc, curr) => acc + curr, 0) / rpeValues.length) * 10) / 10
                    : null;
                const averageTime =
                  timeValues.length > 0
                    ? Math.round((timeValues.reduce((acc, value) => acc + value, 0) / timeValues.length) * 100) / 100
                    : null;
                const easiestRpe = rpeValues.length > 0 ? Math.min(...rpeValues) : null;
                const highlightCards = (
                  [
                    {
                      key: 'attempts',
                      label: 'Tentativi',
                      value: attemptCount,
                      description:
                        attemptCount > 1
                          ? 'Confronta le prove per valutare la costanza'
                          : 'Singolo tentativo registrato',
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
                    bestWeight != null && {
                      key: 'best-weight',
                      label: 'Carico massimo',
                      value: `${bestWeight.toFixed(1)}kg`,
                      description:
                        averageRpe != null
                          ? `RPE medio ${averageRpe.toFixed(1)}`
                          : 'Registra RPE per confrontare la fatica',
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
                <div key={index} className="rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                        {exercise.discipline_type === 'forza' ? (
                          <Dumbbell className="h-5 w-5" />
                        ) : (
                          <Ruler className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-base">Esercizio #{index + 1}</p>
                        <p className="text-xs text-slate-500">{exercise.name || 'Dettagli esercizio'}</p>
                      </div>
                    </div>
                    {exercises.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExercise(index)}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" /> Rimuovi
                      </button>
                    )}
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Nome esercizio</Label>
                      <Input
                        name="name"
                        value={exercise.name}
                        onChange={event => handleExerciseChange(index, event)}
                        placeholder={
                          exercise.discipline_type === 'forza'
                            ? 'Es. Squat, Stacco...'
                            : 'Es. Sprint 150m, 3x60m...'
                        }
                        className={cn(errors[`exercise-${index}-name`] && 'border-red-500')}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Disciplina</Label>
                      <div className="flex flex-wrap gap-2">
                        {disciplineTypes.map(type => {
                          const Icon = disciplineIcons[type.value] ?? Activity;
                          const isActive = exercise.discipline_type === type.value;
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => handleDisciplineSelect(index, type.value)}
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

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Distanza (m)</Label>
                      <Input
                        name="distance_m"
                        type="number"
                        min={0}
                        value={exercise.distance_m}
                        onChange={event => handleExerciseChange(index, event)}
                        placeholder="Es. 150"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Serie</Label>
                      <Input
                        name="sets"
                        type="number"
                        min={0}
                        value={exercise.sets}
                        onChange={event => handleExerciseChange(index, event)}
                        className={cn(errors[`exercise-${index}-sets`] && 'border-red-500')}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Ripetizioni</Label>
                      <Input
                        name="repetitions"
                        type="number"
                        min={0}
                        value={exercise.repetitions}
                        onChange={event => handleExerciseChange(index, event)}
                        className={cn(errors[`exercise-${index}-repetitions`] && 'border-red-500')}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Recupero tra ripetizioni (s)</Label>
                      <Input
                        name="rest_between_reps_s"
                        type="number"
                        min={0}
                        value={exercise.rest_between_reps_s}
                        onChange={event => handleExerciseChange(index, event)}
                        placeholder="60"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Recupero tra serie (s)</Label>
                      <Input
                        name="rest_between_sets_s"
                        type="number"
                        min={0}
                        value={exercise.rest_between_sets_s}
                        onChange={event => handleExerciseChange(index, event)}
                        placeholder="180"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Recupero finale (s)</Label>
                      <Input
                        name="rest_after_exercise_s"
                        type="number"
                        min={0}
                        value={exercise.rest_after_exercise_s}
                        onChange={event => handleExerciseChange(index, event)}
                        placeholder="300"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Intensità percepita</Label>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>1</span>
                          <span>10</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          name="intensity"
                          value={exercise.intensity}
                          onChange={event => handleExerciseChange(index, event)}
                          className="mt-2 w-full"
                        />
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-sky-700">
                            <Flame className="h-3 w-3" /> {exercise.intensity || '—'}/10
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-slate-600">
                            <Clock className="h-3 w-3" /> Effort: {effortType ?? '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <Label className="text-xs font-semibold text-slate-600">Note esercizio</Label>
                    <Textarea
                      name="notes"
                      value={exercise.notes}
                      onChange={event => handleExerciseChange(index, event)}
                      placeholder="Dettagli su esecuzione, appunti tecnici, feedback..."
                    />
                  </div>

                    <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Weight className="h-4 w-4 text-slate-500" /> Risultati registrati
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => duplicateLastResult(index)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
                          disabled={exercise.results.length === 0}
                        >
                          <PlusCircle className="h-3 w-3" /> Duplica ultimo
                        </button>
                        <button
                          type="button"
                          onClick={() => addResult(index)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                          <PlusCircle className="h-3 w-3" /> Aggiungi risultato
                        </button>
                      </div>
                    </div>

                    {highlightCards.length > 0 && (
                      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                        {highlightCards.map(card => (
                          <div key={card.key} className="rounded-2xl bg-white px-3 py-2 text-[11px] text-slate-500">
                            <p className="text-xs font-semibold text-slate-600">{card.label}</p>
                            <p className="text-lg font-semibold text-slate-800">{card.value}</p>
                            <p className="text-[10px] text-slate-400">{card.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 space-y-3">
                      {exercise.results.map((result, resultIndex) => {
                        const numericTime = result.time_s ? Number(result.time_s) : null;
                        const numericWeight = result.weight_kg ? Number(result.weight_kg) : null;
                        const numericRpe = result.rpe ? Number(result.rpe) : null;
                        const highlightBadges = [] as { key: string; label: string; icon: LucideIcon; accent: string }[];
                        if (numericTime != null && bestTime != null && Math.abs(numericTime - bestTime) < 0.001) {
                          highlightBadges.push({
                            key: 'best-time',
                            label: 'PB di giornata',
                            icon: Trophy,
                            accent: 'bg-amber-100 text-amber-700',
                          });
                        }
                        if (numericWeight != null && bestWeight != null && Math.abs(numericWeight - bestWeight) < 0.001) {
                          highlightBadges.push({
                            key: 'best-weight',
                            label: 'Carico top',
                            icon: Weight,
                            accent: 'bg-emerald-100 text-emerald-700',
                          });
                        }
                        if (numericRpe != null && easiestRpe != null && Math.abs(numericRpe - easiestRpe) < 0.001) {
                          highlightBadges.push({
                            key: 'min-rpe',
                            label: 'RPE più basso',
                            icon: Gauge,
                            accent: 'bg-sky-100 text-sky-700',
                          });
                        }

                        return (
                          <div
                            key={resultIndex}
                            className={cn(
                              'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-sm',
                              highlightBadges.length > 0 && 'border-sky-200 bg-sky-50/60'
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <span className="font-semibold text-slate-700">Tentativo #{resultIndex + 1}</span>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                {numericTime != null && (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {numericTime.toFixed(2)}s
                                  </span>
                                )}
                                {numericWeight != null && (
                                  <span className="inline-flex items-center gap-1">
                                    <Weight className="h-3 w-3" /> {numericWeight.toFixed(1)}kg
                                  </span>
                                )}
                                {numericRpe != null && (
                                  <span className="inline-flex items-center gap-1">
                                    <Gauge className="h-3 w-3" /> RPE {numericRpe.toFixed(1)}
                                  </span>
                                )}
                              </div>
                              {exercise.results.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeResult(index, resultIndex)}
                                  className="flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="h-3 w-3" /> Rimuovi
                                </button>
                              )}
                            </div>

                            {highlightBadges.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {highlightBadges.map(badge => {
                                  const Icon = badge.icon;
                                  return (
                                    <span
                                      key={badge.key}
                                      className={cn(
                                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold',
                                        badge.accent
                                      )}
                                    >
                                      <Icon className="h-3 w-3" /> {badge.label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-slate-500">Tentativo</Label>
                              <Input
                                name="attempt_number"
                                type="number"
                                min={1}
                                value={result.attempt_number}
                                onChange={event => handleResultChange(index, resultIndex, event)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-slate-500">Ripetizione</Label>
                              <Input
                                name="repetition_number"
                                type="number"
                                min={1}
                                value={result.repetition_number}
                                onChange={event => handleResultChange(index, resultIndex, event)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-slate-500">Tempo (s)</Label>
                              <Input
                                name="time_s"
                                type="number"
                                step="0.01"
                                min={0}
                                value={result.time_s}
                                onChange={event => handleResultChange(index, resultIndex, event)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-slate-500">Carico (kg)</Label>
                              <Input
                                name="weight_kg"
                                type="number"
                                step="0.5"
                                min={0}
                                value={result.weight_kg}
                                onChange={event => handleResultChange(index, resultIndex, event)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-slate-500">RPE</Label>
                              <Input
                                name="rpe"
                                type="number"
                                step="0.1"
                                min={0}
                                max={10}
                                value={result.rpe}
                                onChange={event => handleResultChange(index, resultIndex, event)}
                              />
                            </div>
                            <div className="space-y-1 md:col-span-3 xl:col-span-2">
                              <Label className="text-[11px] text-slate-500">Note</Label>
                              <Input
                                name="notes"
                                value={result.notes}
                                onChange={event => handleResultChange(index, resultIndex, event)}
                                placeholder="Condizioni, feedback..."
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={addExercise}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl border-dashed border-slate-300 py-4 text-slate-600 hover:border-sky-300 hover:bg-sky-50"
            >
              <PlusCircle className="h-4 w-4 transition group-hover:text-sky-600" />
              Aggiungi un altro esercizio
            </Button>
            </CardContent>
            </Card>
          </div>
        </div>

        <div ref={sectionRefs.metrics} className="scroll-mt-24">
          <Card className="border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                <Target className="h-5 w-5 text-sky-600" /> Metriche e test
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isTestOrRaceSession && metricSuggestions.length > 0 && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
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
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-600"
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

              {metrics.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
                  <p>
                    {isTestOrRaceSession
                      ? 'Aggiungi le prove della gara o del test: distanza, tempo e recupero.'
                      : 'Collega metriche come peso, tempi test o dati di recupero alla sessione.'}
                  </p>
                  <Button
                    type="button"
                    onClick={addMetric}
                    variant="outline"
                    className="mt-3 gap-2 rounded-full border-slate-300"
                  >
                    <PlusCircle className="h-4 w-4" />
                    {isTestOrRaceSession ? 'Aggiungi prova' : 'Aggiungi metrica'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics.map((metric, index) => {
                    const intensityNumber = Number(metric.intensity) || 0;
                    return (
                      <div key={index} className="rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Activity className="h-4 w-4 text-slate-500" />
                            {isTestOrRaceSession ? `Prova #${index + 1}` : `Metrica #${index + 1}`}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMetric(index)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" /> Rimuovi
                          </button>
                        </div>

                        {isTestOrRaceSession ? (
                          <div className="mt-4 space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-600">Data</Label>
                                <Input
                                  type="date"
                                  name="date"
                                  value={metric.date}
                                  onChange={event => updateMetric(index, event)}
                                />
                              </div>
                              <div className="space-y-1 md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-600">Prova / Distanza</Label>
                                <Input
                                  name="metric_name"
                                  value={metric.metric_name}
                                  onChange={event => updateMetric(index, event)}
                                  placeholder="Es. Test 150m massimo sforzo"
                                />
                              </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-4">
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-600">Distanza (m)</Label>
                                <Input
                                  name="distance_m"
                                  type="number"
                                  min={0}
                                  value={metric.distance_m}
                                  onChange={event => updateMetric(index, event)}
                                  className={cn(errors[`metric-${index}-distance_m`] && 'border-red-500')}
                                />
                                {errors[`metric-${index}-distance_m`] && (
                                  <p className="text-[11px] text-red-500">{errors[`metric-${index}-distance_m`]}</p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-600">Tempo (s)</Label>
                                <Input
                                  name="time_s"
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  value={metric.time_s}
                                  onChange={event => updateMetric(index, event)}
                                  className={cn(errors[`metric-${index}-time_s`] && 'border-red-500')}
                                />
                                {errors[`metric-${index}-time_s`] && (
                                  <p className="text-[11px] text-red-500">{errors[`metric-${index}-time_s`]}</p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-600">Recupero post test (min)</Label>
                                <Input
                                  name="recovery_post_s"
                                  type="number"
                                  min={0}
                                  step="0.1"
                                  value={metric.recovery_post_s}
                                  onChange={event => updateMetric(index, event)}
                                  placeholder="Es. 7"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-600">Intensità percepita (1-10)</Label>
                                <Input
                                  name="intensity"
                                  type="number"
                                  min={1}
                                  max={10}
                                  step={1}
                                  value={metric.intensity}
                                  onChange={event => updateMetric(index, event)}
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

                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-600">Contesto (es. fase, condizioni)</Label>
                                <Input
                                  name="metric_target"
                                  value={metric.metric_target}
                                  onChange={event => updateMetric(index, event)}
                                  placeholder="Es. Finale, simulazione, condizioni meteo"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-600">Note</Label>
                                <Textarea
                                  name="notes"
                                  value={metric.notes}
                                  onChange={event => updateMetric(index, event)}
                                  placeholder="Sensazioni, feedback del coach..."
                                />
                              </div>
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
                                <Label className="text-xs font-semibold text-slate-600">Target / Test</Label>
                                <Input
                                  name="metric_target"
                                  value={metric.metric_target}
                                  onChange={event => updateMetric(index, event)}
                                  placeholder="Es. 60m indoor"
                                />
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
                    {isTestOrRaceSession ? 'Aggiungi un’altra prova' : 'Aggiungi un’altra metrica'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 rounded-full px-6 py-3 text-base shadow-lg"
        >
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          Salva allenamento
        </Button>
      </div>
    </div>
  );
}
