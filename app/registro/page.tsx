'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Loader2,
  PlusCircle,
  Trash2,
  Calendar,
  MapPin,
  Tag,
  StickyNote,
  Ruler,
  Repeat,
  Timer,
  Activity,
  Info,
  Dumbbell,
  Flame,
} from 'lucide-react';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ExerciseForm {
  name: string;
  distance_m: string;
  sets: string;
  repetitions: string;
  rest_between_reps_s: string;
  rest_between_sets_s: string;
  intensity: string; // 1–10
  notes: string;
  [key: string]: string; // per gestire l'update dinamico via name
}

const defaultExercise: ExerciseForm = {
  name: '',
  distance_m: '',
  sets: '',
  repetitions: '',
  rest_between_reps_s: '',
  rest_between_sets_s: '',
  intensity: '5',
  notes: '',
};

function getEffortType(intensity: number | null): string | null {
  if (intensity == null || Number.isNaN(intensity)) return null;
  if (intensity <= 3) return 'Molto leggero';
  if (intensity <= 5) return 'Leggero';
  if (intensity <= 7) return 'Medio';
  if (intensity <= 8) return 'Alto';
  return 'Massimo';
}

function getIntensityLabel(intensity: number | null): string {
  return getEffortType(intensity) ?? 'Non impostato';
}

export default function RegistroPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: '',
    type: '',
    location: '',
    notes: '',
  });

  const [exercises, setExercises] = useState<ExerciseForm[]>([defaultExercise]);
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});

  const isGym = form.location === 'palestra';

  // Gestione campi form principali
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Gestione campi esercizi
  const handleExerciseChange = (
    i: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setExercises(prev => {
      const next = [...prev];
      const ex = { ...next[i] };
      ex[name] = value;

      // se cambia l'intensità, non salviamo effort_type nello stato,
      // ma lo calcoliamo a runtime; qui potremmo solo normalizzare il valore
      if (name === 'intensity') {
        const num = Math.min(10, Math.max(1, Number(value) || 0));
        ex.intensity = String(num);
      }

      next[i] = ex;
      return next;
    });
  };

  // Aggiungi esercizio
  const addExercise = () => {
    setExercises(prev => [...prev, { ...defaultExercise }]);
  };

  // Rimuovi esercizio
  const removeExercise = (i: number) => {
    setExercises(prev => prev.filter((_, idx) => idx !== i));
  };

  // Validazione base
  const validate = () => {
    const newErrors: { [key: string]: boolean } = {};
    if (!form.date) newErrors.date = true;
    if (!form.type) newErrors.type = true;
    if (!form.location) newErrors.location = true;

    exercises.forEach((ex, i) => {
      if (!ex.name.trim()) newErrors[`name-${i}`] = true;
      if (!ex.sets.trim()) newErrors[`sets-${i}`] = true;
      if (!ex.repetitions.trim()) newErrors[`repetitions-${i}`] = true;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Salvataggio su Supabase
  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Inserisci sessione
      const { data: session, error: sessionErr } = await supabase
        .from('training_sessions')
        .insert([
          {
            date: form.date,
            type: form.type,
            location: form.location,
            notes: form.notes,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (sessionErr) throw sessionErr;

      // 2️⃣ Inserisci esercizi
      for (const ex of exercises) {
        if (!ex.name.trim()) continue;

        const intensityNum = ex.intensity ? parseFloat(ex.intensity) : null;
        const effortType = getEffortType(intensityNum);

        const { error: exErr } = await supabase.from('exercises').insert([
          {
            session_id: session.id,
            name: ex.name,
            distance_m: isGym
              ? null
              : ex.distance_m
              ? parseInt(ex.distance_m)
              : null,
            sets: ex.sets ? parseInt(ex.sets) : null,
            repetitions: ex.repetitions ? parseInt(ex.repetitions) : null,
            rest_between_reps_s: ex.rest_between_reps_s
              ? parseInt(ex.rest_between_reps_s)
              : null,
            rest_between_sets_s: ex.rest_between_sets_s
              ? parseInt(ex.rest_between_sets_s)
              : null,
            intensity: intensityNum,
            effort_type: effortType,
            notes: ex.notes,
            created_at: new Date().toISOString(),
          },
        ]);
        if (exErr) throw exErr;
      }

      toast.success('Allenamento registrato con successo!');
      setForm({ date: '', type: '', location: '', notes: '' });
      setExercises([{ ...defaultExercise }]);
      setErrors({});
    } catch (err) {
      console.error(err);
      toast.error('Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <Activity className="h-6 w-6 text-blue-500" />
        Registra Allenamento
      </h1>

      <Card className="shadow-sm">
        <CardContent className="space-y-6 p-6">
          {/* --- Info base --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-sm font-medium text-slate-700">
                <Calendar className="h-4 w-4 text-slate-400" />
                Data
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
              <Label className="flex items-center gap-1 text-sm font-medium text-slate-700">
                <Tag className="h-4 w-4 text-slate-400" />
                Tipo allenamento
              </Label>
              <select
                name="type"
                value={form.type}
                onChange={handleFormChange}
                className={`w-full border rounded-md px-3 py-2 text-sm bg-white ${
                  errors.type ? 'border-red-500' : ''
                }`}
              >
                <option value="">Seleziona tipo...</option>
                <option value="test">Test</option>
                <option value="palestra">Palestra</option>
                <option value="velocità">Velocità</option>
                <option value="resistenza">Resistenza</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-sm font-medium text-slate-700">
                <MapPin className="h-4 w-4 text-slate-400" />
                Luogo
              </Label>
              <select
                name="location"
                value={form.location}
                onChange={handleFormChange}
                className={`w-full border rounded-md px-3 py-2 text-sm bg-white ${
                  errors.location ? 'border-red-500' : ''
                }`}
              >
                <option value="">Seleziona luogo...</option>
                <option value="outdoor">Outdoor (pista/strada)</option>
                <option value="indoor">Indoor (palestra indoor)</option>
                <option value="palestra">Palestra (pesi)</option>
                <option value="erba">Erba</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1 text-sm font-medium text-slate-700">
              <StickyNote className="h-4 w-4 text-slate-400" />
              Note sessione
            </Label>
            <Textarea
              name="notes"
              value={form.notes}
              onChange={handleFormChange}
              placeholder="Sensazioni, variabili, obiettivi..."
            />
          </div>

          {/* --- Esercizi --- */}
          <div className="space-y-4">
            {exercises.map((ex, i) => {
              const intensityNum = ex.intensity ? Number(ex.intensity) : null;
              const effortLabel = getIntensityLabel(intensityNum);

              return (
                <Card
                  key={i}
                  className={`border ${
                    isGym ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'
                  }`}
                >
                  <CardHeader className="flex justify-between items-center pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      {isGym ? (
                        <Dumbbell className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Ruler className="h-4 w-4 text-blue-500" />
                      )}
                      {isGym ? 'Esercizio palestra' : 'Esercizio di corsa'} #{i + 1}
                    </CardTitle>
                    {exercises.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExercise(i)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </CardHeader>

                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs font-medium text-slate-700">
                        <Tag className="h-3 w-3 text-slate-400" />
                        Nome esercizio
                      </Label>
                      <Input
                        name="name"
                        value={ex.name}
                        onChange={e => handleExerciseChange(i, e)}
                        placeholder={isGym ? 'Es. squat, panca...' : 'Es. 3 x 150m, 6 x 60m...'}
                        className={errors[`name-${i}`] ? 'border-red-500' : ''}
                      />
                    </div>

                    {!isGym && (
                      <div className="space-y-1">
                        <Label className="flex items-center gap-1 text-xs font-medium text-slate-700">
                          <Ruler className="h-3 w-3 text-slate-400" />
                          Distanza (m)
                        </Label>
                        <Input
                          name="distance_m"
                          type="number"
                          value={ex.distance_m}
                          onChange={e => handleExerciseChange(i, e)}
                          placeholder="150"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs font-medium text-slate-700">
                        <Repeat className="h-3 w-3 text-slate-400" />
                        Serie
                      </Label>
                      <Input
                        name="sets"
                        type="number"
                        value={ex.sets}
                        onChange={e => handleExerciseChange(i, e)}
                        className={errors[`sets-${i}`] ? 'border-red-500' : ''}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs font-medium text-slate-700">
                        <Repeat className="h-3 w-3 text-slate-400" />
                        Ripetizioni per serie
                      </Label>
                      <Input
                        name="repetitions"
                        type="number"
                        value={ex.repetitions}
                        onChange={e => handleExerciseChange(i, e)}
                        className={errors[`repetitions-${i}`] ? 'border-red-500' : ''}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs font-medium text-slate-700">
                        <Timer className="h-3 w-3 text-slate-400" />
                        Recupero tra ripetizioni (s)
                      </Label>
                      <Input
                        name="rest_between_reps_s"
                        type="number"
                        value={ex.rest_between_reps_s}
                        onChange={e => handleExerciseChange(i, e)}
                        placeholder={isGym ? 'es. 60' : 'es. 120'}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs font-medium text-slate-700">
                        <Timer className="h-3 w-3 text-slate-400" />
                        Recupero tra serie (s)
                      </Label>
                      <Input
                        name="rest_between_sets_s"
                        type="number"
                        value={ex.rest_between_sets_s}
                        onChange={e => handleExerciseChange(i, e)}
                        placeholder={isGym ? 'es. 180' : 'es. 300'}
                      />
                    </div>

                    {/* Intensità + tipo sforzo auto */}
                    <div className="space-y-1 md:col-span-1">
                      <Label className="flex items-center gap-1 text-xs font-medium text-slate-700">
                        <Flame className="h-3 w-3 text-slate-400" />
                        Intensità (1–10)
                      </Label>
                      <div className="space-y-1">
                        <input
                          type="range"
                          name="intensity"
                          min={1}
                          max={10}
                          value={ex.intensity}
                          onChange={e => handleExerciseChange(i, e)}
                          className="w-full"
                        />
                        <div className="text-xs flex items-center justify-between text-slate-600">
                          <span>1</span>
                          <span className="font-semibold">
                            {ex.intensity || '–'}/10
                          </span>
                          <span>10</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs font-medium text-slate-700">
                        <Activity className="h-3 w-3 text-slate-400" />
                        Tipo sforzo (auto)
                      </Label>
                      <div className="px-3 py-2 rounded-md border bg-white text-xs flex items-center gap-1">
                        <Info className="h-3 w-3 text-slate-400" />
                        <span>{effortLabel}</span>
                      </div>
                    </div>

                    <div className="space-y-1 md:col-span-3">
                      <Label className="flex items-center gap-1 text-xs font-medium text-slate-700">
                        <StickyNote className="h-3 w-3 text-slate-400" />
                        Note esercizio
                      </Label>
                      <Textarea
                        name="notes"
                        value={ex.notes}
                        onChange={e => handleExerciseChange(i, e)}
                        placeholder={
                          isGym
                            ? 'Dettagli su carichi, sensazioni, esecuzione...'
                            : 'Dettagli su tempi, vento, sensazioni...'
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={addExercise}
              className="flex items-center gap-2"
            >
              <PlusCircle size={16} /> Aggiungi esercizio
            </Button>
          </div>

          {/* --- Salva --- */}
          <div className="pt-4 flex justify-end">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" /> Salvataggio...
                </>
              ) : (
                'Salva Allenamento'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
