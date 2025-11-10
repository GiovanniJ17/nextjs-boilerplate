'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  Loader2,
  MapPin,
  NotebookPen,
  PenSquare,
  Plus,
  PlusCircle,
  Target,
  Trash2,
  Trophy,
  Weight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabaseClient';
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
};

const sessionTypeOptions = [
  { value: 'pista', label: 'Pista', description: 'Ripetute, sprint, tecnica in pista', icon: Activity },
  { value: 'palestra', label: 'Palestra', description: 'Forza e potenziamento', icon: Dumbbell },
  { value: 'test', label: 'Test', description: 'Valutazioni e benchmark', icon: Target },
  { value: 'scarico', label: 'Scarico', description: 'Scarico attivo guidato', icon: Clock },
  { value: 'recupero', label: 'Recupero', description: 'Rigenerazione e mobilità', icon: CheckCircle2 },
  { value: 'altro', label: 'Altro', description: 'Sessione diversa dal solito', icon: PlusCircle },
] as const;

const locationOptions = [
  { value: 'pista-indoor', label: 'Pista indoor', icon: Activity },
  { value: 'stadio', label: 'Stadio', icon: Trophy },
  { value: 'palestra', label: 'Palestra', icon: Dumbbell },
  { value: 'outdoor', label: 'Outdoor', icon: MapPin },
  { value: 'palazzetto', label: 'Palazzetto', icon: Target },
  { value: 'custom', label: 'Altro', icon: PenSquare },
] as const;

const disciplineOptions = [
  { value: 'sprint', label: 'Sprint', icon: Activity },
  { value: 'forza', label: 'Forza', icon: Dumbbell },
  { value: 'mobilità', label: 'Mobilità', icon: Clock },
  { value: 'tecnica', label: 'Tecnica', icon: Target },
  { value: 'altro', label: 'Altro', icon: NotebookPen },
] as const;

const metricCategoryOptions = [
  { value: 'prestazione', label: 'Prestazione', hint: 'Tempi, carichi, test gara', icon: Trophy },
  { value: 'fisico', label: 'Fisico', hint: 'Peso, composizione corporea', icon: Weight },
  { value: 'recupero', label: 'Recupero', hint: 'Qualità del sonno, HRV', icon: Clock },
  { value: 'test', label: 'Test', hint: 'Valutazioni periodiche', icon: Target },
  { value: 'altro', label: 'Altro', hint: 'Note extra', icon: NotebookPen },
] as const;

const defaultSessionState: SessionFormState = {
  block_id: '',
  date: new Date().toISOString().slice(0, 10),
  type: 'pista',
  phase: '',
  location: 'pista-indoor',
  notes: '',
};

const defaultResult: ExerciseResultForm = {
  attempt_number: '1',
  repetition_number: '',
  time_s: '',
  weight_kg: '',
  rpe: '',
  notes: '',
};

type ExerciseField = Exclude<keyof ExerciseForm, 'results'>;

const defaultExercise: ExerciseForm = {
  name: '',
  discipline_type: 'sprint',
  distance_m: '',
  sets: '1',
  repetitions: '1',
  rest_between_reps_s: '',
  rest_between_sets_s: '',
  rest_after_exercise_s: '',
  intensity: '',
  notes: '',
  results: [defaultResult],
};

const defaultMetric: MetricForm = {
  date: new Date().toISOString().slice(0, 10),
  metric_name: '',
  category: 'prestazione',
  metric_target: '',
  value: '',
  unit: '',
  notes: '',
};

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function ChipButton({
  label,
  active,
  icon: Icon,
  onClick,
  description,
}: {
  label: string;
  active: boolean;
  icon: LucideIcon;
  onClick: () => void;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col items-start gap-1 rounded-2xl border p-3 text-left transition',
        active
          ? 'border-sky-500 bg-sky-50/80 text-sky-800 shadow-sm'
          : 'border-slate-200 hover:border-sky-200 hover:bg-sky-50/40'
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className={cn('h-4 w-4', active ? 'text-sky-600' : 'text-slate-500')} />
        {label}
      </div>
      {description && <p className="text-xs text-slate-500">{description}</p>}
    </button>
  );
}

export default function RegistroPage() {
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [session, setSession] = useState<SessionFormState>(defaultSessionState);
  const [exercises, setExercises] = useState<ExerciseForm[]>([defaultExercise]);
  const [metrics, setMetrics] = useState<MetricForm[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadBlocks() {
      const { data, error } = await supabase
        .from('training_blocks')
        .select('id, name, start_date, end_date')
        .order('start_date', { ascending: false });

      if (error) {
        toast.error('Impossibile recuperare i blocchi di allenamento');
        return;
      }

      setBlocks(data ?? []);
      if (!session.block_id && data && data.length > 0) {
        setSession(prev => ({ ...prev, block_id: data[0].id }));
      }
    }

    loadBlocks();
  }, [session.block_id]);

  const handleSessionChange = (
    key: keyof SessionFormState,
    value: string
  ) => {
    setSession(prev => ({ ...prev, [key]: value }));
  };

  const handleExerciseChange = (
    index: number,
    key: ExerciseField,
    value: string
  ) => {
    setExercises(prev => {
      const clone = deepClone(prev);
      clone[index][key] = value;
      return clone;
    });
  };

  const handleResultChange = (
    exerciseIndex: number,
    resultIndex: number,
    key: keyof ExerciseResultForm,
    value: string
  ) => {
    setExercises(prev => {
      const clone = deepClone(prev);
      clone[exerciseIndex].results[resultIndex][key] = value;
      return clone;
    });
  };

  const handleMetricChange = (
    index: number,
    key: keyof MetricForm,
    value: string
  ) => {
    setMetrics(prev => {
      const clone = deepClone(prev);
      clone[index][key] = value;
      return clone;
    });
  };

  const addExercise = () => {
    setExercises(prev => [...prev, deepClone(defaultExercise)]);
  };

  const duplicateExercise = (index: number) => {
    setExercises(prev => {
      const clone = deepClone(prev);
      clone.splice(index + 1, 0, deepClone(prev[index]));
      return clone;
    });
  };

  const removeExercise = (index: number) => {
    setExercises(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const addResult = (exerciseIndex: number) => {
    setExercises(prev => {
      const clone = deepClone(prev);
      clone[exerciseIndex].results.push(deepClone(defaultResult));
      return clone;
    });
  };

  const removeResult = (exerciseIndex: number, resultIndex: number) => {
    setExercises(prev => {
      const clone = structuredClone(prev);
      const results = clone[exerciseIndex].results;
      clone[exerciseIndex].results = results.length === 1 ? results : results.filter((_, i) => i !== resultIndex);
      return clone;
    });
  };

  const addMetric = () => {
    setMetrics(prev => [...prev, deepClone(defaultMetric)]);
  };

  const removeMetric = (index: number) => {
    setMetrics(prev => prev.filter((_, i) => i !== index));
  };

  const recordedSummary = useMemo(() => {
    const totalResults = exercises.reduce((acc, exercise) => acc + exercise.results.length, 0);
    const involvedDisciplines = Array.from(new Set(exercises.map(item => item.discipline_type)));
    return {
      totalExercises: exercises.length,
      totalResults,
      involvedDisciplines,
    };
  }, [exercises]);

  const resetForm = () => {
    setSession(defaultSessionState);
    setExercises([deepClone(defaultExercise)]);
    setMetrics([]);
  };

  const handleSubmit = async () => {
    if (!session.date) {
      toast.error('Seleziona una data per la sessione.');
      return;
    }

    if (!session.type) {
      toast.error('Scegli il tipo di sessione.');
      return;
    }

    const hasNamedExercise = exercises.some(exercise => exercise.name.trim().length > 0);
    if (!hasNamedExercise) {
      toast.error('Inserisci almeno un esercizio con un nome.');
      return;
    }

    setSaving(true);

    try {
      const { data: insertedSession, error: sessionError } = await supabase
        .from('training_sessions')
        .insert({
          block_id: session.block_id || null,
          date: session.date,
          type: session.type,
          phase: session.phase || null,
          location: session.location,
          notes: session.notes || null,
        })
        .select('id')
        .single();

      if (sessionError || !insertedSession) {
        throw sessionError ?? new Error('Errore di salvataggio sessione');
      }

      const exercisesToInsert = exercises
        .filter(exercise => exercise.name.trim().length > 0)
        .map(exercise => ({
          payload: {
            session_id: insertedSession.id,
            name: exercise.name,
            discipline_type: exercise.discipline_type,
            distance_m: exercise.distance_m ? Number(exercise.distance_m) : null,
            sets: exercise.sets ? Number(exercise.sets) : null,
            repetitions: exercise.repetitions ? Number(exercise.repetitions) : null,
            rest_between_reps_s: exercise.rest_between_reps_s ? Number(exercise.rest_between_reps_s) : null,
            rest_between_sets_s: exercise.rest_between_sets_s ? Number(exercise.rest_between_sets_s) : null,
            rest_after_exercise_s: exercise.rest_after_exercise_s ? Number(exercise.rest_after_exercise_s) : null,
            intensity: exercise.intensity ? Number(exercise.intensity) : null,
            notes: exercise.notes || null,
          },
          results: exercise.results,
        }));

      let insertedExercises: { id: string }[] = [];

      if (exercisesToInsert.length > 0) {
        const { data, error: exerciseError } = await supabase
          .from('exercises')
          .insert(exercisesToInsert.map(item => item.payload))
          .select('id');

        if (exerciseError) {
          throw exerciseError;
        }

        insertedExercises = data ?? [];
      }

      if (insertedExercises.length > 0) {
        const resultsPayload: Record<string, unknown>[] = [];

        insertedExercises.forEach((exerciseRow, index) => {
          const template = exercisesToInsert[index];

          template.results
            .filter(result =>
              result.time_s || result.weight_kg || result.rpe || result.notes || result.repetition_number
            )
            .forEach(result => {
              resultsPayload.push({
                exercise_id: exerciseRow.id,
                attempt_number: result.attempt_number ? Number(result.attempt_number) : 1,
                repetition_number: result.repetition_number ? Number(result.repetition_number) : null,
                time_s: result.time_s ? Number(result.time_s) : null,
                weight_kg: result.weight_kg ? Number(result.weight_kg) : null,
                rpe: result.rpe ? Number(result.rpe) : null,
                notes: result.notes || null,
              });
            });
        });

        if (resultsPayload.length > 0) {
          const { error: resultsError } = await supabase.from('exercise_results').insert(resultsPayload);
          if (resultsError) {
            throw resultsError;
          }
        }
      }

      if (metrics.length > 0) {
        const metricsPayload = metrics
          .filter(metric => metric.metric_name.trim().length > 0)
          .map(metric => ({
            session_id: insertedSession.id,
            date: metric.date || session.date,
            metric_name: metric.metric_name,
            category: metric.category,
            metric_target: metric.metric_target || null,
            value: metric.value ? Number(metric.value) : null,
            unit: metric.unit || null,
            notes: metric.notes || null,
          }));

        if (metricsPayload.length > 0) {
          const { error: metricsError } = await supabase.from('metrics').insert(metricsPayload);
          if (metricsError) {
            throw metricsError;
          }
        }
      }

      toast.success('Sessione registrata con successo!');
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Impossibile salvare la sessione. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Registra allenamento</h1>
        <p className="text-sm text-slate-500">
          Compila le informazioni con tocchi rapidi: scegli il tipo di sessione, aggiungi gli esercizi, e collega
          metriche e test utili.
        </p>
      </header>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-slate-800">
            <Calendar className="h-4 w-4 text-sky-600" />
            Dati principali
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-slate-500">Data</Label>
              <Input
                type="date"
                value={session.date}
                onChange={event => handleSessionChange('date', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-slate-500">Blocchi disponibili</Label>
              <div className="flex flex-wrap gap-2">
                {blocks.length === 0 && <p className="text-sm text-slate-500">Nessun blocco presente.</p>}
                {blocks.map(block => (
                  <Button
                    key={block.id}
                    type="button"
                    variant={session.block_id === block.id ? 'default' : 'outline'}
                    className={cn(
                      'rounded-full border-slate-200 text-sm',
                      session.block_id === block.id ? 'bg-sky-600 hover:bg-sky-700' : 'bg-white'
                    )}
                    onClick={() => handleSessionChange('block_id', block.id)}
                  >
                    {block.name}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="border-none bg-transparent text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => handleSessionChange('block_id', '')}
                >
                  Nessun blocco
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-slate-500">Tipo di sessione</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {sessionTypeOptions.map(option => (
                  <ChipButton
                    key={option.value}
                    label={option.label}
                    icon={option.icon}
                    description={option.description}
                    active={session.type === option.value}
                    onClick={() => handleSessionChange('type', option.value)}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-slate-500">Luogo</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {locationOptions.map(option => (
                  <ChipButton
                    key={option.value}
                    label={option.label}
                    icon={option.icon}
                    active={session.location === option.value}
                    onClick={() => handleSessionChange('location', option.value)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-slate-500">Fase (opzionale)</Label>
              <Input
                placeholder="Accumulo, intensificazione, tapering..."
                value={session.phase}
                onChange={event => handleSessionChange('phase', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-slate-500">Note generali</Label>
              <Textarea
                rows={3}
                placeholder="Sensazioni, obiettivi, condizioni meteo..."
                value={session.notes}
                onChange={event => handleSessionChange('notes', event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Esercizi e risultati</h2>
            <p className="text-sm text-slate-500">
              Organizza gli esercizi per blocchi: puoi duplicarli, riordinarli e aggiungere risultati con un tap.
            </p>
          </div>
          <Button variant="outline" onClick={addExercise} className="gap-2 rounded-full">
            <Plus className="h-4 w-4" /> Nuovo blocco
          </Button>
        </header>

        <div className="space-y-6">
          {exercises.map((exercise, index) => (
            <Card key={index} className="border border-slate-200/70 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-slate-500">Nome esercizio</Label>
                  <Input
                    placeholder="Es. Sprint 120m, Squat..."
                    value={exercise.name}
                    onChange={event => handleExerciseChange(index, 'name', event.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 rounded-full border-slate-200 p-0"
                    onClick={() => duplicateExercise(index)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 rounded-full border-slate-200 text-rose-600 hover:border-rose-200 hover:bg-rose-50 p-0"
                    onClick={() => removeExercise(index)}
                    disabled={exercises.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs uppercase text-slate-500">Disciplina</Label>
                  <div className="grid gap-2 md:grid-cols-5">
                    {disciplineOptions.map(option => (
                      <ChipButton
                        key={option.value}
                        label={option.label}
                        icon={option.icon}
                        active={exercise.discipline_type === option.value}
                        onClick={() => handleExerciseChange(index, 'discipline_type', option.value)}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500">Distanza (m)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={exercise.distance_m}
                      onChange={event => handleExerciseChange(index, 'distance_m', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500">Serie</Label>
                    <Input
                      type="number"
                      min="1"
                      value={exercise.sets}
                      onChange={event => handleExerciseChange(index, 'sets', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500">Ripetizioni</Label>
                    <Input
                      type="number"
                      min="1"
                      value={exercise.repetitions}
                      onChange={event => handleExerciseChange(index, 'repetitions', event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500">Recupero tra ripetizioni (s)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={exercise.rest_between_reps_s}
                      onChange={event => handleExerciseChange(index, 'rest_between_reps_s', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500">Recupero tra serie (s)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={exercise.rest_between_sets_s}
                      onChange={event => handleExerciseChange(index, 'rest_between_sets_s', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500">Recupero finale (s)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={exercise.rest_after_exercise_s}
                      onChange={event => handleExerciseChange(index, 'rest_after_exercise_s', event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500">Intensità (0-10)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={exercise.intensity}
                      onChange={event => handleExerciseChange(index, 'intensity', event.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs uppercase text-slate-500">Note esercizio</Label>
                    <Textarea
                      rows={3}
                      placeholder="Focus tecnico, sensazioni..."
                      value={exercise.notes}
                      onChange={event => handleExerciseChange(index, 'notes', event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">Risultati registrati</h3>
                    <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => addResult(index)}>
                      <Plus className="h-4 w-4" /> Aggiungi risultato
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {exercise.results.map((result, resultIndex) => (
                      <div
                        key={resultIndex}
                        className="grid gap-3 rounded-xl border border-slate-200/80 p-3 md:grid-cols-6"
                      >
                        <div className="space-y-1">
                          <Label className="text-[11px] uppercase text-slate-500">Tentativo</Label>
                          <Input
                            type="number"
                            min="1"
                            value={result.attempt_number}
                            onChange={event =>
                              handleResultChange(index, resultIndex, 'attempt_number', event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] uppercase text-slate-500">Ripetizione</Label>
                          <Input
                            type="number"
                            min="1"
                            value={result.repetition_number}
                            onChange={event =>
                              handleResultChange(index, resultIndex, 'repetition_number', event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] uppercase text-slate-500">Tempo (s)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={result.time_s}
                            onChange={event => handleResultChange(index, resultIndex, 'time_s', event.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] uppercase text-slate-500">Carico (kg)</Label>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            value={result.weight_kg}
                            onChange={event => handleResultChange(index, resultIndex, 'weight_kg', event.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] uppercase text-slate-500">RPE</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={result.rpe}
                            onChange={event => handleResultChange(index, resultIndex, 'rpe', event.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] uppercase text-slate-500">Note</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={result.notes}
                              onChange={event => handleResultChange(index, resultIndex, 'notes', event.target.value)}
                              placeholder="Condizioni, feedback..."
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 w-9 rounded-full border-slate-200 text-rose-600 hover:border-rose-200 hover:bg-rose-50 p-0"
                              onClick={() => removeResult(index, resultIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-slate-800">
            <Target className="h-4 w-4 text-sky-600" /> Metriche e test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Collega rapidamente pesi, tempi o test specifici alla sessione. Usa le categorie per raggruppare le
            misurazioni e avere una panoramica chiara.
          </p>

          <div className="space-y-4">
            {metrics.map((metric, index) => (
              <div key={index} className="rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {metricCategoryOptions.map(option => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={metric.category === option.value ? 'default' : 'outline'}
                        className={cn(
                          'gap-2 rounded-full border-slate-200 text-sm',
                          metric.category === option.value
                            ? 'bg-sky-600 hover:bg-sky-700'
                            : 'bg-white text-slate-600'
                        )}
                        onClick={() => handleMetricChange(index, 'category', option.value)}
                      >
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full border-slate-200 text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                    onClick={() => removeMetric(index)}
                  >
                    <Trash2 className="h-4 w-4" /> Rimuovi
                  </Button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500">Data</Label>
                    <Input
                      type="date"
                      value={metric.date}
                      onChange={event => handleMetricChange(index, 'date', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500">Nome metrica</Label>
                    <Input
                      placeholder="Peso corporeo, Test 60m..."
                      value={metric.metric_name}
                      onChange={event => handleMetricChange(index, 'metric_name', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500">Target (opzionale)</Label>
                    <Input
                      placeholder="es. 100m, Salto verticale..."
                      value={metric.metric_target}
                      onChange={event => handleMetricChange(index, 'metric_target', event.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500">Valore</Label>
                    <Input
                      type="number"
                      value={metric.value}
                      onChange={event => handleMetricChange(index, 'value', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-slate-500">Unità</Label>
                    <Input
                      placeholder="kg, s, cm..."
                      value={metric.unit}
                      onChange={event => handleMetricChange(index, 'unit', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label className="text-xs uppercase text-slate-500">Note</Label>
                    <Textarea
                      rows={2}
                      value={metric.notes}
                      onChange={event => handleMetricChange(index, 'notes', event.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" className="gap-2 rounded-full" onClick={addMetric}>
              <Plus className="h-4 w-4" /> Aggiungi metrica o test
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-slate-900 text-white">
        <CardHeader>
          <CardTitle className="text-base">Riepilogo rapido</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-300">Esercizi totali</p>
            <p className="text-2xl font-semibold">{recordedSummary.totalExercises}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Risultati registrati</p>
            <p className="text-2xl font-semibold">{recordedSummary.totalResults}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Discipline coinvolte</p>
            <p className="text-2xl font-semibold">{recordedSummary.involvedDisciplines.length}</p>
            <p className="mt-1 text-xs text-slate-400">
              {recordedSummary.involvedDisciplines.map(item => item.toUpperCase()).join(' · ') || '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      <footer className="flex items-center justify-end gap-3 pb-10">
        <Button
          type="button"
          variant="outline"
          className="border-none bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          onClick={resetForm}
          disabled={saving}
        >
          Annulla
        </Button>
        <Button
          type="button"
          className="gap-2 rounded-full bg-sky-600 px-6 text-white hover:bg-sky-700"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Salva sessione
        </Button>
      </footer>
    </div>
  );
}
