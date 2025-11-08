'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function RegistroPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: '',
    type: '',
    meteo: '',
    location: '',
    rpe: 5,
    notes: '',
    exercises: '',
    isolated: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.date || !form.type) {
      toast.error('Inserisci almeno data e tipo allenamento');
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Inserisci sessione
      const { data: session, error: sessionErr } = await supabase
        .from('training_sessions')
        .insert([
          {
            date: form.date,
            type: form.type,
            location: form.location,
            notes: form.notes,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (sessionErr) throw sessionErr;

      // 2️⃣ Inserisci esercizi (serie e lavori isolati)
      const allExercises = [
        { name: 'Serie principali', notes: form.exercises },
        { name: 'Lavori isolati', notes: form.isolated },
      ].filter(e => e.notes.trim() !== '');

      for (const ex of allExercises) {
        const { error: exErr } = await supabase.from('exercises').insert([
          {
            session_id: session.id,
            name: ex.name,
            notes: ex.notes,
            created_at: new Date().toISOString(),
          },
        ]);
        if (exErr) throw exErr;
      }

      toast.success('Allenamento salvato con successo!');
      setForm({
        date: '',
        type: '',
        meteo: '',
        location: '',
        rpe: 5,
        notes: '',
        exercises: '',
        isolated: '',
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        📝 Registra Allenamento
      </h1>

      <Card className="shadow-sm">
        <CardContent className="space-y-6 p-6">
          {/* Data / Tipo / Meteo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" name="date" value={form.date} onChange={handleChange} />
            </div>

            <div>
              <Label>Tipo</Label>
              <select name="type" value={form.type} onChange={handleChange} className="w-full border rounded-md p-2">
                <option value="">Seleziona tipo...</option>
                <option value="test">Test</option>
                <option value="palestra">Palestra</option>
                <option value="velocità">Velocità</option>
                <option value="resistenza">Resistenza</option>
              </select>
            </div>

            <div>
              <Label>Meteo</Label>
              <select name="meteo" value={form.meteo} onChange={handleChange} className="w-full border rounded-md p-2">
                <option value="">Seleziona meteo...</option>
                <option value="soleggiato">Soleggiato</option>
                <option value="nuvoloso">Nuvoloso</option>
                <option value="pioggia">Pioggia</option>
              </select>
            </div>
          </div>

          {/* Luogo */}
          <div>
            <Label>Luogo</Label>
            <Input name="location" placeholder="Es. pista, palestra, strada..." value={form.location} onChange={handleChange} />
          </div>

          {/* Note */}
          <div>
            <Label>Note</Label>
            <Textarea
              name="notes"
              placeholder="Descrivi sensazioni, variabili, obiettivi della seduta..."
              value={form.notes}
              onChange={handleChange}
            />
          </div>

          {/* Serie principali */}
          <Card className="bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800 flex items-center gap-2">⚡ Serie e Ripetizioni</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                name="exercises"
                placeholder="Es. 5x60m, 3x150m, partenze dai blocchi..."
                value={form.exercises}
                onChange={handleChange}
              />
            </CardContent>
          </Card>

          {/* Lavori isolati */}
          <Card className="bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-800 flex items-center gap-2">🔥 Lavori isolati</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                name="isolated"
                placeholder="Es. squat, core, esercizi tecnici..."
                value={form.isolated}
                onChange={handleChange}
              />
            </CardContent>
          </Card>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : 'Salva Allenamento'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
