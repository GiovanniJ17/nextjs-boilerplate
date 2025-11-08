"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { CalendarDays, Cloud, NotebookPen, Dumbbell, Flame } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RegistroPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: "",
    type: "",
    weather: "",
    rpe: "",
    notes: "",
    series: "",
    isolated: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("training_sessions").insert([
      {
        date: form.date,
        type: form.type,
        location: form.weather,
        notes: form.notes,
        rpe: form.rpe,
      },
    ]);

    setLoading(false);
    if (error) alert("❌ Errore: " + error.message);
    else {
      alert("✅ Sessione salvata!");
      setForm({ date: "", type: "", weather: "", rpe: "", notes: "", series: "", isolated: "" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mt-8">
      <h1 className="text-2xl md:text-3xl font-semibold text-blue-600 text-center mb-8 flex items-center justify-center gap-2">
        <NotebookPen className="w-7 h-7 text-blue-600" />
        Registra Allenamento
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SEZIONE BASE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
              <CalendarDays className="w-4 h-4 text-blue-500" /> Data
            </label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
              <Flame className="w-4 h-4 text-orange-500" /> Tipo
            </label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
              required
            >
              <option value="">Seleziona tipo...</option>
              <option value="velocità">Velocità</option>
              <option value="resistenza">Resistenza</option>
              <option value="forza">Forza</option>
              <option value="scarico">Scarico</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
              <Cloud className="w-4 h-4 text-sky-500" /> Meteo
            </label>
            <input
              type="text"
              name="weather"
              placeholder="Soleggiato, vento, pioggia..."
              value={form.weather}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* RPE */}
        <div>
          <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
            🔥 RPE (1–10)
          </label>
          <div className="flex gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setForm({ ...form, rpe: String(i + 1) })}
                className={`w-8 h-8 flex items-center justify-center rounded-full border text-sm transition ${
                  form.rpe === String(i + 1)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 hover:bg-gray-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* NOTE */}
        <div>
          <label className="flex items-center gap-2 text-gray-700 font-medium mb-1">
            🗒️ Note
          </label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Descrivi dettagli, sensazioni, variazioni..."
            value={form.notes}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
          ></textarea>
        </div>

        {/* SERIE & LAVORI ISOLATI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="flex items-center gap-2 font-semibold text-blue-600 mb-3">
              <Dumbbell className="w-5 h-5" /> Serie e Ripetizioni
            </h3>
            <input
              type="text"
              name="series"
              placeholder="Es. 4x30m, 3x120m..."
              value={form.series}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <h3 className="flex items-center gap-2 font-semibold text-orange-600 mb-3">
              🧩 Lavori Isolati
            </h3>
            <input
              type="text"
              name="isolated"
              placeholder="Es. partenze dai blocchi, squat..."
              value={form.isolated}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* SUBMIT */}
        <div className="pt-4 text-center">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-all w-full md:w-auto"
          >
            {loading ? "Salvataggio..." : "💾 Salva Allenamento"}
          </button>
        </div>
      </form>
    </div>
  );
}
