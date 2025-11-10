'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  FolderPlus,
  Gauge,
  Loader2,
  MapPin,
  NotebookPen,
  PenSquare,
  PlusCircle,
  Sparkles,
  StickyNote,
  Target,
  Trash2,
  Weight,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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
    value: 'scarico',
    label: 'Scarico attivo',
    hint: 'Sessioni leggere di recupero con movimento controllato',
  },
  {
    value: 'altro',
    label: 'Altro',
    hint: 'Qualsiasi altro allenamento particolare',
  },
];

const exerciseCategories = [
  { value: 'sprint', label: 'Sprint' },
  { value: 'forza', label: 'Forza' },
  { value: 'mobilità', label: 'Mobilità' },
  { value: 'tecnica', label: 'Tecnica' },
  { value: 'altro', label: 'Altro' },
];

const effortOptions = [
  { value: '', label: 'Seleziona' },
  { value: 'basso', label: 'Basso' },
  { value: 'medio', label: 'Medio' },
  { value: 'alto', label: 'Alto' },
  { value: 'massimo', label: 'Massimo' },
];

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
  stadio: Sparkles,
  palestra: Dumbbell,
  outdoor: MapPin,
  custom: PenSquare,
};

const categoryIcons: Record<string, LucideIcon> = {
  sprint: Activity,
  forza: Dumbbell,
  mobilità: Sparkles,
  tecnica: Target,
  altro: PenSquare,
};

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

type ExerciseForm = {
  name: string;
  category: string;
  distance_m: string;
  sets: string;
  reps: string;
  rest_between_reps_s: string;
  rest_between_sets_s: string;
  intensity: string;
  effort: string;
  time_s: string;
  weight_kg: string;
  notes: string;
};

type StepKey = 'details' | 'exercises';

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

const defaultSession: SessionFormState = {
  block_id: '',
  date: '',
  type: '',
  phase: '',
  location: '',
  notes: '',
};

const defaultExercise: ExerciseForm = {
  name: '',
  category: 'sprint',
  distance_m: '',
  sets: '1',
  reps: '1',
  rest_between_reps_s: '',
  rest_between_sets_s: '',
  intensity: '6',
  effort: '',
  time_s: '',
  weight_kg: '',
  notes: '',
};

function mapIntensityToEffort(intensity: number | null) {
  if (intensity == null || Number.isNaN(intensity)) return '';
  if (intensity <= 3) return 'basso';
  if (intensity <= 6) return 'medio';
  if (intensity <= 8) return 'alto';
  return 'massimo';
}

function formatDateHuman(date: string) {
  if (!date) return '';
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short' }).format(new Date(date));
}

export default function RegistroPage() {
  const [sessionForm, setSessionForm] = useState<SessionFormState>(defaultSession);
  const [exercises, setExercises] = useState<ExerciseForm[]>([{ ...defaultExercise }]);
  const [trainingBlocks, setTrainingBlocks] = useState<TrainingBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [creatingBlock, setCreatingBlock] = useState(false);
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

  const sectionRefs = {
    details: useRef<HTMLDivElement | null>(null),
    exercises: useRef<HTMLDivElement | null>(null),
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
      const reps = Number(ex.reps) || 0;
      if (!distance || !sets || !reps) return acc;
      return acc + distance * sets * reps;
    }, 0);
  }, [exercises]);

  const intensityPreview = useMemo(() => {
    const values = exercises
      .map(ex => Number(ex.intensity))
      .filter(value => Number.isFinite(value));
    if (values.length === 0) return null;
    const sum = values.reduce((acc, value) => acc + value, 0);
    return sum / values.length;
  }, [exercises]);

  const categoryDistribution = useMemo(() => {
    const counter = new Map<string, number>();
    for (const exercise of exercises) {
      const key = exercise.category || 'altro';
      counter.set(key, (counter.get(key) ?? 0) + 1);
    }

    const total = exercises.length || 1;
    return Array.from(counter.entries()).map(([key, value]) => ({
      key,
      label: exerciseCategories.find(type => type.value === key)?.label ?? key,
      value,
      percentage: Math.round((value / total) * 100),
    }));
  }, [exercises]);

  const stepProgress = useMemo<StepDefinition[]>(() => {
    const detailsComplete = Boolean(sessionForm.date && sessionForm.type && sessionForm.location);
    const exercisesComplete =
      exercises.length > 0 &&
      exercises.every(ex => ex.name.trim() && ex.category && ex.sets && ex.reps);

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
    ];

    const firstIncompleteIndex = base.findIndex(step => step.status !== 'done');
    if (firstIncompleteIndex !== -1) {
      base[firstIncompleteIndex] = { ...base[firstIncompleteIndex], status: 'active' };
    }

    return base;
  }, [exercises, sessionForm.date, sessionForm.location, sessionForm.type]);

  const completedSteps = stepProgress.filter(step => step.status === 'done').length;

  function scrollToSection(key: StepKey) {
    sectionRefs[key].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clearError(key: string) {
    setErrors(prev => {
      if (!(key in prev)) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }

  function handleSessionInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setSessionForm(prev => ({ ...prev, [name]: value }));
    clearError(name);
  }

  function handleSessionTypeSelect(value: string) {
    setSessionForm(prev => ({ ...prev, type: value }));
    clearError('type');
  }

  function handleLocationSelect(value: string) {
    if (value === 'custom') {
      setUsingCustomLocation(true);
      setSessionForm(prev => ({ ...prev, location: customLocation }));
    } else {
      setUsingCustomLocation(false);
      setSessionForm(prev => ({ ...prev, location: value }));
    }
    clearError('location');
  }

  function handleCustomLocationChange(value: string) {
    setCustomLocation(value);
    setSessionForm(prev => ({ ...prev, location: value }));
  }

  function updateExerciseField(
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setExercises(prev => {
      const copy = [...prev];
      const next = { ...copy[index], [name]: value } as ExerciseForm;
      if (name === 'intensity') {
        const intensityNumber = Number(value);
        if (!next.effort) {
          next.effort = mapIntensityToEffort(Number.isFinite(intensityNumber) ? intensityNumber : null);
        }
      }
      copy[index] = next;
      return copy;
    });
    clearError(`exercise-${index}-${name}`);
  }

  function handleExerciseCategorySelect(index: number, category: string) {
    setExercises(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], category };
      return copy;
    });
    clearError(`exercise-${index}-category`);
  }

  function handleExerciseEffortSelect(index: number, effort: string) {
    setExercises(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], effort };
      return copy;
    });
  }

  function addExercise() {
    setExercises(prev => [...prev, { ...defaultExercise }]);
  }

  function removeExercise(index: number) {
    setExercises(prev => prev.filter((_, i) => i !== index));
  }

  function handleBlockSelect(blockId: string | null) {
    setSessionForm(prev => ({ ...prev, block_id: blockId ?? '' }));
  }

  async function handleDeleteBlock(blockId: string) {
    setBlockActionLoading(blockId);
    const { error } = await supabase.from('training_blocks').delete().eq('id', blockId);

    if (error) {
      toast.error('Errore durante l\'eliminazione del blocco');
    } else {
      toast.success('Blocco eliminato con successo');
      await fetchBlocks();
      if (sessionForm.block_id === blockId) {
        setSessionForm(prev => ({ ...prev, block_id: '' }));
      }
    }

    setBlockActionLoading(null);
  }

  function validateForms() {
    const validation: Record<string, string> = {};

    if (!sessionForm.date) validation.date = 'Inserisci una data valida';
    if (!sessionForm.type) validation.type = 'Seleziona il tipo di sessione';
    if (!sessionForm.location) validation.location = 'Indica il luogo della sessione';

    exercises.forEach((ex, index) => {
      if (!ex.name.trim()) validation[`exercise-${index}-name`] = 'Nome obbligatorio';
      if (!ex.category) validation[`exercise-${index}-category`] = 'Seleziona la disciplina';
      if (!ex.sets) validation[`exercise-${index}-sets`] = 'Inserisci le serie';
      if (!ex.reps) validation[`exercise-${index}-reps`] = 'Inserisci le ripetizioni';
    });

    setErrors(validation);
    return Object.keys(validation).length === 0;
  }

  async function handleCreateBlock() {
    if (!blockForm.name || !blockForm.start_date || !blockForm.end_date) {
      toast.error('Compila nome e date del blocco');
      return;
    }

    setCreatingBlock(true);

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
      setCreatingBlock(false);
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
    setCreatingBlock(false);
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
            title: null,
          },
        ])
        .select()
        .single();

      if (sessionError || !session) {
        throw sessionError ?? new Error('Sessione non creata');
      }

      for (const ex of exercises) {
        const intensityNumber = Number(ex.intensity);
        const effortValue = ex.effort || mapIntensityToEffort(Number.isFinite(intensityNumber) ? intensityNumber : null);

        const { error: exerciseError } = await supabase.from('training_exercises').insert([
          {
            session_id: session.id,
            name: ex.name,
            category: ex.category,
            distance_m: ex.distance_m ? Number(ex.distance_m) : null,
            sets: ex.sets ? Number(ex.sets) : null,
            reps: ex.reps ? Number(ex.reps) : null,
            rest_between_reps_s: ex.rest_between_reps_s ? Number(ex.rest_between_reps_s) : null,
            rest_between_sets_s: ex.rest_between_sets_s ? Number(ex.rest_between_sets_s) : null,
            intensity: ex.intensity ? Number(ex.intensity) : null,
            effort: effortValue || null,
            time_s: ex.time_s ? Number(ex.time_s) : null,
            weight_kg: ex.weight_kg ? Number(ex.weight_kg) : null,
            notes: ex.notes || null,
          },
        ]);

        if (exerciseError) {
          throw exerciseError;
        }
      }

      toast.success('Sessione registrata con successo');
      setSessionForm(defaultSession);
      setExercises([{ ...defaultExercise }]);
      setUsingCustomLocation(false);
      setCustomLocation('');
    } catch (error) {
      console.error(error);
      toast.error('Errore durante il salvataggio');
    }

    setLoading(false);
  }

  return (
    <div className="pb-16">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-sky-500 to-sky-700 p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wider text-sky-100">Registro Allenamenti</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Crea una nuova sessione</h1>
            <p className="mt-2 max-w-2xl text-sm text-sky-100">
              Pianifica, monitora e analizza la tua giornata di allenamento. Ogni esercizio include volume,
              intensità e risultati principali per una panoramica completa.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
            <div className="rounded-2xl bg-white/10 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-sky-100">Passi completati</p>
              <p className="mt-1 text-3xl font-semibold">{completedSteps}/2</p>
              <p className="mt-2 text-xs text-sky-100">
                Completa i dettagli della sessione e gli esercizi per salvare l&apos;allenamento.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-sky-100">Volume stimato</p>
              <p className="mt-1 text-3xl font-semibold">
                {volumePreview > 0 ? `${numberFormatter.format(volumePreview)} m` : '—'}
              </p>
              <p className="mt-2 text-xs text-sky-100">Calcolato in base alla distanza, serie e ripetizioni inserite.</p>
            </div>
          </div>
        </div>
        <Sparkles className="absolute -right-10 -top-10 h-56 w-56 text-white/10" />
      </div>

      <section className="mt-10">
        <div className="rounded-3xl bg-slate-900 p-6 shadow-lg">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Workflow guidato</h2>
              <p className="text-sm text-slate-300">Segui i passaggi per compilare tutte le informazioni.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="bg-white/10 text-white hover:bg-white/20" onClick={addExercise}>
                <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi esercizio
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="bg-white text-slate-900 hover:bg-slate-100">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Salva sessione
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {stepProgress.map(step => {
              const Icon = step.icon;
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => scrollToSection(step.key)}
                  className={cn(
                    'flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition',
                    step.status === 'done'
                      ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                      : step.status === 'active'
                      ? 'border-sky-400/50 bg-sky-500/10 text-sky-100'
                      : 'border-slate-700 bg-slate-800/80 text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white',
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
                        ? 'text-sky-400'
                        : 'text-slate-400'
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

      <div className="mt-10 grid gap-6">
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
                            {blockActionLoading === block.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            <span>Elimina</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBlockForm(prev => !prev)}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-sky-600 hover:text-sky-700"
                  >
                    <FolderPlus className="h-4 w-4" /> {showBlockForm ? 'Chiudi' : 'Crea nuovo blocco'}
                  </button>
                  {showBlockForm && (
                    <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-600">Nome blocco</Label>
                          <Input
                            value={blockForm.name}
                            onChange={event => setBlockForm(prev => ({ ...prev, name: event.target.value }))}
                            placeholder="Es. Preparazione indoor"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-600">Obiettivo</Label>
                          <Input
                            value={blockForm.goal}
                            onChange={event => setBlockForm(prev => ({ ...prev, goal: event.target.value }))}
                            placeholder="Es. Migliorare i 60m"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-600">Data inizio</Label>
                          <Input
                            type="date"
                            value={blockForm.start_date}
                            onChange={event => setBlockForm(prev => ({ ...prev, start_date: event.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-600">Data fine</Label>
                          <Input
                            type="date"
                            value={blockForm.end_date}
                            onChange={event => setBlockForm(prev => ({ ...prev, end_date: event.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-600">Note</Label>
                        <Textarea
                          value={blockForm.notes}
                          onChange={event => setBlockForm(prev => ({ ...prev, notes: event.target.value }))}
                          placeholder="Informazioni extra sul periodo"
                        />
                      </div>
                      <Button
                        type="button"
                        className="self-start bg-sky-600 text-white hover:bg-sky-700"
                        onClick={() => void handleCreateBlock()}
                        disabled={creatingBlock}
                      >
                        {creatingBlock ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <PlusCircle className="mr-2 h-4 w-4" />
                        )}
                        Salva blocco
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Data</Label>
                      <Input
                        type="date"
                        name="date"
                        value={sessionForm.date}
                        onChange={handleSessionInputChange}
                        aria-invalid={Boolean(errors.date)}
                      />
                      {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Tipologia</Label>
                      <div className="flex flex-wrap gap-2">
                        {sessionTypes.map(type => {
                          const Icon =
                            type.value === 'pista'
                              ? Activity
                              : type.value === 'palestra'
                              ? Dumbbell
                              : type.value === 'test'
                              ? Target
                              : type.value === 'scarico'
                              ? Clock
                              : PlusCircle;
                          const selected = sessionForm.type === type.value;
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => handleSessionTypeSelect(type.value)}
                              className={cn(
                                'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition',
                                selected
                                  ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                                  : 'border-slate-200 text-slate-600 hover:border-sky-200'
                              )}
                              aria-pressed={selected}
                            >
                              <Icon className="h-4 w-4" />
                              {type.label}
                            </button>
                          );
                        })}
                      </div>
                      {errors.type && <p className="text-xs text-red-500">{errors.type}</p>}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Fase</Label>
                      <Input
                        name="phase"
                        value={sessionForm.phase}
                        onChange={handleSessionInputChange}
                        placeholder="Es. Accumulo, Gara..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Luogo</Label>
                      <div className="flex flex-wrap gap-2">
                        {locationOptions.map(option => {
                          const Icon = locationIcons[option.value];
                          const selected =
                            option.value === 'custom'
                              ? usingCustomLocation
                              : sessionForm.location === option.value && !usingCustomLocation;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleLocationSelect(option.value)}
                              className={cn(
                                'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition',
                                selected
                                  ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                                  : 'border-slate-200 text-slate-600 hover:border-sky-200'
                              )}
                              aria-pressed={selected}
                            >
                              <Icon className="h-4 w-4" />
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                      {usingCustomLocation && (
                        <Input
                          className="mt-2"
                          value={customLocation}
                          onChange={event => handleCustomLocationChange(event.target.value)}
                          placeholder="Specificare il luogo"
                        />
                      )}
                      {errors.location && <p className="text-xs text-red-500">{errors.location}</p>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Note</Label>
                    <Textarea
                      name="notes"
                      value={sessionForm.notes}
                      onChange={handleSessionInputChange}
                      placeholder="Appunti generali sulla sessione"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div ref={sectionRefs.exercises} className="scroll-mt-24">
          <Card className="border-none shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                <Dumbbell className="h-5 w-5 text-sky-600" /> Esercizi della sessione
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {exercises.map((exercise, index) => {
                const CategoryIcon = categoryIcons[exercise.category] ?? PenSquare;
                return (
                  <div key={index} className="rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                          <CategoryIcon className="h-5 w-5" />
                        </span>
                        <div>
                          <Input
                            name="name"
                            value={exercise.name}
                            onChange={event => updateExerciseField(index, event)}
                            placeholder="Nome esercizio (es. 4x60m)"
                            className="text-base font-semibold"
                            aria-invalid={Boolean(errors[`exercise-${index}-name`])}
                          />
                          {errors[`exercise-${index}-name`] && (
                            <p className="text-xs text-red-500">{errors[`exercise-${index}-name`]}</p>
                          )}
                        </div>
                      </div>
                      {exercises.length > 1 && (
                        <Button
                          type="button"
                          className="text-xs text-slate-400 hover:text-red-500"
                          onClick={() => removeExercise(index)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Rimuovi
                        </Button>
                      )}
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-600">Categoria</Label>
                        <div className="flex flex-wrap gap-2">
                          {exerciseCategories.map(category => {
                            const selected = exercise.category === category.value;
                            const Icon = categoryIcons[category.value];
                            return (
                              <button
                                key={category.value}
                                type="button"
                                onClick={() => handleExerciseCategorySelect(index, category.value)}
                                className={cn(
                                  'inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition',
                                  selected
                                    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                                    : 'border-slate-200 text-slate-600 hover:border-sky-200'
                                )}
                                aria-pressed={selected}
                              >
                                {Icon && <Icon className="h-4 w-4" />}
                                {category.label}
                              </button>
                            );
                          })}
                        </div>
                        {errors[`exercise-${index}-category`] && (
                          <p className="text-xs text-red-500">{errors[`exercise-${index}-category`]}</p>
                        )}
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-600">Serie</Label>
                          <Input
                            name="sets"
                            type="number"
                            min="1"
                            value={exercise.sets}
                            onChange={event => updateExerciseField(index, event)}
                            aria-invalid={Boolean(errors[`exercise-${index}-sets`])}
                          />
                          {errors[`exercise-${index}-sets`] && (
                            <p className="text-xs text-red-500">{errors[`exercise-${index}-sets`]}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-600">Ripetizioni</Label>
                          <Input
                            name="reps"
                            type="number"
                            min="1"
                            value={exercise.reps}
                            onChange={event => updateExerciseField(index, event)}
                            aria-invalid={Boolean(errors[`exercise-${index}-reps`])}
                          />
                          {errors[`exercise-${index}-reps`] && (
                            <p className="text-xs text-red-500">{errors[`exercise-${index}-reps`]}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-600">Distanza (m)</Label>
                          <Input
                            name="distance_m"
                            type="number"
                            min="0"
                            value={exercise.distance_m}
                            onChange={event => updateExerciseField(index, event)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-600">Recupero tra ripetizioni (s)</Label>
                        <Input
                          name="rest_between_reps_s"
                          type="number"
                          min="0"
                          value={exercise.rest_between_reps_s}
                          onChange={event => updateExerciseField(index, event)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-600">Recupero tra serie (s)</Label>
                        <Input
                          name="rest_between_sets_s"
                          type="number"
                          min="0"
                          value={exercise.rest_between_sets_s}
                          onChange={event => updateExerciseField(index, event)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-600">Intensità (1-10)</Label>
                        <Input
                          name="intensity"
                          type="number"
                          min="1"
                          max="10"
                          step="0.5"
                          value={exercise.intensity}
                          onChange={event => updateExerciseField(index, event)}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-600">Percezione sforzo</Label>
                        <select
                          name="effort"
                          value={exercise.effort}
                          onChange={event => handleExerciseEffortSelect(index, event.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          {effortOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-600">Tempo registrato (s)</Label>
                        <Input
                          name="time_s"
                          type="number"
                          min="0"
                          step="0.01"
                          value={exercise.time_s}
                          onChange={event => updateExerciseField(index, event)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-600">Carico (kg)</Label>
                        <Input
                          name="weight_kg"
                          type="number"
                          min="0"
                          step="0.5"
                          value={exercise.weight_kg}
                          onChange={event => updateExerciseField(index, event)}
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-1">
                      <Label className="text-xs font-semibold text-slate-600">Note esercizio</Label>
                      <Textarea
                        name="notes"
                        value={exercise.notes}
                        onChange={event => updateExerciseField(index, event)}
                        placeholder="Dettagli tecnici, feeling, appunti..."
                      />
                    </div>
                  </div>
                );
              })}
              <Button type="button" variant="outline" onClick={addExercise} className="w-full border-dashed">
                <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi un altro esercizio
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
              <Gauge className="h-5 w-5 text-sky-600" /> Riepilogo rapido
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Volume previsto</p>
              <p className="mt-2 text-2xl font-semibold text-slate-800">
                {volumePreview > 0 ? `${numberFormatter.format(volumePreview)} m` : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">Somma di distanza × serie × ripetizioni</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Intensità media</p>
              <p className="mt-2 text-2xl font-semibold text-slate-800">
                {typeof intensityPreview === 'number' ? intensityPreview.toFixed(1) : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">Calcolata sulle intensità inserite</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Distribuzione focus</p>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                {categoryDistribution.map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span>{item.label}</span>
                    <span className="font-semibold text-slate-800">{item.percentage}%</span>
                  </div>
                ))}
                {categoryDistribution.length === 0 && <p>Inserisci almeno un esercizio</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
