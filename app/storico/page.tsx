"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Filter, NotebookText, Search } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";

type TrainingBlock = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
};

type TrainingSession = {
  id: string;
  date: string | null;
  type: string | null;
  location: string | null;
  notes: string | null;
  block_id: string | null;
  training_blocks?: TrainingBlock | null;
};

type RawTrainingSession = Omit<TrainingSession, "training_blocks"> & {
  training_blocks: TrainingBlock[] | TrainingBlock | null;
};

type ExerciseSummary = {
  id: string;
  session_id: string;
  name: string;
  intensity: number | null;
  effort_type: string | null;
};

const sessionTypes = [
  { value: "", label: "Tutti" },
  { value: "pista", label: "Pista" },
  { value: "palestra", label: "Palestra" },
  { value: "test", label: "Test" },
  { value: "scarico", label: "Scarico" },
  { value: "recupero", label: "Recupero" },
  { value: "altro", label: "Altro" },
];

export default function StoricoPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);

  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [exercisesBySession, setExercisesBySession] = useState<Record<string, ExerciseSummary[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBlocks = async () => {
      const { data } = await supabase
        .from("training_blocks")
        .select("id, name, start_date, end_date")
        .order("start_date", { ascending: false });

      setBlocks((data || []) as TrainingBlock[]);
    };

    loadBlocks();
  }, []);

  async function loadSessions() {
    setLoading(true);

    let query = supabase
      .from("training_sessions")
      .select("id, date, type, location, notes, block_id, training_blocks(id, name, start_date, end_date)")
      .order("date", { ascending: false });

    if (fromDate) {
      query = query.gte("date", fromDate);
    }
    if (toDate) {
      query = query.lte("date", toDate);
    }
    if (typeFilter) {
      query = query.eq("type", typeFilter);
    }
    if (blockFilter) {
      query = query.eq("block_id", blockFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      const normalized: TrainingSession[] = (data as RawTrainingSession[]).map((session) => ({
        ...session,
        training_blocks: Array.isArray(session.training_blocks)
          ? session.training_blocks[0] ?? null
          : session.training_blocks ?? null,
      }));
      setSessions(normalized);

      const sessionIds = normalized.map((session) => session.id);

      if (sessionIds.length > 0) {
        const { data: exercisesData } = await supabase
          .from("exercises")
          .select("id, session_id, name, intensity, effort_type")
          .in("session_id", sessionIds);

        const grouped: Record<string, ExerciseSummary[]> = {};
        (exercisesData || []).forEach((exercise) => {
          const e = exercise as ExerciseSummary;
          if (!grouped[e.session_id]) grouped[e.session_id] = [];
          grouped[e.session_id].push(e);
        });
        setExercisesBySession(grouped);
      } else {
        setExercisesBySession({});
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetFilters() {
    setFromDate("");
    setToDate("");
    setTypeFilter("");
    setBlockFilter("");
    loadSessions();
  }

  const emptyStateText = useMemo(() => {
    if (loading) {
      return "Caricamento allenamenti…";
    }

    if (sessions.length === 0) {
      return "Nessun allenamento trovato con i filtri selezionati.";
    }

    return "";
  }, [loading, sessions.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
          <NotebookText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Storico Allenamenti</h1>
          <p className="text-sm text-slate-600">
            Consulta rapidamente tutte le sessioni registrate e filtra per blocco, periodo o tipologia.
          </p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/80">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Filter className="h-4 w-4 text-slate-500" /> Filtri di ricerca
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Imposta intervallo temporale, blocco e tipologia per restringere i risultati.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Da</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring focus:ring-indigo-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">A</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring focus:ring-indigo-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Blocco</label>
              <select
                value={blockFilter}
                onChange={(e) => setBlockFilter(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring focus:ring-indigo-100"
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
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring focus:ring-indigo-100"
              >
                {sessionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={loadSessions}
              className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Applica filtri
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="border-b bg-white px-6 py-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Search className="h-4 w-4 text-slate-500" /> Storico allenamenti
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {emptyStateText ? (
            <p className="text-sm text-slate-500">{emptyStateText}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sessions.map((session) => {
                const exercises = exercisesBySession[session.id] || [];
                return (
                  <li key={session.id} className="py-5 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                            {session.type || "Allenamento"}
                          </span>
                          {session.training_blocks && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                              {session.training_blocks.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <CalendarDays className="h-4 w-4" />
                          <span>{session.date || "Data non impostata"}</span>
                          {session.location && <span>• {session.location}</span>}
                        </div>
                        {session.notes && (
                          <p className="max-w-2xl text-xs text-slate-600">
                            {session.notes.length > 200
                              ? `${session.notes.slice(0, 200)}…`
                              : session.notes}
                          </p>
                        )}
                      </div>

                      {exercises.length > 0 ? (
                        <div className="min-w-[240px] rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Lavori inclusi
                          </p>
                          <ul className="mt-2 space-y-1">
                            {exercises.slice(0, 4).map((exercise) => (
                              <li key={exercise.id} className="flex items-center justify-between text-xs text-slate-600">
                                <span className="truncate">{exercise.name}</span>
                                {exercise.effort_type && (
                                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                                    {exercise.effort_type}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                          {exercises.length > 4 && (
                            <p className="mt-2 text-[11px] text-slate-500">
                              +{exercises.length - 4} esercizi registrati
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Nessun esercizio collegato.</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
