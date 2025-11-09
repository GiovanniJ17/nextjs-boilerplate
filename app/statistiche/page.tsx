"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivitySquare,
  AreaChart,
  BarChart4,
  CalendarDays,
  Compass,
  Info,
  Lightbulb,
  ListChecks,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";

type TrainingBlock = {
  id: string;
  name: string;
};

type TrainingSession = {
  id: string;
  date: string | null;
  type: string | null;
  block_id: string | null;
};

type ExerciseRow = {
  id: string;
  session_id: string;
  name: string;
  distance_m: number | null;
  sets: number | null;
  repetitions: number | null;
  intensity: number | null;
  effort_type: string | null;
};

type ExerciseResultRow = {
  exercise_id: string;
  attempt_number: number | null;
  time_s: number | null;
  weight_kg: number | null;
  rpe: number | null;
  created_at: string | null;
};

type MetricRow = {
  id: string;
  date: string;
  metric_name: string;
  value: number;
  unit: string | null;
  notes: string | null;
};

type DistanceFilter = "all" | "short" | "mid" | "long";

type TabKey = "base" | "advanced" | "insights";

const sessionTypes = [
  { value: "", label: "Tutte" },
  { value: "pista", label: "Pista" },
  { value: "palestra", label: "Palestra" },
  { value: "test", label: "Test" },
  { value: "scarico", label: "Scarico" },
  { value: "recupero", label: "Recupero" },
  { value: "altro", label: "Altro" },
];

const distanceFilters: { value: DistanceFilter; label: string }[] = [
  { value: "all", label: "Tutte le distanze" },
  { value: "short", label: "Corte (< 80m)" },
  { value: "mid", label: "Medie (80–200m)" },
  { value: "long", label: "Lunghe (> 200m)" },
];

export default function StatistichePage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>("base");
  const [loading, setLoading] = useState(true);

  const [totalSessions, setTotalSessions] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [avgIntensity, setAvgIntensity] = useState<number | null>(null);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [avgTime, setAvgTime] = useState<number | null>(null);
  const [effortBreakdown, setEffortBreakdown] = useState<Record<string, number>>({});
  const [timeByDistance, setTimeByDistance] = useState<{ distance: string; average: number }[]>([]);
  const [volumeTrend, setVolumeTrend] = useState<{ date: string; distance: number }[]>([]);
  const [metricsSummary, setMetricsSummary] = useState<Record<string, { value: number; date: string; unit: string | null }>>({});
  const [latestMetrics, setLatestMetrics] = useState<MetricRow[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    const loadBlocks = async () => {
      const { data } = await supabase
        .from("training_blocks")
        .select("id, name")
        .order("start_date", { ascending: false });

      setBlocks((data || []) as TrainingBlock[]);
    };

    loadBlocks();
  }, []);

  async function loadStats() {
    setLoading(true);

    let sessionsQuery = supabase
      .from("training_sessions")
      .select("id, date, type, block_id")
      .order("date", { ascending: true });

    if (fromDate) sessionsQuery = sessionsQuery.gte("date", fromDate);
    if (toDate) sessionsQuery = sessionsQuery.lte("date", toDate);
    if (typeFilter) sessionsQuery = sessionsQuery.eq("type", typeFilter);
    if (blockFilter) sessionsQuery = sessionsQuery.eq("block_id", blockFilter);

    const { data: sessionRows, error: sessionError } = await sessionsQuery;
    if (sessionError) {
      console.error(sessionError);
      setLoading(false);
      return;
    }

    const sessions = (sessionRows || []) as TrainingSession[];
    setTotalSessions(sessions.length);

    const sessionIds = sessions.map((session) => session.id);

    if (sessionIds.length === 0) {
      setTotalDistance(0);
      setAvgIntensity(null);
      setBestTime(null);
      setAvgTime(null);
      setEffortBreakdown({});
      setTimeByDistance([]);
      setVolumeTrend([]);
      setMetricsSummary({});
      setLatestMetrics([]);
      setInsights([]);
      setLoading(false);
      return;
    }

    let exercisesQuery = supabase
      .from("exercises")
      .select("id, session_id, name, distance_m, sets, repetitions, intensity, effort_type")
      .in("session_id", sessionIds);

    const { data: exerciseRows, error: exerciseError } = await exercisesQuery;
    if (exerciseError) {
      console.error(exerciseError);
      setLoading(false);
      return;
    }

    const exercises = (exerciseRows || []) as ExerciseRow[];

    const filteredExercises = exercises.filter((exercise) => {
      const distance = exercise.distance_m || 0;
      switch (distanceFilter) {
        case "short":
          return distance > 0 && distance < 80;
        case "mid":
          return distance >= 80 && distance <= 200;
        case "long":
          return distance > 200;
        default:
          return true;
      }
    });

    const exerciseIds = filteredExercises.map((exercise) => exercise.id);

    let results: ExerciseResultRow[] = [];
    if (exerciseIds.length > 0) {
      const { data: resultsRows, error: resultsError } = await supabase
        .from("exercise_results")
        .select("exercise_id, attempt_number, time_s, weight_kg, rpe, created_at")
        .in("exercise_id", exerciseIds);

      if (resultsError) {
        console.error(resultsError);
      } else {
        results = (resultsRows || []) as ExerciseResultRow[];
      }
    }

    const { data: metricsRows, error: metricsError } = await supabase
      .from("metrics")
      .select("id, date, metric_name, value, unit, notes")
      .order("date", { ascending: true });

    if (metricsError) {
      console.error(metricsError);
    }

    const metrics = (metricsRows || []) as MetricRow[];

    const totalDistanceValue = filteredExercises.reduce((sum, exercise) => {
      const distance = exercise.distance_m || 0;
      const sets = exercise.sets || 1;
      const reps = exercise.repetitions || 1;
      return sum + distance * Math.max(sets, 1) * Math.max(reps, 1);
    }, 0);
    setTotalDistance(totalDistanceValue);

    const intensityValues = filteredExercises
      .map((exercise) => exercise.intensity)
      .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));
    setAvgIntensity(
      intensityValues.length > 0
        ? intensityValues.reduce((sum, value) => sum + value, 0) / intensityValues.length
        : null,
    );

    const effortCounts: Record<string, number> = {};
    filteredExercises.forEach((exercise) => {
      if (exercise.effort_type) {
        effortCounts[exercise.effort_type] = (effortCounts[exercise.effort_type] || 0) + 1;
      }
    });
    setEffortBreakdown(effortCounts);

    const exerciseMap = new Map(filteredExercises.map((exercise) => [exercise.id, exercise]));
    const validTimes = results
      .map((result) => result.time_s)
      .filter((time): time is number => typeof time === "number" && !Number.isNaN(time));

    if (validTimes.length > 0) {
      setBestTime(Math.min(...validTimes));
      setAvgTime(validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length);
    } else {
      setBestTime(null);
      setAvgTime(null);
    }

    const groupedTimes: Record<string, number[]> = {};
    results.forEach((result) => {
      const exercise = exerciseMap.get(result.exercise_id);
      if (!exercise || !result.time_s) return;
      const distance = exercise.distance_m || 0;
      const key = distance > 0 ? `${distance} m` : exercise.name;
      if (!groupedTimes[key]) groupedTimes[key] = [];
      groupedTimes[key].push(result.time_s);
    });

    const averages = Object.entries(groupedTimes).map(([distance, values]) => ({
      distance,
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
    }));
    setTimeByDistance(averages.sort((a, b) => a.distance.localeCompare(b.distance)));

    const distanceBySession: Record<string, number> = {};
    filteredExercises.forEach((exercise) => {
      const sets = exercise.sets || 1;
      const reps = exercise.repetitions || 1;
      const distance = exercise.distance_m || 0;
      distanceBySession[exercise.session_id] =
        (distanceBySession[exercise.session_id] || 0) + distance * Math.max(sets, 1) * Math.max(reps, 1);
    });

    setVolumeTrend(
      sessions
        .map((session) => ({
          date: session.date || "",
          distance: distanceBySession[session.id] || 0,
        }))
        .filter((item) => item.date)
        .slice(-12),
    );

    const metricsByName: Record<string, { value: number; date: string; unit: string | null }> = {};
    const latestMetricsByName: Record<string, MetricRow> = {};

    metrics.forEach((metric) => {
      if (!metric.metric_name) return;
      const current = metricsByName[metric.metric_name];
      if (!current || metric.value > current.value) {
        metricsByName[metric.metric_name] = {
          value: metric.value,
          date: metric.date,
          unit: metric.unit,
        };
      }

      const latest = latestMetricsByName[metric.metric_name];
      if (!latest || metric.date > latest.date) {
        latestMetricsByName[metric.metric_name] = metric;
      }
    });

    setMetricsSummary(metricsByName);
    setLatestMetrics(Object.values(latestMetricsByName).sort((a, b) => (a.date > b.date ? -1 : 1)).slice(0, 6));

    setInsights(generateInsights({
      sessions,
      totalDistance: totalDistanceValue,
      effortCounts,
      avgIntensity:
        intensityValues.length > 0
          ? intensityValues.reduce((sum, value) => sum + value, 0) / intensityValues.length
          : null,
      metricsSummary: metricsByName,
      bestTime: validTimes.length > 0 ? Math.min(...validTimes) : null,
    }));

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
    setTypeFilter("");
    setBlockFilter("");
    loadStats();
  }

  const tabs: { key: TabKey; label: string; icon: ReactNode }[] = useMemo(
    () => [
      { key: "base", label: "Statistiche Base", icon: <BarChart4 className="h-4 w-4" /> },
      { key: "advanced", label: "Statistiche Avanzate", icon: <ActivitySquare className="h-4 w-4" /> },
      { key: "insights", label: "Curiosità & Insights", icon: <Sparkles className="h-4 w-4" /> },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Statistiche Allenamenti</h1>
          <p className="text-sm text-slate-600">
            Analizza le performance sfruttando blocchi, esercizi e metriche integrate nella nuova struttura database.
          </p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b bg-slate-50/80">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Compass className="h-4 w-4 text-slate-500" /> Filtri
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Limita l’analisi ad un periodo, un blocco o una tipologia di sessione.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Da</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring focus:ring-emerald-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">A</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring focus:ring-emerald-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Blocco</label>
              <select
                value={blockFilter}
                onChange={(e) => setBlockFilter(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring focus:ring-emerald-100"
              >
                <option value="">Tutti</option>
                {blocks.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Tipologia</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring focus:ring-emerald-100"
              >
                {sessionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Distanza</label>
              <select
                value={distanceFilter}
                onChange={(e) => setDistanceFilter(e.target.value as DistanceFilter)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring focus:ring-emerald-100"
              >
                {distanceFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={resetFilters}>
              Reset
            </Button>
            <Button type="button" onClick={loadStats}>
              Applica filtri
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-slate-600 shadow hover:bg-slate-100"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "base" && (
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <StatPill
                title="Totale sessioni"
                value={totalSessions.toString()}
                icon={<CalendarDays className="h-5 w-5 text-emerald-600" />}
              />
              <StatPill
                title="Volume distanza (m)"
                value={totalDistance.toFixed(0)}
                icon={<AreaChart className="h-5 w-5 text-sky-600" />}
              />
              <StatPill
                title="Miglior tempo (s)"
                value={bestTime != null ? bestTime.toFixed(2) : "N/A"}
                icon={<ActivitySquare className="h-5 w-5 text-orange-500" />}
              />
              <StatPill
                title="Tempo medio (s)"
                value={avgTime != null ? avgTime.toFixed(2) : "N/A"}
                icon={<BarChart4 className="h-5 w-5 text-indigo-500" />}
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-900">Tempo medio per distanza</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Calcolato dai risultati registrati nella tabella exercise_results.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {loading ? (
                <p className="text-sm text-slate-500">Calcolo in corso…</p>
              ) : timeByDistance.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Registra tempi sugli esercizi per ottenere medie per distanza.
                </p>
              ) : (
                <ul className="space-y-2">
                  {timeByDistance.map((item) => (
                    <li
                      key={item.distance}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-700">{item.distance}</span>
                      <span className="text-slate-600">{item.average.toFixed(2)} s</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-900">Andamento volumetrico</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Ultimi carichi distanza aggregati per sessione.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {loading ? (
                <p className="text-sm text-slate-500">Calcolo in corso…</p>
              ) : volumeTrend.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nessuna distanza disponibile con i filtri selezionati.
                </p>
              ) : (
                <ul className="space-y-2">
                  {volumeTrend.map((item) => (
                    <li key={item.date} className="flex items-center justify-between text-sm text-slate-600">
                      <span>{item.date}</span>
                      <span className="font-semibold text-slate-800">{item.distance.toFixed(0)} m</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "advanced" && (
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-900">Distribuzione dello sforzo</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Basata sul campo effort_type salvato nella tabella exercises.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {Object.keys(effortBreakdown).length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nessun dato disponibile: registra l'intensità negli esercizi per popolare questa sezione.
                </p>
              ) : (
                Object.entries(effortBreakdown).map(([effort, count]) => {
                  const total = Object.values(effortBreakdown).reduce((sum, value) => sum + value, 0);
                  const percentage = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={effort} className="space-y-1">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span className="font-medium text-slate-700">{effort}</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-900">Metriche monitorate</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Migliori valori registrati nella tabella metrics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {Object.keys(metricsSummary).length === 0 ? (
                <p className="text-sm text-slate-500">
                  Aggiungi misurazioni nella tabella metrics per ottenere massimali e progressi.
                </p>
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {Object.entries(metricsSummary).map(([metricName, data]) => (
                    <li key={metricName} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                      <div className="font-semibold text-slate-700">{metricName}</div>
                      <div className="text-slate-500">
                        PB: <span className="font-semibold text-slate-800">{data.value}</span>
                        {data.unit ? ` ${data.unit}` : ""}
                      </div>
                      <div className="text-xs text-slate-500">Aggiornato il {data.date}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-900">Aggiornamenti recenti</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Ultime metriche registrate per monitorare i trend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {latestMetrics.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nessuna metrica recente disponibile.
                </p>
              ) : (
                <ul className="space-y-2">
                  {latestMetrics.map((metric) => (
                    <li key={metric.id} className="flex items-center justify-between text-sm text-slate-600">
                      <div>
                        <p className="font-semibold text-slate-800">{metric.metric_name}</p>
                        {metric.notes && <p className="text-xs text-slate-500">{metric.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800">
                          {metric.value}
                          {metric.unit ? ` ${metric.unit}` : ""}
                        </p>
                        <p className="text-xs text-slate-500">{metric.date}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "insights" && (
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Lightbulb className="h-4 w-4 text-amber-500" /> Suggerimenti e curiosità
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Insight generati dai dati di blocchi, esercizi, risultati e metriche.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              {loading ? (
                <p className="text-sm text-slate-500">Analisi in corso…</p>
              ) : insights.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Inserisci risultati e metriche per ottenere suggerimenti personalizzati.
                </p>
              ) : (
                <ul className="space-y-2">
                  {insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                      <Info className="mt-0.5 h-4 w-4 text-emerald-500" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ListChecks className="h-4 w-4 text-slate-500" /> Checklist rapida
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Ricorda cosa registrare per alimentare le statistiche avanzate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-6 text-sm text-slate-600">
              <p>• Collega ogni sessione ad un blocco stagionale.</p>
              <p>• Compila intensità ed effort_type per ogni esercizio.</p>
              <p>• Registra almeno un tempo o carico nei risultati.</p>
              <p>• Aggiorna con costanza le metriche chiave (peso, test, PB).</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

type StatPillProps = {
  title: string;
  value: string;
  icon: ReactNode;
};

function StatPill({ title, value, icon }: StatPillProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
        <p className="text-lg font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

type InsightInput = {
  sessions: TrainingSession[];
  totalDistance: number;
  effortCounts: Record<string, number>;
  avgIntensity: number | null;
  metricsSummary: Record<string, { value: number; date: string; unit: string | null }>;
  bestTime: number | null;
};

function generateInsights({
  sessions,
  totalDistance,
  effortCounts,
  avgIntensity,
  metricsSummary,
  bestTime,
}: InsightInput): string[] {
  const output: string[] = [];

  if (sessions.length > 0) {
    const firstDate = sessions[0].date;
    const lastDate = sessions[sessions.length - 1].date;
    if (firstDate && lastDate) {
      output.push(`Hai registrato ${sessions.length} sessioni tra ${firstDate} e ${lastDate}.`);
    }
  }

  if (totalDistance > 0) {
    output.push(`Volume complessivo nelle distanze filtrate: ${totalDistance.toFixed(0)} metri.`);
  }

  if (avgIntensity != null) {
    output.push(`Intensità media degli esercizi monitorati: ${avgIntensity.toFixed(1)}/10.`);
  }

  const totalEfforts = Object.values(effortCounts).reduce((sum, value) => sum + value, 0);
  if (totalEfforts > 0) {
    const mostFrequent = Object.entries(effortCounts).sort((a, b) => b[1] - a[1])[0];
    if (mostFrequent) {
      output.push(`Lo sforzo più utilizzato è "${mostFrequent[0]}" (${mostFrequent[1]} esercizi).`);
    }
  }

  if (bestTime != null) {
    output.push(`Miglior tempo registrato: ${bestTime.toFixed(2)} secondi.`);
  }

  const metricNames = Object.keys(metricsSummary);
  if (metricNames.length > 0) {
    metricNames.slice(0, 3).forEach((metricName) => {
      const metric = metricsSummary[metricName];
      output.push(
        `PB ${metricName}: ${metric.value}${metric.unit ? ` ${metric.unit}` : ""} (aggiornato il ${metric.date}).`,
      );
    });
  }

  return output;
}
