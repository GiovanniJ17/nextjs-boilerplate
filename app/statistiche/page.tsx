// app/statistiche/page.tsx
'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type Exercise = {
  id: string;
  name: string;
};

type ExerciseResult = {
  exercise_id: string;
  time_s: number | null;
  weight_kg: number | null;
  rpe: number | null;
};

type ExerciseStats = {
  name: string;
  attempts: number;
  bestTime: number | null;
  bestWeight: number | null;
  avgRpe: number | null;
};

type Metric = {
  id: string;
  date: string;
  metric_name: string;
  value: number;
  unit: string | null;
  notes: string | null;
};

export default function StatistichePage() {
  const [exerciseStats, setExerciseStats] = useState<ExerciseStats[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [
        { data: exercisesData, error: exError },
        { data: resultsData, error: resError },
      ] = await Promise.all([
        supabase.from('exercises').select('id, name'),
        supabase
          .from('exercise_results')
          .select('exercise_id, time_s, weight_kg, rpe'),
      ]);

      if (exError) throw exError;
      if (resError) throw resError;

      const exercises = (exercisesData ?? []) as Exercise[];
      const results = (resultsData ?? []) as ExerciseResult[];

      const exerciseById = new Map<string, Exercise>();
      exercises.forEach((e) => exerciseById.set(e.id, e));

      const statsMap = new Map<
        string,
        ExerciseStats & { rpeSum: number; rpeCount: number }
      >();

      results.forEach((r) => {
        const ex = exerciseById.get(r.exercise_id);
        if (!ex) return;

        const key = ex.name || 'Senza nome';
        let stat = statsMap.get(key);
        if (!stat) {
          stat = {
            name: key,
            attempts: 0,
            bestTime: null,
            bestWeight: null,
            avgRpe: null,
            rpeSum: 0,
            rpeCount: 0,
          };
          statsMap.set(key, stat);
        }

        stat.attempts += 1;
        if (typeof r.time_s === 'number') {
          stat.bestTime =
            stat.bestTime === null ? r.time_s : Math.min(stat.bestTime, r.time_s);
        }
        if (typeof r.weight_kg === 'number') {
          stat.bestWeight =
            stat.bestWeight === null
              ? r.weight_kg
              : Math.max(stat.bestWeight, r.weight_kg);
        }
        if (typeof r.rpe === 'number') {
          stat.rpeSum += r.rpe;
          stat.rpeCount += 1;
        }
      });

      const stats: ExerciseStats[] = Array.from(statsMap.values()).map((s) => ({
        name: s.name,
        attempts: s.attempts,
        bestTime: s.bestTime,
        bestWeight: s.bestWeight,
        avgRpe: s.rpeCount > 0 ? s.rpeSum / s.rpeCount : null,
      }));

      stats.sort((a, b) => a.name.localeCompare(b.name));

      const { data: metricsData, error: metricsError } = await supabase
        .from('metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

      if (metricsError) throw metricsError;

      setExerciseStats(stats);
      setMetrics((metricsData ?? []) as Metric[]);
    } catch (err: any) {
      console.error(err);
      setError('Errore nel caricamento delle statistiche.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Statistiche</h1>
        <button
          type="button"
          onClick={() => loadData()}
          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          Aggiorna
        </button>
      </div>

      {loading && (
        <p className="text-sm text-slate-300">Caricamento in corso...</p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* STATISTICHE ESERCIZI */}
      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-200">
          Prestazioni per esercizio (da exercise_results)
        </h2>

        {exerciseStats.length === 0 ? (
          <p className="text-xs text-slate-300">
            Non ci sono ancora risultati registrati.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-[11px] uppercase text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Esercizio</th>
                  <th className="py-2 pr-4">Tentativi</th>
                  <th className="py-2 pr-4">Miglior tempo (s)</th>
                  <th className="py-2 pr-4">Miglior peso (kg)</th>
                  <th className="py-2 pr-4">RPE medio</th>
                </tr>
              </thead>
              <tbody>
                {exerciseStats.map((s) => (
                  <tr key={s.name} className="border-b border-slate-900">
                    <td className="py-1 pr-4 text-slate-50">{s.name}</td>
                    <td className="py-1 pr-4">{s.attempts}</td>
                    <td className="py-1 pr-4">
                      {s.bestTime !== null ? s.bestTime.toFixed(2) : '-'}
                    </td>
                    <td className="py-1 pr-4">
                      {s.bestWeight !== null ? s.bestWeight.toFixed(1) : '-'}
                    </td>
                    <td className="py-1 pr-4">
                      {s.avgRpe !== null ? s.avgRpe.toFixed(1) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* METRICHE GENERALI */}
      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-200">
          Metriche generali (tabella metrics)
        </h2>

        {metrics.length === 0 ? (
          <p className="text-xs text-slate-300">
            Non ci sono ancora metriche registrate.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-[11px] uppercase text-slate-400">
                <tr>
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Metrica</th>
                  <th className="py-2 pr-4">Valore</th>
                  <th className="py-2 pr-4">Note</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id} className="border-b border-slate-900">
                    <td className="py-1 pr-4">{formatDate(m.date)}</td>
                    <td className="py-1 pr-4 text-slate-50">
                      {m.metric_name}
                    </td>
                    <td className="py-1 pr-4">
                      {m.value} {m.unit ?? ''}
                    </td>
                    <td className="py-1 pr-4">{m.notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(value: string) {
  try {
    const d = new Date(value);
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return value;
  }
}
