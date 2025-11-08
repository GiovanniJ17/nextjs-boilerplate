'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';

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
  intensity: string;
  effort_type: string;
  notes: string;
}

export default function RegistroPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: '',
    type: '',
    location: '',
    notes: '',
  });

  const [exercises, setExercises] = useState<ExerciseForm[]>([
    {
      name: '',
      distance_m: '',
      sets: '',
      repetitions: '',
      rest_between_reps_s: '',
      rest_between_sets_s: '',
      intensity: '',
      effort_type: '',
      notes: '',
    },
  ]);

  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});

  // Gestione campi form principali
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Gestione campi esercizi
  const handleExerciseChange = (
    i: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const newEx = [...exercises];
    (newEx[i] as any)[name as keyof ExerciseForm] = value;
    setExercises(newEx);
  };

  // Aggiungi esercizio
  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        name: '',
        distance_m: '',
        sets: '',
        repetitions: '',
        rest_between_reps_s: '',
        rest_between_sets_s: '',
        intensity: '',
        effort_type: '',
        notes: '',
      },
    ]);
  };

  // Rimuovi esercizio
  const removeExercise = (i: number) => {
    const arr = [...exercises];
    arr.splice(i, 1);
    setExercises(arr);
  };

  // Validazione base
  const validate = () => {
    const newErrors: { [key: string]: boolean } = {};
    if (!form.date) newErrors.date = true;
    if (!form.type) newErrors.type = true;
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

        const { error: exErr } = await supabase.from('exercises').insert([
          {
            session_id: session.id,
            name: ex.name,
            distance_m: ex.distance_m ? parseInt(ex.distance_m) : null,
            sets: ex.sets ? parseInt(ex.sets) : null,
            repetitions: ex.repetitions ? parseInt(ex.repetitions) : null,
            rest_between_reps_s: ex.rest_between_reps_s
              ? parseInt(ex.rest_between_reps_s)
              : null,
            rest_between_sets_s: ex.rest_between_sets_s
              ? parseInt(ex.rest_between_sets_s)
              : null,
            intensity: ex.intensity ? parseFloat(ex.intensity) : null,
            effort_type: ex.effort_type,
            notes: ex.notes,
            created_at: new Date().toISOString(),
          },
        ]);
        if (exErr) throw exErr;
      }

      toast.success('Allenamento registrato con successo!');
      setForm({ date: '', type: '', location: '', notes: '' });
      setExercises([
        {
          name: '',
          distance_m: '',
          sets: '',
          repetitions: '',
          rest_between_reps_s: '',
          rest_between_sets_s: '',
          intensity: '',
          effort_type: '',
          notes: '',
        },
      ]);
    } catch (err: any) {
      console.error(err);
      toast.error('Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        📝 Registra Allenamento
      </h1>

      <Card className="shadow-sm">
        <CardContent className="space-y-6 p-6">
          {/* --- Info base --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                name="date"
                value={form.date}
                onChange={handleFormChange}
                className={errors.date ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <select
                name="type"
                value={form.type}
                onChange={handleFormChange}
                className={`w-full border rounded-md p-2 ${errors.type ? 'border-red-500' : ''}`}
              >
                <option value="">Seleziona tipo...</option>
                <option value="test">Test</option>
                <option value="palestra">Palestra</option>
                <option value="velocità">Velocità</option>
                <option value="resistenza">Resistenza</option>
              </select>
            </div>
            <div>
              <Label>Luogo</Label>
              <Input
                name="location"
                value={form.location}
                onChange={handleFormChange}
                placeholder="Pista, palestra..."
              />
            </div>
          </div>

          <div>
            <Label>Note</Label>
            <Textarea
              name="notes"
              value={form.notes}
              onChange={handleFormChange}
              placeholder="Sensazioni, variabili, obiettivi..."
            />
          </div>

          {/* --- Esercizi --- */}
          <div className="space-y-4">
            {exercises.map((ex, i) => (
              <Card key={i} className="bg-blue-50 border border-blue-100">
                <CardHeader className="flex justify-between items-center">
                  <CardTitle className="text-blue-800 flex items-center gap-2">
                    ⚡ Esercizio {i + 1}
                  </CardTitle>
                  {exercises.length > 1 && (
                    <button
                      onClick={() => removeExercise(i)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </CardHeader>

                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      name="name"
                      value={ex.name}
                      onChange={(e) => handleExerciseChange(i, e)}
                      placeholder="Es. 3x150m, squat..."
                      className={errors[`name-${i}`] ? 'border-red-500' : ''}
                    />
                  </div>
                  <div>
                    <Label>Distanza (m)</Label>
                    <Input
                      name="distance_m"
                      type="number"
                      value={ex.distance_m}
                      onChange={(e) => handleExerciseChange(i, e)}
                      placeholder="150"
                    />
                  </div>
                  <div>
                    <Label>Serie</Label>
                    <Input
                      name="sets"
                      type="number"
                      value={ex.sets}
                      onChange={(e) => handleExerciseChange(i, e)}
                      className={errors[`sets-${i}`] ? 'border-red-500' : ''}
                    />
                  </div>
                  <div>
                    <Label>Ripetizioni</Label>
                    <Input
                      name="repetitions"
                      type="number"
                      value={ex.repetitions}
                      onChange={(e) => handleExerciseChange(i, e)}
                      className={errors[`repetitions-${i}`] ? 'border-red-500' : ''}
                    />
                  </div>
                  <div>
                    <Label>Recupero tra ripetizioni (s)</Label>
                    <Input
                      name="rest_between_reps_s"
                      type="number"
                      value={ex.rest_between_reps_s}
                      onChange={(e) => handleExerciseChange(i, e)}
                      placeholder="es. 60"
                    />
                  </div>
                  <div>
                    <Label>Recupero tra serie (s)</Label>
                    <Input
                      name="rest_between_sets_s"
                      type="number"
                      value={ex.rest_between_sets_s}
                      onChange={(e) => handleExerciseChange(i, e)}
                      placeholder="es. 180"
                    />
                  </div>
                  <div>
                    <Label>Intensità (1–10)</Label>
                    <Input
                      name="intensity"
                      type="number"
                      min="1"
                      max="10"
                      value={ex.intensity}
                      onChange={(e) => handleExerciseChange(i, e)}
                    />
                  </div>
                  <div>
                    <Label>Tipo sforzo</Label>
                    <Input
                      name="effort_type"
                      value={ex.effort_type}
                      onChange={(e) => handleExerciseChange(i, e)}
                      placeholder="Massimo, medio..."
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Note esercizio</Label>
                    <Textarea
                      name="notes"
                      value={ex.notes}
                      onChange={(e) => handleExerciseChange(i, e)}
                      placeholder="Dettagli, condizioni, risultati..."
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button type="button" variant="outline" onClick={addExercise} className="flex items-center gap-2">
              <PlusCircle size={16} /> Aggiungi esercizio
            </Button>
          </div>

          {/* --- Salva --- */}
          <div className="pt-4 flex justify-end">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : 'Salva Allenamento'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
