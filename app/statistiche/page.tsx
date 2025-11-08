"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Exercise = {
  session_id: string | null;
  distance_m: number | null;
  sets: number | null;
  repetitions: number | null;
};

type ExerciseResult = {
  time_s: number | null;
};

export default function StatistichePage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [distanceFilter, setDistanceFilter] = useState<"all" | "short" | "mid" | "long">("all");

  const [totalSessions, setTotalSessions] = useState(0);
  const [totalDistance, setTotalDistance] = useState<number | null>(null);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [avgTime, setAvgTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadStats() {
    setLoading(true);

    // Numero sessioni
    let sessionsQuery = supabase.from("training_sessions").select("id", {
      count: "exact",
    });

    if (fromDate) sessionsQuery = sessionsQuery.gte("date", fromDate);
    if (toDate) sessionsQuery = sessionsQuery.lte("date", toDate);

    const { count: sessionCount } = await sessionsQuery;
    setTotalSessions(sessionCount || 0);

    // Esercizi (per distanza totale)
    let exercisesQuery = supabase
      .from("exercises")
      .select("session_id, distance_m, sets, repetitions");

    const { data: exercisesData } = await exercisesQuery;
    const exercises = (exercisesData || []) as Exercise[];

    const distanceSum = exercises.reduce((sum, ex) => {
      const d = ex.distance_m || 0;
      const s = ex.sets || 1;
      const r = ex.repetitions || 1;
      return sum + d * s * r;
    }, 0);

    setTotalDistance(distanceSum || null);

    // Risultati (tempi)
    const { data: resultsData } = await supabase
      .from("exercise_results")
      .select("time_s");

    const times = ((resultsData || []) as ExerciseResult[])
      .map((r) => r.time_s)
      .filter((t): t is number => typeof t === "number" && !isNaN(t));

    if (times.length > 0) {
      setBestTime(Math.min(...times));
      setAvgTime(
        times.reduce((sum, t) => sum + t, 0) / (times.length || 1)
      );
    } else {
      setBestTime(null);
      setAvgTime(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetFilters() {
    setFromDate("");
    setToDate("");
    setDistanceFilter("all");
    loadStats();
  }

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-800">
        <span className="text-3xl">📊</span>
        <span>Statistiche Allenamenti</span>
      </h1>

      {/* Card filtri */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span>⚙️</span>
            <span>Filtri</span>
          </h2>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Da
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-sky-100 transition focus:bg-white focus:ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">A</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-sky-100 transition focus:bg-white focus:ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Distanza
              </label>
              <select
                value={distanceFilter}
                onChange={(e) =>
                  setDistanceFilter(e.target.value as typeof distanceFilter)
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-sky-100 transition focus:bg-white focus:ring"
              >
                <option value="all">Tutte</option>
                <option value="short">Corte (&lt; 80m)</option>
                <option value="mid">Medie (80–200m)</option>
                <option value="long">Lunghe (&gt; 200m)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={loadStats}
              className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
            >
              Applica filtri
            </button>
          </div>
        </div>
      </div>

      {/* Card KPI */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="grid gap-4 border-b border-slate-100 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">
              Totale sessioni
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-800">
              {totalSessions}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50 px-4 py-3">
            <p className="text-xs font-medium text-emerald-600">
              Distanza totale (m)
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-800">
              {totalDistance !== null ? totalDistance : "0"}
            </p>
          </div>

          <div className="rounded-xl bg-orange-50 px-4 py-3">
            <p className="text-xs font-medium text-orange-600">Miglior tempo (s)</p>
            <p className="mt-1 text-2xl font-semibold text-orange-800">
              {bestTime !== null ? bestTime.toFixed(2) : "N/A"}
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 px-4 py-3">
            <p className="text-xs font-medium text-amber-600">
              Tempo medio (s)
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-800">
              {avgTime !== null ? avgTime.toFixed(2) : "N/A"}
            </p>
          </div>
        </div>

        <div className="px-6 py-6">
          {loading ? (
            <p className="text-sm text-slate-500">
              Calcolo delle statistiche in corso…
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Nessun grafico complesso per ora, ma i KPI sono già basati sulle
              tabelle <code>training_sessions</code>,{" "}
              <code>exercises</code> e <code>exercise_results</code>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
