// app/inserimento/page.tsx
'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type TrainingBlock = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  goal: string | null;
  notes: string | null;
};

type SessionFormState = {
  blockId: string;
  useNewBlock: boolean;
  date: string;
  type: string;
  location: string;
  notes: string;
  newBlockName: string;
  newBlockStartDate: string;
  newBlockEndDate: string;
  newBlockGoal: string;
  newBlockNotes: string;
  exercises: ExerciseForm[];
};

type ExerciseForm = {
  id: string; // solo per React key
  name: string;
  distance_m: string;
  sets: string;
  repetitions: string;
  rest_between_reps_s: string;
  rest_between_sets_s: string;
  intensity: string;
  effort_type: string;
  notes: string;
  result_time_s: string;
  result_weight_kg: string;
  result_rpe: string;
  result_notes: string;
};

function makeEmptyExercise(): ExerciseForm {
  return {
    id: crypto.randomUUID(),
    name: '',
    distance_m: '',
    sets: '',
    repetitions: '',
    rest_between_reps_s: '',
    rest_between_sets_s: '',
    intensity: '',
    effort_type: '',
    notes: '',
    result_time_s: '',
    result_weight_kg: '',
    result_rpe: '',
    result_notes: '',
  };
}

export default function InserimentoPage() {
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [form, setForm] = useState<SessionFormState>({
    blockId: '',
    useNewBlock: false,
    date: new Date().toISOString().slice(0, 10),
    type: '',
    location: '',
    notes: '',
    newBlockName: '',
    newBlockStartDate: new Date().toISOString().slice(0, 10),
    newBlockEndDate: '',
    newBlockGoal: '',
    newBlockNotes: '',
    exercises: [makeEmptyExercise()],
  });

  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadBlocks();
  }, []);

  async function loadBlocks() {
    try {
      setLoadingBlocks(true);
      const { data, error } = await supabase
        .from('training_blocks')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      setBlocks(data ?? []);
    } catch (err: any) {
      console.error(err);
      setError('Errore nel caricamento dei blocchi di allenamento.');
    } finally {
      setLoadingBlocks(false);
    }
  }

  function updateForm<K extends keyof SessionFormState>(
    key: K,
    value: SessionFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateExercise(id: string, patch: Partial<ExerciseForm>) {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === id ? { ...ex, ...patch } : ex
      ),
    }));
  }

  function addExercise() {
    setForm((prev) => ({
      ...prev,
      exercises: [...prev.exercises, makeEmptyExercise()],
    }));
  }

  function removeExercise(id: string) {
    setForm((prev) => ({
      ...prev,
      exercises:
        prev.exercises.length === 1
          ? prev.exercises
          : prev.exercises.filter((ex) => ex.id !== id),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      let blockId: string | null = form.blockId || null;

      // 1) Nuovo blocco (opzionale)
      if (form.useNewBlock) {
        if (!form.newBlockName.trim()) {
          throw new Error('Inserisci il nome del nuovo blocco.');
        }
        const { data: newBlock, error: blockError } = await supabase
          .from('training_blocks')
          .insert({
            name: form.newBlockName.trim(),
            start_date: form.newBlockStartDate || null,
            end_date: form.newBlockEndDate || null,
            goal: form.newBlockGoal || null,
            notes: form.newBlockNotes || null,
          })
          .select()
          .single();

        if (blockError) throw blockError;
        blockId = newBlock.id;
      }

      if (!form.date) {
        throw new Error('Inserisci la data della sessione.');
      }

      // 2) Sessione
      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .insert({
          block_id: blockId,
          date: form.date,
          type: form.type || null,
          location: form.location || null,
          notes: form.notes || null,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      const sessionId = session.id as string;

      // 3) Esercizi
      const filledExercises = form.exercises.filter(
        (ex) => ex.name.trim() !== ''
      );

      const exercisesToInsert = filledExercises.map((ex) => ({
        session_id: sessionId,
        name: ex.name.trim(),
        distance_m: ex.distance_m ? Number(ex.distance_m) : null,
        sets: ex.sets ? Number(ex.sets) : null,
        repetitions: ex.repetitions ? Number(ex.repetitions) : null,
        rest_between_reps_s: ex.rest_between_reps_s
          ? Number(ex.rest_between_reps_s)
          : null,
        rest_between_sets_s: ex.rest_between_sets_s
          ? Number(ex.rest_between_sets_s)
          : null,
        intensity: ex.intensity ? Number(ex.intensity) : null,
        effort_type: ex.effort_type || null,
        notes: ex.notes || null,
      }));

      let insertedExercises: { id: string }[] = [];

      if (exercisesToInsert.length > 0) {
        const { data, error: exError } = await supabase
          .from('exercises')
          .insert(exercisesToInsert)
          .select();
        if (exError) throw exError;
        insertedExercises = data as { id: string }[];
      }

      // 4) Risultati (uno per esercizio, opzionale)
      const resultsToInsert: any[] = [];

      insertedExercises.forEach((inserted, index) => {
        const exForm = filledExercises[index];
        if (!exForm) return;

        const hasResult =
          exForm.result_time_s ||
          exForm.result_weight_kg ||
          exForm.result_rpe ||
          exForm.result_notes;

        if (!hasResult) return;

        resultsToInsert.push({
          exercise_id: inserted.id,
          attempt_number: 1,
          time_s: exForm.result_time_s ? Number(exForm.result_time_s) : null,
          weight_kg: exForm.result_weight_kg
            ? Number(exForm.result_weight_kg)
            : null,
          rpe: exForm.result_rpe ? Number(exForm.result_rpe) : null,
          notes: exForm.result_notes || null,
        });
      });

      if (resultsToInsert.length > 0) {
        const { error: resError } = await supabase
          .from('exercise_results')
          .insert(resultsToInsert);
        if (resError) throw resError;
      }

      setSuccess('Sessione salvata correttamente!');
      setForm((prev) => ({
        ...prev,
        date: new Date().toISOString().slice(0, 10),
        type: '',
        location: '',
        notes: '',
        exercises: [makeEmptyExercise()],
      }));
      void loadBlocks();
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">
        Inserimento sessione
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow"
      >
        {/* BLOCCO */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Blocco di allenamento
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium text-slate-300">
              Seleziona blocco esistente
              <select
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                disabled={form.useNewBlock || loadingBlocks}
                value={form.blockId}
                onChange={(e) => updateForm('blockId', e.target.value)}
              >
                <option value="">Nessun blocco</option>
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                checked={form.useNewBlock}
                onChange={(e) => updateForm('useNewBlock', e.target.checked)}
              />
              Crea un nuovo blocco per questa sessione
            </label>
          </div>

          {form.useNewBlock && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-medium text-slate-300">
                Nome blocco *
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                  value={form.newBlockName}
                  onChange={(e) => updateForm('newBlockName', e.target.value)}
                  required
                />
              </label>
              <label className="text-xs font-medium text-slate-300">
                Obiettivo
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                  value={form.newBlockGoal}
                  onChange={(e) => updateForm('newBlockGoal', e.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-slate-300">
                Data inizio
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                  value={form.newBlockStartDate}
                  onChange={(e) =>
                    updateForm('newBlockStartDate', e.target.value)
                  }
                />
              </label>
              <label className="text-xs font-medium text-slate-300">
                Data fine
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                  value={form.newBlockEndDate}
                  onChange={(e) =>
                    updateForm('newBlockEndDate', e.target.value)
                  }
                />
              </label>
              <label className="md:col-span-2 text-xs font-medium text-slate-300">
                Note blocco
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                  rows={2}
                  value={form.newBlockNotes}
                  onChange={(e) =>
                    updateForm('newBlockNotes', e.target.value)
                  }
                />
              </label>
            </div>
          )}
        </section>

        {/* SESSIONE */}
        <section className="space-y-4 border-t border-slate-800 pt-4">
          <h2 className="text-sm font-semibold text-slate-200">
            Dettagli sessione
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-xs font-medium text-slate-300">
              Data *
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                value={form.date}
                onChange={(e) => updateForm('date', e.target.value)}
                required
              />
            </label>
            <label className="text-xs font-medium text-slate-300">
              Tipo (es. Velocità, Forza...)
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                value={form.type}
                onChange={(e) => updateForm('type', e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-300">
              Luogo
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
                value={form.location}
                onChange={(e) => updateForm('location', e.target.value)}
              />
            </label>
          </div>

          <label className="text-xs font-medium text-slate-300">
            Note sessione
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
              rows={2}
              value={form.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
            />
          </label>
        </section>

        {/* ESERCIZI */}
        <section className="space-y-4 border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-200">Esercizi</h2>
            <button
              type="button"
              onClick={addExercise}
              className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-slate-700"
            >
              + Aggiungi esercizio
            </button>
          </div>

          <div className="space-y-4">
            {form.exercises.map((ex, index) => (
              <div
                key={ex.id}
                className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Esercizio {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExercise(ex.id)}
                    className="text-[10px] text-slate-400 hover:text-red-400"
                  >
                    Rimuovi
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-[11px] font-medium text-slate-300 md:col-span-2">
                    Nome esercizio *
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs"
                      value={ex.name}
                      onChange={(e) =>
                        updateExercise(ex.id, { name: e.target.value })
                      }
                      required={index === 0}
                    />
                  </label>
                  <label className="text-[11px] font-medium text-slate-300">
                    Distanza (m)
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs"
                      value={ex.distance_m}
                      onChange={(e) =>
                        updateExercise(ex.id, { distance_m: e.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-5">
                  <NumberField
                    label="Serie"
                    value={ex.sets}
                    onChange={(v) => updateExercise(ex.id, { sets: v })}
                  />
                  <NumberField
                    label="Ripetizioni"
                    value={ex.repetitions}
                    onChange={(v) =>
                      updateExercise(ex.id, { repetitions: v })
                    }
                  />
                  <NumberField
                    label="Recupero tra ripetizioni (s)"
                    value={ex.rest_between_reps_s}
                    onChange={(v) =>
                      updateExercise(ex.id, { rest_between_reps_s: v })
                    }
                  />
                  <NumberField
                    label="Recupero tra serie (s)"
                    value={ex.rest_between_sets_s}
                    onChange={(v) =>
                      updateExercise(ex.id, { rest_between_sets_s: v })
                    }
                  />
                  <NumberField
                    label="Intensità"
                    value={ex.intensity}
                    onChange={(v) =>
                      updateExercise(ex.id, { intensity: v })
                    }
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-[11px] font-medium text-slate-300">
                    Tipo di sforzo (es. RPE, %RM...)
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs"
                      value={ex.effort_type}
                      onChange={(e) =>
                        updateExercise(ex.id, { effort_type: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-[11px] font-medium text-slate-300">
                    Note esercizio
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs"
                      value={ex.notes}
                      onChange={(e) =>
                        updateExercise(ex.id, { notes: e.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <NumberField
                    label="Tempo (s)"
                    value={ex.result_time_s}
                    onChange={(v) =>
                      updateExercise(ex.id, { result_time_s: v })
                    }
                  />
                  <NumberField
                    label="Peso (kg)"
                    value={ex.result_weight_kg}
                    onChange={(v) =>
                      updateExercise(ex.id, { result_weight_kg: v })
                    }
                  />
                  <NumberField
                    label="RPE"
                    value={ex.result_rpe}
                    onChange={(v) =>
                      updateExercise(ex.id, { result_rpe: v })
                    }
                  />
                  <label className="text-[11px] font-medium text-slate-300">
                    Note risultato
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs"
                      value={ex.result_notes}
                      onChange={(e) =>
                        updateExercise(ex.id, { result_notes: e.target.value })
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-emerald-400">{success}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Salvataggio...' : 'Salva sessione'}
          </button>
        </div>
      </form>
    </div>
  );
}

type NumberFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <label className="text-[11px] font-medium text-slate-300">
      {label}
      <input
        type="number"
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
