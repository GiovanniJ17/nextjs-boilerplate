'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  CalendarRange,
  CalendarSearch,
  Dumbbell,
  Flame,
  Info,
  Loader2,
  MapPin,
  NotebookPen,
  PlusCircle,
  Repeat,
  StickyNote,
  Target,
  Timer,
  Trash2,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabaseClient';

type EffortType = 'basso' | 'medio' | 'alto' | 'massimo';

type TrainingBlock = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  goal: string | null;
  notes: string | null;
};

interface ExerciseResultForm {
  attempt_number: string;
  time_s: string;
  weight_kg: string;
  rpe: string;
  notes: string;
  [key: string]: string;
}

interface ExerciseForm {
  name: string;
  distance_m: string;
  sets: string;
  repetitions: string;
  rest_between_reps_s: string;
  rest_between_sets_s: string;
  intensity: string;
  notes: string;
  results: ExerciseResultForm[];
  [key: string]: string | ExerciseResultForm[];
}

const sessionTypes = [
  { value: 'pista', label: 'Pista' },
  { value: 'palestra', label: 'Palestra' },
  { value: 'test', label: 'Test' },
  { value: 'scarico', label: 'Scarico' },
  { value: 'recupero', label: 'Recupero' },
  { value: 'altro', label: 'Altro' },
];

const locations = [
  { value: 'pista outdoor', label: 'Pista outdoor' },
  { value: 'pista indoor', label: 'Pista indoor' },
  { value: 'palestra pesi', label: 'Palestra pesi' },
  { value: 'strada', label: 'Strada' },
  { value: 'erba', label: 'Campo/erba' },
  { value: 'altro', label: 'Altro' },
];

function getEffortCode(intensity: number | null): EffortType | null {
  if (intensity == null || Number.isNaN(intensity)) return null;
  if (intensity <= 3) return 'basso';
  if (intensity <= 6) return 'medio';
  if (intensity <= 8) return 'alto';
  return 'massimo';
}

function getEffortLabel(code: EffortType | null): string {
  switch (code) {
    case 'basso':
      return 'Basso (recupero)';
    case 'medio':
      return 'Medio (costruzione)';
    case 'alto':
      return 'Alto (qualità)';
    case 'massimo':
      return 'Massimo (gara/test)';
    default:
      return 'Non impostato';
  }
}

function createDefaultResult(): ExerciseResultForm {
  return {
    attempt_number: '1',
    time_s: '',
    weight_kg: '',
    rpe: '',
    notes: '',
  };
}

function createDefaultExercise(): ExerciseForm {
  return {
    name: '',
    distance_m: '',
    sets: '',
    repetitions: '',
    rest_between_reps_s: '',
    rest_between_sets_s: '',
    intensity: '5',
    notes: '',
    results: [createDefaultResult()],
  };
}

export default function RegistroPage() {
  const [loading, setLoading] = useState(false);
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockForm, setBlockForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    goal: '',
    notes: '',
  });

  const [form, setForm] = useState({
    date: '',
    type: '',
    location: '',
    notes: '',
  });

  const [exercises, setExercises] = useState<ExerciseForm[]>([createDefaultExercise()]);
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});

  const isGymSession = form.type === 'palestra';

  useEffect(() => {
    const fetchBlocks = async () => {
      const { data, error } = await supabase
        .from('training_blocks')
        .select('id, name, start_date, end_date, goal, notes')
        .order('start_date', { ascending: false });

      if (error) {
        console.error(error);
        toast.error('Impossibile caricare i blocchi di allenamento');
        return;
      }

      setBlocks(data as TrainingBlock[]);
    };

    fetchBlocks();
  }, []);

  const summary = useMemo(() => {
    const totals = {
      exercises: 0,
      totalSets: 0,
      totalReps: 0,
      totalDistance: 0,
      avgIntensity: 0,
      efforts: {
        basso: 0,
        medio: 0,
        alto: 0,
        massimo: 0,
      } as Record<EffortType, number>,
    };

    const intensityValues: number[] = [];

    exercises.forEach((exercise) => {
      const name = exercise.name.trim();
      if (!name) return;

      totals.exercises += 1;

      const sets = exercise.sets ? Number(exercise.sets) : 0;
      const reps = exercise.repetitions ? Number(exercise.repetitions) : 0;
      const distance = exercise.distance_m ? Number(exercise.distance_m) : 0;
      const intensity = exercise.intensity ? Number(exercise.intensity) : null;

      if (!Number.isNaN(sets)) totals.totalSets += sets;
      if (!Number.isNaN(reps)) totals.totalReps += sets * reps;
      if (!Number.isNaN(distance)) totals.totalDistance += distance * Math.max(sets, 1) * Math.max(reps, 1);
      if (intensity != null && !Number.isNaN(intensity)) {
        intensityValues.push(intensity);
        const effortCode = getEffortCode(intensity);
        if (effortCode) {
          totals.efforts[effortCode] += 1;
        }
      }
    });

    totals.avgIntensity = intensityValues.length
      ? intensityValues.reduce((acc, val) => acc + val, 0) / intensityValues.length
      : 0;

    return totals;
  }, [exercises]);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleExerciseChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setExercises((prev) => {
      const next = [...prev];
      const updated = { ...next[index] } as ExerciseForm;

      if (name === 'intensity') {
        const num = Math.min(10, Math.max(1, Number(value) || 0));
        updated.intensity = String(num);
      } else {
        (updated as any)[name] = value;
      }

      next[index] = updated;
      return next;
    });
  };

  const handleResultChange = (
    exerciseIndex: number,
    resultIndex: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setExercises((prev) => {
      const next = [...prev];
      const updatedExercise = { ...next[exerciseIndex] } as ExerciseForm;
      const updatedResults = [...updatedExercise.results];
      const updatedResult = { ...updatedResults[resultIndex] };
      updatedResult[name] = value;
      updatedResults[resultIndex] = updatedResult;
      updatedExercise.results = updatedResults;
      next[exerciseIndex] = updatedExercise;
      return next;
    });
  };

  const addExercise = () => {
    setExercises((prev) => [...prev, createDefaultExercise()]);
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addResult = (exerciseIndex: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const updated = { ...next[exerciseIndex] } as ExerciseForm;
      updated.results = [...updated.results, createDefaultResult()];
      next[exerciseIndex] = updated;
      return next;
    });
  };

  const removeResult = (exerciseIndex: number, resultIndex: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const updated = { ...next[exerciseIndex] } as ExerciseForm;
      updated.results = updated.results.filter((_, idx) => idx !== resultIndex);
      if (updated.results.length === 0) {
        updated.results = [createDefaultResult()];
      }
      next[exerciseIndex] = updated;
      return next;
    });
  };

  const validate = () => {
    const newErrors: { [key: string]: boolean } = {};
    if (!form.date) newErrors.date = true;
    if (!form.type) newErrors.type = true;
    if (!form.location) newErrors.location = true;

    exercises.forEach((exercise, index) => {
      if (!exercise.name.trim()) newErrors[`name-${index}`] = true;
      if (!exercise.sets.trim()) newErrors[`sets-${index}`] = true;
      if (!exercise.repetitions.trim()) newErrors[`repetitions-${index}`] = true;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateBlock = async () => {
    if (!blockForm.name.trim() || !blockForm.start_date || !blockForm.end_date) {
      toast.error('Compila nome e date per creare un blocco');
      return;
    }

    setBlockLoading(true);
    try {
      const { data, error } = await supabase
        .from('training_blocks')
        .insert([
          {
            name: blockForm.name.trim(),
            start_date: blockForm.start_date,
            end_date: blockForm.end_date,
            goal: blockForm.goal || null,
            notes: blockForm.notes || null,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success('Blocco creato con successo');
      setBlocks((prev) => [data as TrainingBlock, ...prev]);
      setSelectedBlock(data.id);
      setShowBlockForm(false);
      setBlockForm({ name: '', start_date: '', end_date: '', goal: '', notes: '' });
    } catch (error) {
      console.error(error);
      toast.error('Errore durante la creazione del blocco');
    } finally {
      setBlockLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setLoading(true);

    try {
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .insert([
          {
            block_id: selectedBlock || null,
            date: form.date,
            type: form.type,
            location: form.location,
            notes: form.notes || null,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (sessionError) throw sessionError;

      for (const exercise of exercises) {
        if (!exercise.name.trim()) continue;

        const intensityNum = exercise.intensity ? Number(exercise.intensity) : null;
        const effortCode = getEffortCode(intensityNum);

        const { data: insertedExercise, error: exerciseError } = await supabase
          .from('exercises')
          .insert([
            {
              session_id: session.id,
              name: exercise.name.trim(),
              distance_m:
                isGymSession || !exercise.distance_m
                  ? null
                  : Number.isNaN(Number(exercise.distance_m))
                    ? null
                    : Number(exercise.distance_m),
              sets: exercise.sets ? Number(exercise.sets) : null,
              repetitions: exercise.repetitions ? Number(exercise.repetitions) : null,
              rest_between_reps_s: exercise.rest_between_reps_s
                ? Number(exercise.rest_between_reps_s)
                : null,
              rest_between_sets_s: exercise.rest_between_sets_s
                ? Number(exercise.rest_between_sets_s)
                : null,
              intensity: intensityNum,
              effort_type: effortCode,
              notes: exercise.notes || null,
              created_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (exerciseError) throw exerciseError;

        const validResults = exercise.results.filter((result) => {
          return (
            result.time_s.trim() !== '' ||
            result.weight_kg.trim() !== '' ||
            result.rpe.trim() !== '' ||
            result.notes.trim() !== ''
          );
        });

        if (insertedExercise && validResults.length > 0) {
          const resultsPayload = validResults.map((result, index) => ({
            exercise_id: insertedExercise.id,
            attempt_number: result.attempt_number ? Number(result.attempt_number) : index + 1,
            time_s: result.time_s ? Number(result.time_s) : null,
            weight_kg: result.weight_kg ? Number(result.weight_kg) : null,
            rpe: result.rpe ? Number(result.rpe) : null,
            notes: result.notes ? result.notes.trim() : null,
            created_at: new Date().toISOString(),
          }));

          const { error: resultsError } = await supabase
            .from('exercise_results')
            .insert(resultsPayload);

          if (resultsError) throw resultsError;
        }
      }

      toast.success('Allenamento registrato con successo!');
      setForm({ date: '', type: '', location: '', notes: '' });
      setSelectedBlock('');
      setExercises([createDefaultExercise()]);
      setErrors({});
    } catch (error) {
      console.error(error);
      toast.error("Errore durante il salvataggio dell'allenamento");
    } finally {
      setLoading(false);
    }
  };

  const selectedBlockData = selectedBlock
    ? blocks.find((block) => block.id === selectedBlock)
    : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-600">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Registra Allenamento</h1>
          <p className="text-sm text-slate-600">
            Salva rapidamente sessioni, lavori e risultati con la nuova struttura dati.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-slate-50/80">
            <CardTitle className="text-base font-semibold text-slate-900">
              Dettagli della sessione
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              Compila i dati principali e aggiungi gli esercizi svolti.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400" /> Data
                </Label>
                <Input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleFormChange}
                  className={errors.date ? 'border-red-500' : ''}
                />
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <CalendarRange className="h-4 w-4 text-slate-400" /> Blocco di allenamento
                </Label>
                <div className="flex items-center gap-2">
                  <select
                    name="block"
                    value={selectedBlock}
                    onChange={(e) => setSelectedBlock(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring focus:ring-sky-100"
                  >
                    <option value="">Nessun blocco</option>
                    {blocks.map((block) => (
                      <option key={block.id} value={block.id}>
                        {block.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowBlockForm((prev) => !prev)}
                    className="whitespace-nowrap"
                  >
                    {showBlockForm ? 'Annulla' : 'Nuovo'}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <Tag className="h-4 w-4 text-slate-400" /> Tipo sessione
                </Label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleFormChange}
                  className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring focus:ring-sky-100 ${errors.type ? 'border-red-500' : 'border-slate-200'}`}
                >
                  <option value="">Seleziona tipo…</option>
                  {sessionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400" /> Luogo
                </Label>
                <select
                  name="location"
                  value={form.location}
                  onChange={handleFormChange}
                  className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring focus:ring-sky-100 ${errors.location ? 'border-red-500' : 'border-slate-200'}`}
                >
                  <option value="">Seleziona luogo…</option>
                  {locations.map((location) => (
                    <option key={location.value} value={location.value}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <Label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <StickyNote className="h-4 w-4 text-slate-400" /> Note sessione
                </Label>
                <Textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  placeholder="Sensazioni, condizioni meteo, focus tecnico…"
                />
              </div>
            </div>

            {showBlockForm && (
              <Card className="border border-dashed border-sky-200 bg-sky-50/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-sky-700">
                    Nuovo blocco di allenamento
                  </CardTitle>
                  <CardDescription className="text-xs text-sky-600">
                    Definisci i blocchi stagionali per collegare le sessioni.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Nome blocco</Label>
                      <Input
                        name="name"
                        value={blockForm.name}
                        onChange={(e) => setBlockForm({ ...blockForm, name: e.target.value })}
                        placeholder="Es. Preparazione indoor"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Obiettivo</Label>
                      <Input
                        name="goal"
                        value={blockForm.goal}
                        onChange={(e) => setBlockForm({ ...blockForm, goal: e.target.value })}
                        placeholder="Es. Migliorare accelerazione"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Inizio</Label>
                      <Input
                        type="date"
                        name="start_date"
                        value={blockForm.start_date}
                        onChange={(e) => setBlockForm({ ...blockForm, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-slate-600">Fine</Label>
                      <Input
                        type="date"
                        name="end_date"
                        value={blockForm.end_date}
                        onChange={(e) => setBlockForm({ ...blockForm, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-600">Note</Label>
                    <Textarea
                      name="notes"
                      value={blockForm.notes}
                      onChange={(e) => setBlockForm({ ...blockForm, notes: e.target.value })}
                      placeholder="Macro obiettivi, focus tecnico, gare target…"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" onClick={handleCreateBlock} disabled={blockLoading}>
                      {blockLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creazione…
                        </>
                      ) : (
                        'Salva blocco'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-5">
              {exercises.map((exercise, index) => {
                const intensityNum = exercise.intensity ? Number(exercise.intensity) : null;
                const effortLabel = getEffortLabel(getEffortCode(intensityNum));

                return (
                  <Card key={index} className="border border-slate-100 shadow-none">
                    <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          {isGymSession ? (
                            <Dumbbell className="h-5 w-5 text-amber-500" />
                          ) : (
                            <NotebookPen className="h-5 w-5 text-sky-500" />
                          )}
                          {isGymSession ? 'Esercizio palestra' : 'Esercizio di pista'} #{index + 1}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500">
                          Mantieni i dati coerenti con la sessione selezionata.
                        </CardDescription>
                      </div>

                      {exercises.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => removeExercise(index)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Rimuovi
                        </Button>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-slate-600">Nome esercizio</Label>
                          <Input
                            name="name"
                            value={exercise.name}
                            onChange={(e) => handleExerciseChange(index, e)}
                            placeholder={
                              isGymSession ? 'Es. Squat, panca, split squat…' : 'Es. 3×150m, 6×60m, partenze…'
                            }
                            className={errors[`name-${index}`] ? 'border-red-500' : ''}
                          />
                        </div>

                        {!isGymSession && (
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-slate-600">Distanza (m)</Label>
                            <Input
                              name="distance_m"
                              type="number"
                              value={exercise.distance_m}
                              onChange={(e) => handleExerciseChange(index, e)}
                              placeholder="150"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-slate-600">Serie</Label>
                          <Input
                            name="sets"
                            type="number"
                            value={exercise.sets}
                            onChange={(e) => handleExerciseChange(index, e)}
                            className={errors[`sets-${index}`] ? 'border-red-500' : ''}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-slate-600">Ripetizioni</Label>
                          <Input
                            name="repetitions"
                            type="number"
                            value={exercise.repetitions}
                            onChange={(e) => handleExerciseChange(index, e)}
                            className={errors[`repetitions-${index}`] ? 'border-red-500' : ''}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-slate-600">
                            Recupero tra ripetizioni (s)
                          </Label>
                          <Input
                            name="rest_between_reps_s"
                            type="number"
                            value={exercise.rest_between_reps_s}
                            onChange={(e) => handleExerciseChange(index, e)}
                            placeholder={isGymSession ? '60' : '120'}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-slate-600">Recupero tra serie (s)</Label>
                          <Input
                            name="rest_between_sets_s"
                            type="number"
                            value={exercise.rest_between_sets_s}
                            onChange={(e) => handleExerciseChange(index, e)}
                            placeholder={isGymSession ? '180' : '300'}
                          />
                        </div>

                        <div className="space-y-2 lg:col-span-3">
                          <Label className="text-xs font-medium text-slate-600">Intensità &amp; sforzo</Label>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>1</span>
                                <span className="font-semibold text-slate-700">
                                  {exercise.intensity || '–'}/10
                                </span>
                                <span>10</span>
                              </div>
                              <input
                                type="range"
                                name="intensity"
                                min={1}
                                max={10}
                                value={exercise.intensity}
                                onChange={(e) => handleExerciseChange(index, e)}
                                className="mt-2 w-full"
                              />
                            </div>
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                              <Flame className="h-4 w-4 text-sky-500" />
                              <span>{effortLabel}</span>
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-3">
                          <Label className="text-xs font-medium text-slate-600">Note esercizio</Label>
                          <Textarea
                            name="notes"
                            value={exercise.notes}
                            onChange={(e) => handleExerciseChange(index, e)}
                            placeholder={
                              isGymSession
                                ? 'Carichi utilizzati, tempo sotto tensione, varianti…'
                                : 'Tempi di passaggio, vento, sensazioni tecniche…'
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Timer className="h-4 w-4 text-slate-500" /> Risultati &amp; tempi
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addResult(index)}
                            className="flex items-center gap-1"
                          >
                            <PlusCircle className="h-4 w-4" /> Tentativo
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {exercise.results.map((result, resultIndex) => (
                            <div
                              key={resultIndex}
                              className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm"
                            >
                              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                                <span>Tentativo #{resultIndex + 1}</span>
                                {exercise.results.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeResult(index, resultIndex)}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>

                              <div className="grid gap-3 md:grid-cols-4">
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-medium text-slate-600">Tentativo</Label>
                                  <Input
                                    name="attempt_number"
                                    type="number"
                                    value={result.attempt_number}
                                    onChange={(e) => handleResultChange(index, resultIndex, e)}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-medium text-slate-600">Tempo (s)</Label>
                                  <Input
                                    name="time_s"
                                    type="number"
                                    step="0.01"
                                    value={result.time_s}
                                    onChange={(e) => handleResultChange(index, resultIndex, e)}
                                    placeholder="es. 7.23"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-medium text-slate-600">Carico (kg)</Label>
                                  <Input
                                    name="weight_kg"
                                    type="number"
                                    step="0.5"
                                    value={result.weight_kg}
                                    onChange={(e) => handleResultChange(index, resultIndex, e)}
                                    placeholder="es. 80"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-medium text-slate-600">RPE</Label>
                                  <Input
                                    name="rpe"
                                    type="number"
                                    step="0.5"
                                    value={result.rpe}
                                    onChange={(e) => handleResultChange(index, resultIndex, e)}
                                    placeholder="es. 8"
                                  />
                                </div>
                              </div>
                              <div className="mt-2">
                                <Label className="text-[11px] font-medium text-slate-600">Note tentativo</Label>
                                <Textarea
                                  name="notes"
                                  value={result.notes}
                                  onChange={(e) => handleResultChange(index, resultIndex, e)}
                                  placeholder="Dettagli su esecuzione, appoggi, video…"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <div className="flex justify-start">
                <Button type="button" variant="outline" onClick={addExercise} className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" /> Aggiungi esercizio
                </Button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={handleSubmit} disabled={loading} className="px-6">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvataggio…
                  </>
                ) : (
                  'Salva allenamento'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Serie &amp; ripetizioni
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Panorama rapido sul volume inserito oggi.
                </CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addExercise}>
                <PlusCircle className="mr-1 h-4 w-4" /> Aggiungi
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-slate-500">Esercizi attivi</span>
                  <span className="font-semibold text-slate-900">{summary.exercises}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-slate-500">Serie totali</span>
                  <span className="font-semibold text-slate-900">{summary.totalSets}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-slate-500">Ripetizioni totali</span>
                  <span className="font-semibold text-slate-900">{summary.totalReps}</span>
                </div>
                {!isGymSession && (
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-slate-500">Distanza complessiva (m)</span>
                    <span className="font-semibold text-slate-900">{summary.totalDistance}</span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-slate-500">Intensità media</span>
                  <span className="font-semibold text-slate-900">
                    {summary.avgIntensity ? summary.avgIntensity.toFixed(1) : '—'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Distribuzione dello sforzo
                </p>
                {(['basso', 'medio', 'alto', 'massimo'] as EffortType[]).map((effort) => {
                  const count = summary.efforts[effort];
                  const total = Math.max(summary.exercises, 1);
                  const percentage = Math.round((count / total) * 100);
                  return (
                    <div key={effort} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{getEffortLabel(effort as EffortType)}</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-900">Blocco &amp; note</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Mantieni sempre collegata la sessione al contesto stagionale.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {selectedBlockData ? (
                <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-start gap-2 text-slate-700">
                    <Target className="mt-0.5 h-4 w-4 text-sky-500" />
                    <div>
                      <p className="font-semibold text-slate-900">{selectedBlockData.name}</p>
                      {selectedBlockData.goal && (
                        <p className="text-xs text-slate-600">Obiettivo: {selectedBlockData.goal}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CalendarSearch className="h-4 w-4" />
                    <span>
                      {selectedBlockData.start_date} → {selectedBlockData.end_date}
                    </span>
                  </div>
                  {selectedBlockData.notes && (
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <StickyNote className="mt-0.5 h-4 w-4" />
                      <p>{selectedBlockData.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Nessun blocco selezionato: collega le sessioni a un blocco per analisi avanzate.
                </p>
              )}
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">
                Suggerimento: registra sempre gli RPE e le note dei tentativi per popolare le nuove statistiche.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
