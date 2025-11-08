"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TrainingSession = {
  id: string;
  date: string | null;
  type: string | null;
  location: string | null;
  notes: string | null;
};

export default function StoricoPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadSessions() {
    setLoading(true);

    let query = supabase
      .from("training_sessions")
      .select("*")
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

    const { data, error } = await query;

    if (!error && data) {
      setSessions(data as TrainingSession[]);
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
    loadSessions();
  }

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-800">
        <span className="text-3xl">📚</span>
        <span>Storico Allenamenti</span>
      </h1>

      {/* Card filtri */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span>🔎</span>
            <span>Filtri di ricerca</span>
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
                Tipo
              </label>
              <input
                type="text"
                placeholder="Filtra per tipo..."
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-sky-100 transition focus:bg-white focus:ring"
              />
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
              onClick={loadSessions}
              className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
            >
              Applica filtri
            </button>
          </div>
        </div>
      </div>

      {/* Card risultati */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="px-6 py-4">
          {loading ? (
            <p className="text-sm text-slate-500">Caricamento allenamenti…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nessun allenamento trovato 📭
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <li key={s.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {s.type || "Allenamento"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {s.date || "Data non impostata"}
                        {s.location ? ` • ${s.location}` : ""}
                      </p>
                    </div>
                    {s.notes && (
                      <p className="max-w-xl text-xs text-slate-600">
                        {s.notes.length > 160
                          ? s.notes.slice(0, 160) + "…"
                          : s.notes}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
