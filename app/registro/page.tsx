'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  FolderPlus,
  ListPlus,
  Loader2,
  MapPin,
  NotebookPen,
  PenSquare,
  PlusCircle,
  Ruler,
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

const sessionTypes = [
  { value: 'pista', label: 'Allenamento in pista' },
  { value: 'palestra', label: 'Palestra / forza' },
  { value: 'test', label: 'Test' },
  { value: 'scarico', label: 'Scarico attivo' },
  { value: 'recupero', label: 'Recupero' },
  { value: 'altro', label: 'Altro' },
];

const disciplineTypes = [
  { value: 'sprint', label: 'Sprint' },
  { value: 'forza', label: 'Forza' },
  { value: 'mobilità', label: 'Mobilità' },
  { value: 'tecnica', label: 'Tecnica' },
  { value: 'altro', label: 'Altro' },
];

const metricCategories = [
  { value: 'prestazione', label: 'Prestazione' },
  { value: 'fisico', label: 'Fisico' },
  { value: 'recupero', label: 'Recupero' },
  { value: 'test', label: 'Test' },
  { value: 'altro', label: 'Altro' },
];

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
  const [blockForm, setBlockForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    goal: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  function handleSessionChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setSessionForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
  }

  function removeMetric(index: number) {
    setMetrics(prev => prev.filter((_, i) => i !== index));
  }

  function validateForms() {
    const validation: Record<string, string> = {};

    if (!sessionForm.date) validation.date = 'Inserisci una data valida';
    if (!sessionForm.type) validation.type = 'Seleziona il tipo di sessione';
    if (!sessionForm.location) validation.location = 'Indica il luogo della sessione';

    exercises.forEach((ex, index) => {
      if (!ex.name.trim()) validation[`exercise-${index}-name`] = 'Nome obbligatorio';
      if (!ex.discipline_type) validation[`exercise-${index}-discipline`] = 'Seleziona la disciplina';
      if (!ex.sets) validation[`exercise-${index}-sets`] = 'Inserisci le serie';
      if (!ex.repetitions) validation[`exercise-${index}-repetitions`] = 'Inserisci le ripetizioni';
    });

    metrics.forEach((metric, index) => {
      if (metric.metric_name && !metric.value) {
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

      for (const metric of metrics) {
        if (!metric.metric_name.trim()) continue;

        const { error: metricError } = await supabase.from('metrics').insert([
          {
            date: metric.date || sessionForm.date,
            metric_name: metric.metric_name,
            category: metric.category || null,
            metric_target: metric.metric_target || null,
            value: metric.value ? Number(metric.value) : null,
            unit: metric.unit || null,
            session_id: session.id,
            notes: metric.notes || null,
          },
        ]);

        if (metricError) {
          throw metricError;
        }
      }

      toast.success('Allenamento registrato con successo');
      setSessionForm(defaultSession);
      setExercises([{ ...defaultExercise, results: [{ ...defaultExerciseResult }] }]);
      setMetrics([]);
      setErrors({});
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
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur">
              <Activity className="h-4 w-4" />
              Registro Allenamento
            </div>
            <h1 className="text-3xl font-semibold">Crea la tua sessione personalizzata</h1>
            <p className="max-w-xl text-sm text-white/80">
              Salva allenamenti, esercizi, risultati e metriche in un unico flusso. Collegali a un blocco di
              allenamento per mantenere la tua programmazione sempre organizzata.
            </p>
            {selectedBlock ? (
              <div className="inline-flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <div>
                  <p className="font-semibold">Blocco selezionato: {selectedBlock.name}</p>
                  <p className="text-xs text-white/70">
                    {formatDateHuman(selectedBlock.start_date)} → {formatDateHuman(selectedBlock.end_date)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm">
                <FolderPlus className="h-4 w-4" />
                Associa la sessione a un blocco per monitorare l’avanzamento
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-center rounded-3xl bg-white/10 px-5 py-6 text-center text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">Volume stimato</p>
              <p className="text-4xl font-semibold">
                {volumePreview > 0 ? volumePreview.toLocaleString('it-IT') : '—'}
              </p>
              <p className="text-xs text-white/60">metri totali registrati</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6">
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
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    name="block_id"
                    value={sessionForm.block_id}
                    onChange={handleSessionChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-400 focus:bg-white focus:outline-none"
                  >
                    <option value="">Nessun blocco</option>
                    {trainingBlocks.map(block => (
                      <option key={block.id} value={block.id}>
                        {block.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowBlockForm(prev => !prev)}
                    className="gap-2 rounded-xl border-slate-200"
                  >
                    <PenSquare className="h-4 w-4" />
                    {showBlockForm ? 'Chiudi' : 'Nuovo blocco'}
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
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Tipo di sessione</Label>
                <select
                  name="type"
                  value={sessionForm.type}
                  onChange={handleSessionChange}
                  className={cn(
                    'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-400 focus:bg-white',
                    errors.type && 'border-red-500'
                  )}
                >
                  <option value="">Seleziona il tipo...</option>
                  {sessionTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
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

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-600">Luogo</Label>
                <Input
                  name="location"
                  value={sessionForm.location}
                  onChange={handleSessionChange}
                  placeholder="Pista indoor, palasport, stadio..."
                  className={cn(errors.location && 'border-red-500')}
                />
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

        <Card className="border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
              <ListPlus className="h-5 w-5 text-sky-600" /> Esercizi e risultati
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {exercises.map((exercise, index) => {
              const intensityNumber = Number(exercise.intensity) || null;
              const effortType = mapIntensityToEffort(intensityNumber);

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
                      <select
                        name="discipline_type"
                        value={exercise.discipline_type}
                        onChange={event => handleExerciseChange(index, event)}
                        className={cn(
                          'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-400 focus:bg-white',
                          errors[`exercise-${index}-discipline`] && 'border-red-500'
                        )}
                      >
                        {disciplineTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Weight className="h-4 w-4 text-slate-500" /> Risultati registrati
                      </div>
                      <button
                        type="button"
                        onClick={() => addResult(index)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                      >
                        <PlusCircle className="h-3 w-3" /> Aggiungi risultato
                      </button>
                    </div>

                    <div className="mt-3 space-y-3">
                      {exercise.results.map((result, resultIndex) => (
                        <div
                          key={resultIndex}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="font-semibold text-slate-700">Tentativo #{resultIndex + 1}</span>
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
                      ))}
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

        <Card className="border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
              <Target className="h-5 w-5 text-sky-600" /> Metriche e test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
                <p>Collega metriche come peso, tempi test o dati di recupero alla sessione.</p>
                <Button
                  type="button"
                  onClick={addMetric}
                  variant="outline"
                  className="mt-3 gap-2 rounded-full border-slate-300"
                >
                  <PlusCircle className="h-4 w-4" /> Aggiungi metrica
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {metrics.map((metric, index) => (
                  <div key={index} className="rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Activity className="h-4 w-4 text-slate-500" /> Metrica #{index + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMetric(index)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" /> Rimuovi
                      </button>
                    </div>

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
                        <select
                          name="category"
                          value={metric.category}
                          onChange={event => updateMetric(index, event)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-400 focus:bg-white"
                        >
                          {metricCategories.map(category => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
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
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addMetric}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-dashed border-slate-300 py-3 text-slate-600 hover:border-sky-300 hover:bg-sky-50"
                >
                  <PlusCircle className="h-4 w-4" /> Aggiungi un’altra metrica
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
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
