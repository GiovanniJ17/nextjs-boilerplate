// app/storico/page.tsx
'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

type TrainingSession = {
  id: string;
  block_id: string | null;
  date: string;
  type: string | null;
  location: string | null;
  notes: string | null;
};

type TrainingBlock = {
  id: string;
  name: string;
};

type SessionWithExtra = TrainingSession & {
  blockName?: string | null;
  exerciseCount?: number;
};

export default function StoricoPage() {
  const [sessions, setSessions] = useState<SessionWithExtra[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadSessions();
  }, []);

  async function loadSessions() {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('training_sessions')
        .select('*')
        .order('date', { ascending: false })
        .limit(50);

      if (sessionsError) throw sessionsError;

      const sessions = (sessionsData ?? []) as TrainingSession[];
      if (sessions.length === 0) {
        setSessions([]);
        return;
      }

      const blockIds = Array.from(
        new Set(
          sessions
            .map((s) => s.block_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      let blocksById: Record<string, TrainingBlock> = {};
      if (blockIds.length > 0) {
        const { data: blocksData, error: blocksError } = await supabase
          .from('training_blocks')
          .select('id, name')
          .in('id', blockIds);

        if (blocksError) throw blocksError;
        (blocksData ?? []).forEach((b) => {
          blocksById[b.id] = b as TrainingBlock;
        });
      }

      const sessionIds = sessions.map((s) => s.id);
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('exercises')
        .select('id, session_id')
        .in('session_id', sessionIds);

      if (exercisesError) throw exercisesError;

      const exerciseCountBySession: Record<string, number> = {};
      (exercisesData ?? []).forEach((ex: any) => {
        if (!exerciseCountBySession[ex.session_id]) {
          exerciseCountBySession[ex.session_id] = 0;
        }
        exerciseCountBySession[ex.session_id]++;
      });

      const enriched: SessionWithExtra[] = sessions.map((s) => ({
        ...s,
        blockName: s.block_id ? blocksById[s.block_id]?.name ?? null : null,
        exerciseCount: exerciseCountBySession[s.id] ?? 0,
      }));

      setSessions(enriched);
    } catch (err: any) {
      console.error(err);
      setError('Errore nel caricamento dello storico delle sessioni.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          Storico sessioni
        </h1>
        <button
          type="button"
          onClick={() => loadSessions()}
          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          Aggiorna
        </button>
      </div>

      {loading && (
        <p className="text-sm text-slate-300">Caricamento in corso...</p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && sessions.length === 0 && !error && (
        <p className="text-sm text-slate-300">
          Non ci sono ancora sessioni registrate.
        </p>
      )}

      <div className="space-y-3">
        {sessions.map((s) => (
          <article
            key={s.id}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-50">
                  {formatDate(s.date)}{' '}
                  {s.type && (
                    <span className="text-slate-300">· {s.type}</span>
                  )}
                </p>
                {s.blockName && (
                  <p className="text-[11px] text-sky-300">{s.blockName}</p>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                {s.exerciseCount ?? 0} esercizi
              </div>
            </div>

            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <InfoRow label="Luogo" value={s.location} />
              <InfoRow label="Note" value={s.notes} className="md:col-span-2" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

type InfoRowProps = {
  label: string;
  value: string | null;
  className?: string;
};

function InfoRow({ label, value, className }: InfoRowProps) {
  if (!value) return null;
  return (
    <p
      className={['text-[11px] text-slate-300', className]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="font-semibold text-slate-200">{label}: </span>
      {value}
    </p>
  );
}

function formatDate(value: string) {
  try {
    const d = new Date(value);
    return d.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return value;
  }
}
