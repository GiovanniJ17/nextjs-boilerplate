'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InserimentoSessione() {
  const [form, setForm] = useState({ data: '', tipo: '', durata: '', note: '' })
  const [status, setStatus] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('Invio in corso...')

    const { error } = await supabase.from('sessioni').insert([form])
    if (error) {
      console.error(error)
      setStatus('Errore durante il salvataggio ❌')
    } else {
      setStatus('Sessione salvata ✅')
      setForm({ data: '', tipo: '', durata: '', note: '' })
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-semibold text-center mb-4">Inserisci Sessione</h1>

        <input
          name="data"
          type="date"
          value={form.data}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded"
        />
        <input
          name="tipo"
          placeholder="Tipo di sessione"
          value={form.tipo}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded"
        />
        <input
          name="durata"
          placeholder="Durata (minuti)"
          type="number"
          value={form.durata}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded"
        />
        <textarea
          name="note"
          placeholder="Note opzionali"
          value={form.note}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Salva sessione
        </button>

        {status && <p className="text-center text-sm text-gray-600">{status}</p>}
      </form>
    </main>
  )
}
