"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

type DistanceFilter = "all" | "short" | "mid" | "long";

type Exercise = {
  id: string;
  session_id: string | null;
  distance_m: number | null;
  sets: number | null;
  repetitions: number | null;
};

type ExerciseRelation = {
  session_id: string | null;
  distance_m: number | null;
};

type RawExerciseRelation =
  | ExerciseRelation
  | ExerciseRelation[]
  | null
  | undefined;

type ExerciseResult = {
  time_s: number | null;
  exercise: ExerciseRelation | null;
};

export default function StatistichePage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("all");

  const [totalSessions, setTotalSessions] = useState(0);
  const [totalDistance, setTotalDistance] = useState<number | null>(null);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [avgTime, setAvgTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  function matchesDistance(distance: number | null, filter: DistanceFilter) {
    if (filter === "all") return true;
    if (distance == null) return false;
    if (filter === "short") return distance < 80;
    if (filter === "mid") return distance >= 80 && distance <= 200;
    return distance > 200;
  }

  async function loadStats(
    overrides?: Partial<{
      fromDate: string;
      toDate: string;
      distance: DistanceFilter;
    }>
  ) {
    const supabase = getSupabaseClient();
    setLoading(true);

    const activeFromDate = overrides?.fromDate ?? fromDate;
    const activeToDate = overrides?.toDate ?? toDate;
    const activeDistance = overrides?.distance ?? distanceFilter;

    try {
      // Numero sessioni
      let sessionsQuery = supabase
        .from("training_sessions")
        .select("id", { count: "exact" })
        .order("date", { ascending: false });

      if (activeFromDate) sessionsQuery = sessionsQuery.gte("date", activeFromDate);
      if (activeToDate) sessionsQuery = sessionsQuery.lte("date", activeToDate);

      const { data: sessionsData, count: sessionCount, error: sessionsError } =
        await sessionsQuery;

      if (sessionsError) {
        throw sessionsError;
      }

      const sessionIds = (sessionsData || []).map((session) => session.id);
      setTotalSessions(sessionCount ?? sessionIds.length);

      // Esercizi (per distanza totale)
      let exercises: Exercise[] = [];
      if (sessionIds.length > 0) {
        const { data: exercisesData, error: exercisesError } = await supabase
          .from("exercises")
          .select("id, session_id, distance_m, sets, repetitions")
          .in("session_id", sessionIds);

        if (exercisesError) throw exercisesError;
        exercises = (exercisesData || []) as Exercise[];
      }

      const filteredExercises = exercises.filter((ex) =>
        matchesDistance(ex.distance_m, activeDistance)
      );

      const distanceSum = filteredExercises.reduce((sum, ex) => {
        const distance = ex.distance_m ?? 0;
        const sets = ex.sets ?? 1;
        const repetitions = ex.repetitions ?? 1;
        return sum + distance * sets * repetitions;
      }, 0);

      setTotalDistance(distanceSum);

      // Risultati (tempi)
      let results: ExerciseResult[] = [];
      if (sessionIds.length > 0) {
        const { data: resultsData, error: resultsError } = await supabase
          .from("exercise_results")
          .select(
            "time_s, exercise:exercises!inner(session_id, distance_m)"
          )
          .in("exercise.session_id", sessionIds);

        if (resultsError) throw resultsError;
        const rawResults = (resultsData || []) as {
          time_s: number | null;
          exercise?: RawExerciseRelation;
        }[];

        results = rawResults.map((result) => {
          const relation = result.exercise;
          let exercise: ExerciseRelation | null = null;

          if (Array.isArray(relation)) {
            const [first] = relation;
            if (first) {
              exercise = {
                session_id: first.session_id ?? null,
                distance_m: first.distance_m ?? null,
              };
            }
          } else if (relation) {
            exercise = {
              session_id: relation.session_id ?? null,
              distance_m: relation.distance_m ?? null,
            };
          }

          return {
            time_s: result.time_s ?? null,
            exercise,
          } satisfies ExerciseResult;
        });
      }

      const times = results
        .filter((result) =>
          matchesDistance(result.exercise?.distance_m ?? null, activeDistance)
        )
        .map((result) => result.time_s)
        .filter((time): time is number => typeof time === "number" && !isNaN(time));

      if (times.length > 0) {
        setBestTime(Math.min(...times));
        setAvgTime(times.reduce((sum, t) => sum + t, 0) / times.length);
      } else {
        setBestTime(null);
        setAvgTime(null);
      }
    } catch (error) {
      console.error("Errore durante il caricamento delle statistiche", error);
      setTotalSessions(0);
      setTotalDistance(0);
      setBestTime(null);
      setAvgTime(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetFilters() {
    setFromDate("");
    setToDate("");
    setDistanceFilter("all");
    loadStats({ fromDate: "", toDate: "", distance: "all" });
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
                  setDistanceFilter(e.target.value as DistanceFilter)
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
              onClick={() => loadStats()}
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
