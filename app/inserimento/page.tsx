"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RegistroPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    data: "",
    tipologia: "",
    meteo: "",
    rpe: "",
    note: "",
    serie: "",
    isolati: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("sessioni").insert([form]);
    setLoading(false);

    if (error) alert("Errore durante l’inserimento: " + error.message);
    else {
      alert("✅ Sessione registrata con successo!");
      setForm({
        data: "",
        tipologia: "",
        meteo: "",
        rpe: "",
        note: "",
        serie: "",
        isolati: "",
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white shadow-md rounded-2xl p-8 border border-gray-100">
      <h2 className="text-2xl font-semibold text-blue-600 mb-6 text-center">
        📝 Inserisci una nuova sessione
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* RIGA 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              name="data"
              value={form.data}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipologia</label>
            <select
              name="tipologia"
              value={form.tipologia}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300"
              required
            >
              <option value="">Seleziona...</option>
              <option value="velocità">Velocità</option>
              <option value="resistenza">Resistenza</option>
              <option value="forza">Forza</option>
              <option value="scarico">Scarico</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meteo</label>
            <input
              type="text"
              name="meteo"
              placeholder="Es. soleggiato, vento..."
              value={form.meteo}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        {/* RIGA 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RPE (sforzo 1–10)</label>
            <input
              type="number"
              name="rpe"
              min="1"
              max="10"
              value={form.rpe}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Serie / Lavoro</label>
            <input
              type="text"
              name="serie"
              placeholder="Es. 5x60m, 3x150m..."
              value={form.serie}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        {/* RIGA 3 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Esercizi isolati</label>
          <input
            type="text"
            name="isolati"
            placeholder="Es. squat, partenze dai blocchi..."
            value={form.isolati}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {/* NOTE */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
          <textarea
            name="note"
            rows={3}
            placeholder="Annotazioni aggiuntive..."
            value={form.note}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300"
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-all font-medium"
        >
          {loading ? "Salvataggio..." : "Salva Sessione"}
        </button>
      </form>
    </div>
  );
}
