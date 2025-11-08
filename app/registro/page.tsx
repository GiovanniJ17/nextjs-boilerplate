"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

const SESSION_TYPES = [
  "Velocità",
  "Resistenza",
  "Potenziamento",
  "Tecnica",
  "Recupero",
  "Altro",
];

const WEATHER_OPTIONS = [
  "Soleggiato",
  "Nuvoloso",
  "Pioggia",
  "Vento forte",
  "Freddo",
  "Caldo intenso",
];

export default function RegistroPage() {
  const [date, setDate] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [weather, setWeather] = useState("");
  const [rpe, setRpe] = useState<number | null>(null);
  const [generalNotes, setGeneralNotes] = useState("");
  const [mainWork, setMainWork] = useState("");
  const [accessoryWork, setAccessoryWork] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setIsSaving(true);

    try {
      // Costruisco un campo notes "ricco" ma comunque compatibile (text)
      const combinedNotes = [
        generalNotes && `Note generali:\n${generalNotes}`,
        mainWork && `Serie e ripetizioni:\n${mainWork}`,
        accessoryWork && `Lavori isolati:\n${accessoryWork}`,
        weather && `Meteo: ${weather}`,
        rpe && `RPE sessione: ${rpe}/10`,
      ]
        .filter(Boolean)
        .join("\n\n");

      // 1) Inserisco la sessione di allenamento
      const { error: sessionError } = await supabase
        .from("training_sessions")
        .insert([
          {
            // block_id può essere gestito in futuro (es. scegliendo il blocco),
            // per ora lo lasciamo null se il DB lo permette
            date: date || null,
            type: type || null,
            location: location || null,
            notes: combinedNotes || null,
          },
        ]);

      if (sessionError) {
        throw sessionError;
      }

      // 2) Salvo l'RPE come metrica separata (tabella metrics)
      if (rpe !== null) {
        await supabase.from("metrics").insert([
          {
            date: date || null,
            metric_name: "RPE",
            value: rpe,
            unit: "1-10",
            notes: type ? `Sessione: ${type}` : null,
          },
        ]);
      }

      setFeedback({
        type: "success",
        message: "Sessione salvata con successo ✅",
      });

      // reset form
      setType("");
      setLocation("");
      setWeather("");
      setRpe(null);
      setGeneralNotes("");
      setMainWork("");
      setAccessoryWork("");
    } catch (err: any) {
      setFeedback({
        type: "error",
        message:
          err?.message || "Si è verificato un errore durante il salvataggio.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header pagina */}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-800">
          <span className="text-3xl">📋</span>
          <span>Registra Allenamento</span>
        </h1>
      </div>

      {/* Card principale */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6 sm:p-8"
          autoComplete="off"
        >
          {/* Riga 1: data, tipo, meteo */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-sky-100 transition focus:bg-white focus:ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-sky-100 transition focus:bg-white focus:ring"
              >
                <option value="">Seleziona tipo...</option>
                {SESSION_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Meteo
              </label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-sky-100 transition focus:bg-white focus:ring"
              >
                <option value="">Seleziona meteo...</option>
                {WEATHER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Riga 2: luogo + RPE */}
          <div className="grid gap-4 md:grid-cols-[2fr,3fr]">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Luogo
              </label>
              <input
                type="text"
                placeholder="Es. pista, palestra, strada..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-sky-100 transition focus:bg-white focus:ring"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  RPE (1–10)
                </label>
                {rpe !== null && (
                  <span className="text-xs font-medium text-sky-700">
                    Intensità: {rpe}/10
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setRpe(n)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition",
                      rpe === n
                        ? "border-sky-500 bg-sky-500 text-white shadow-sm"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Note generali */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Note</label>
            <textarea
              rows={3}
              placeholder="Descrivi sensazioni, variabili, obiettivi della seduta..."
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-sky-100 transition focus:bg-white focus:ring"
            />
          </div>

          {/* Card Serie e Ripetizioni */}
          <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-sky-800">
                <span>⚡</span>
                <span>Serie e Ripetizioni</span>
              </h2>
            </div>
            <textarea
              rows={3}
              placeholder="Es. 5×60m, 3×150m, partenze dai blocchi..."
              value={mainWork}
              onChange={(e) => setMainWork(e.target.value)}
              className="w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm outline-none ring-sky-200/70 transition focus:ring"
            />
          </div>

          {/* Card Lavori isolati */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 sm:p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <span>🔥</span>
                <span>Lavori isolati</span>
              </h2>
            </div>
            <textarea
              rows={3}
              placeholder="Es. squat, core, esercizi tecnici..."
              value={accessoryWork}
              onChange={(e) => setAccessoryWork(e.target.value)}
              className="w-full rounded-lg border border-amber-100 bg-white px-3 py-2 text-sm outline-none ring-amber-200/70 transition focus:ring"
            />
          </div>

          {/* Feedback + bottone */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            {feedback && (
              <div
                className={cn(
                  "rounded-xl px-3 py-2 text-sm",
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-rose-50 text-rose-700 border border-rose-100"
                )}
              >
                {feedback.message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Salvataggio..." : "Salva Allenamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
