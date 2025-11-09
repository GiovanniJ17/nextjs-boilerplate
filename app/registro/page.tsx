'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Activity,
  Calendar,
  Database,
  Dumbbell,
  Flame,
  Info,
  Loader2,
  MapPin,
  PlusCircle,
  Repeat,
  Ruler,
  StickyNote,
  Table as TableIcon,
  Tag,
  Timer,
  Trash2,
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
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Registro Allenamenti
        </span>
        <h1 className="text-3xl font-semibold text-slate-900 flex items-center gap-3">
          <Activity className="h-7 w-7 text-blue-500" /> Inserimento dati strutturato
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Compila i campi facendo riferimento ai nomi delle tabelle del database. Ogni
          colonna è allineata per replicare la struttura di <code>training_sessions</code> e
          <code>exercises</code>.
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/60">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Database className="h-5 w-5 text-blue-500" /> training_sessions
          </CardTitle>
          <p className="text-xs text-slate-500">
            Inserisci le informazioni generali sulla sessione. I campi obbligatori sono
            evidenziati.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden rounded-b-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Colonna database</th>
                  <th className="px-4 py-3 text-left font-medium">Valore</th>
                  <th className="px-4 py-3 text-left font-medium">Descrizione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-4 align-top font-mono text-xs text-slate-500">
                    training_sessions.date
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <Input
                        type="date"
                        name="date"
                        value={form.date}
                        onChange={handleFormChange}
                        className={errors.date ? 'border-red-500 ring-2 ring-red-100' : ''}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-xs text-slate-500">
                    Data della sessione nel formato ISO.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 align-top font-mono text-xs text-slate-500">
                    training_sessions.type
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-slate-400" />
                      <select
                        name="type"
                        value={form.type}
                        onChange={handleFormChange}
                        className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                          errors.type ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-200'
                        }`}
                      >
                        <option value="">Seleziona tipo...</option>
                        <option value="test">Test</option>
                        <option value="palestra">Palestra</option>
                        <option value="velocità">Velocità</option>
                        <option value="resistenza">Resistenza</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-xs text-slate-500">
                    Categoria dell&apos;allenamento per filtri e statistiche.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 align-top font-mono text-xs text-slate-500">
                    training_sessions.location
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <select
                        name="location"
                        value={form.location}
                        onChange={handleFormChange}
                        className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                          errors.location
                            ? 'border-red-500 ring-2 ring-red-100'
                            : 'border-slate-200'
                        }`}
                      >
                        <option value="">Seleziona luogo...</option>
                        <option value="outdoor">Outdoor (pista/strada)</option>
                        <option value="indoor">Indoor (palestra indoor)</option>
                        <option value="palestra">Palestra (pesi)</option>
                        <option value="erba">Erba</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-xs text-slate-500">
                    Ambiente di svolgimento utile per le analisi successive.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 align-top font-mono text-xs text-slate-500">
                    training_sessions.notes
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-start gap-2">
                      <StickyNote className="mt-2 h-4 w-4 text-slate-400" />
                      <Textarea
                        name="notes"
                        value={form.notes}
                        onChange={handleFormChange}
                        placeholder="Sensazioni, variabili, obiettivi..."
                        className="min-h-[96px]"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-xs text-slate-500">
                    Annotazioni libere sulla sessione, verranno salvate come testo.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/60">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <TableIcon className="h-5 w-5 text-blue-500" /> exercises
          </CardTitle>
          <p className="text-xs text-slate-500">
            Riepiloga ogni esercizio come fosse una riga della tabella <code>exercises</code>.
            Tutte le colonne restano allineate, anche in palestra.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-left font-medium">#</th>
                  <th className="px-3 py-3 text-left font-medium">exercises.name</th>
                  <th className="px-3 py-3 text-left font-medium">exercises.distance_m</th>
                  <th className="px-3 py-3 text-left font-medium">exercises.sets</th>
                  <th className="px-3 py-3 text-left font-medium">exercises.repetitions</th>
                  <th className="px-3 py-3 text-left font-medium">exercises.rest_between_reps_s</th>
                  <th className="px-3 py-3 text-left font-medium">exercises.rest_between_sets_s</th>
                  <th className="px-3 py-3 text-left font-medium">exercises.intensity</th>
                  <th className="px-3 py-3 text-left font-medium">exercises.effort_type</th>
                  <th className="px-3 py-3 text-left font-medium">exercises.notes</th>
                  <th className="px-3 py-3 text-left font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {exercises.map((ex, i) => {
                  const intensityNum = ex.intensity ? Number(ex.intensity) : null;
                  const effortLabel = getIntensityLabel(intensityNum);

                  return (
                    <tr
                      key={i}
                      className={`bg-white transition hover:bg-slate-50 ${
                        isGym ? 'even:bg-amber-50/30' : 'even:bg-blue-50/30'
                      }`}
                    >
                      <td className="px-3 py-4 align-top text-xs font-semibold text-slate-500">
                        {i + 1}
                      </td>
                      <td className="px-3 py-4 align-top">
                        <Input
                          name="name"
                          value={ex.name}
                          onChange={e => handleExerciseChange(i, e)}
                          placeholder={isGym ? 'squat_back' : 'ripetute_150'}
                          className={`font-mono text-xs ${
                            errors[`name-${i}`] ? 'border-red-500 ring-2 ring-red-100' : ''
                          }`}
                        />
                      </td>
                      <td className="px-3 py-4 align-top">
                        <Input
                          name="distance_m"
                          type="number"
                          value={ex.distance_m}
                          onChange={e => handleExerciseChange(i, e)}
                          placeholder={isGym ? '—' : '150'}
                          disabled={isGym}
                          className={`text-xs ${
                            isGym
                              ? 'bg-slate-100 text-slate-400'
                              : 'font-mono'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-4 align-top">
                        <Input
                          name="sets"
                          type="number"
                          value={ex.sets}
                          onChange={e => handleExerciseChange(i, e)}
                          className={`text-xs font-mono ${
                            errors[`sets-${i}`] ? 'border-red-500 ring-2 ring-red-100' : ''
                          }`}
                        />
                      </td>
                      <td className="px-3 py-4 align-top">
                        <Input
                          name="repetitions"
                          type="number"
                          value={ex.repetitions}
                          onChange={e => handleExerciseChange(i, e)}
                          className={`text-xs font-mono ${
                            errors[`repetitions-${i}`]
                              ? 'border-red-500 ring-2 ring-red-100'
                              : ''
                          }`}
                        />
                      </td>
                      <td className="px-3 py-4 align-top">
                        <Input
                          name="rest_between_reps_s"
                          type="number"
                          value={ex.rest_between_reps_s}
                          onChange={e => handleExerciseChange(i, e)}
                          placeholder={isGym ? '60' : '120'}
                          className="text-xs font-mono"
                        />
                      </td>
                      <td className="px-3 py-4 align-top">
                        <Input
                          name="rest_between_sets_s"
                          type="number"
                          value={ex.rest_between_sets_s}
                          onChange={e => handleExerciseChange(i, e)}
                          placeholder={isGym ? '180' : '300'}
                          className="text-xs font-mono"
                        />
                      </td>
                      <td className="px-3 py-4 align-top">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Flame className="h-3 w-3 text-slate-400" />
                            <span>{ex.intensity || '–'}/10</span>
                          </div>
                          <input
                            type="range"
                            name="intensity"
                            min={1}
                            max={10}
                            value={ex.intensity}
                            onChange={e => handleExerciseChange(i, e)}
                            className="w-full"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                          <Info className="h-3 w-3 text-slate-400" />
                          <span>{effortLabel}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <Textarea
                          name="notes"
                          value={ex.notes}
                          onChange={e => handleExerciseChange(i, e)}
                          placeholder={
                            isGym
                              ? 'carico=80kg, focus tecnica'
                              : 'tempo 18\'\' netti, vento favorevole'
                          }
                          rows={2}
                          className="text-xs"
                        />
                      </td>
                      <td className="px-3 py-4 align-top">
                        {exercises.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExercise(i)}
                            className="rounded-md border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 className="mr-1 inline h-3 w-3" /> Rimuovi
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500">
              <Dumbbell className="h-4 w-4 text-blue-500" />
              <span>{exercises.length} esercizi in tabella</span>
            </div>
            <Button type="button" variant="outline" onClick={addExercise} className="gap-2">
              <PlusCircle size={16} /> Aggiungi riga esercizio
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button onClick={handleSubmit} disabled={loading} className="min-w-[220px] gap-2">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Salvataggio...
            </>
          ) : (
            'Salva allenamento nel database'
          )}
        </Button>
      </div>
    </div>
  );
}
