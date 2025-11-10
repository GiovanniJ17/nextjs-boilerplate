'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Clock3, Dumbbell, Gauge, Loader2, Sparkles, Target, Trophy, Weight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

type ExerciseResult = {
  id: string;
  time_s: number | null;
  weight_kg: number | null;
  rpe: number | null;
};

type Exercise = {
  id: string;
  name: string | null;
  discipline_type: string | null;
  distance_m: number | null;
  sets: number | null;
  repetitions: number | null;
  results: ExerciseResult[];
};

type Metric = {
  id: string;
  date: string | null;
  metric_name: string | null;
  category: string | null;
  metric_target: string | null;
  value: number | null;
  unit: string | null;
};

type TrainingSession = {
  id: string;
  date: string | null;
  type: string | null;
  exercises: Exercise[];
  metrics: Metric[];
};

const disciplineFilters = [
  { value: '', label: 'Tutte le discipline', icon: Sparkles },
  { value: 'sprint', label: 'Sprint', icon: Activity },
  { value: 'forza', label: 'Forza', icon: Dumbbell },
  { value: 'mobilità', label: 'Mobilità', icon: Clock3 },
  { value: 'tecnica', label: 'Tecnica', icon: Target },
];

const metricFilters = [
  { value: '', label: 'Tutte le metriche', icon: BarChart3 },
  { value: 'prestazione', label: 'Prestazione', icon: Trophy },
  { value: 'fisico', label: 'Fisico', icon: Weight },
  { value: 'recupero', label: 'Recupero', icon: Clock3 },
  { value: 'test', label: 'Test', icon: Gauge },
];

function FilterPill({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: typeof Activity;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition',
        active
          ? 'border-sky-500 bg-sky-50 text-sky-700'
          : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-600'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function StatistichePage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [disciplineFilter, setDisciplineFilter] = useState('');
  const [metricFilter, setMetricFilter] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data, error } = await supabase
        .from('training_sessions')
        .select(
          `id, date, type,
          exercises(id, name, discipline_type, distance_m, sets, repetitions, exercise_results(id, time_s, weight_kg, rpe)),
          metrics(id, date, metric_name, category, metric_target, value, unit)`
        )
        .order('date', { ascending: false });

      if (error) {
        notifyError();
        setLoading(false);
        return;
      }

      const mapped = (data ?? []).map(session => ({
        id: session.id,
        date: session.date,
        type: session.type,
        exercises: (session.exercises ?? []).map((exercise: any) => ({
          ...exercise,
          results: exercise.exercise_results ?? [],
        })),
        metrics: session.metrics ?? [],
      }));

      setSessions(mapped);
      setLoading(false);
    }

    loadData();
  }, []);

  const filteredExercises = useMemo(() => {
    return sessions.flatMap(session =>
      session.exercises.filter(exercise => (disciplineFilter ? exercise.discipline_type === disciplineFilter : true))
    );
  }, [sessions, disciplineFilter]);

  const filteredMetrics = useMemo(() => {
    return sessions.flatMap(session =>
      session.metrics.filter(metric => (metricFilter ? metric.category === metricFilter : true))
    );
  }, [sessions, metricFilter]);

  const summary = useMemo(() => {
    const totalSessions = sessions.length;
    const totalExercises = sessions.reduce((acc, session) => acc + session.exercises.length, 0);
    const totalMetrics = sessions.reduce((acc, session) => acc + session.metrics.length, 0);

    let totalDistance = 0;
    let totalVolume = 0;
    let totalRpe = 0;
    let rpeCount = 0;

    sessions.forEach(session => {
      session.exercises.forEach(exercise => {
        if (exercise.distance_m && exercise.sets && exercise.repetitions) {
          totalDistance += exercise.distance_m * exercise.sets * exercise.repetitions;
        }
        if (exercise.results) {
          exercise.results.forEach(result => {
            if (typeof result.weight_kg === 'number') {
              totalVolume += result.weight_kg;
            }
            if (typeof result.rpe === 'number') {
              totalRpe += result.rpe;
              rpeCount += 1;
            }
          });
        }
      });
    });

    return {
      totalSessions,
      totalExercises,
      totalMetrics,
      totalDistance,
      totalVolume,
      averageRpe: rpeCount > 0 ? totalRpe / rpeCount : null,
    };
  }, [sessions]);

  const highlightedMetrics = useMemo(() => {
    return filteredMetrics
      .slice()
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 6);
  }, [filteredMetrics]);

  const disciplineBreakdown = useMemo(() => {
    const counter = new Map<string, number>();
    sessions.forEach(session => {
      session.exercises.forEach(exercise => {
        const key = exercise.discipline_type ?? 'altro';
        counter.set(key, (counter.get(key) ?? 0) + 1);
      });
    });
    return Array.from(counter.entries()).sort((a, b) => b[1] - a[1]);
  }, [sessions]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Statistiche</h1>
        <p className="text-sm text-slate-500">
          Analizza l'andamento degli allenamenti, delle discipline e delle metriche per orientare la programmazione.
        </p>
      </header>

      <Card className="border-none bg-slate-900 text-white">
        <CardHeader>
          <CardTitle className="text-base">Indicatori principali</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-300">Sessioni registrate</p>
            <p className="text-2xl font-semibold">{summary.totalSessions}</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">Volume pesi totale</p>
            <p className="text-2xl font-semibold">{summary.totalVolume.toFixed(1)} kg</p>
          </div>
          <div>
            <p className="text-sm text-slate-300">RPE medio</p>
            <p className="text-2xl font-semibold">
              {summary.averageRpe ? summary.averageRpe.toFixed(1) : '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {disciplineFilters.map(option => (
              <FilterPill
                key={option.value}
                label={option.label}
                icon={option.icon}
                active={disciplineFilter === option.value}
                onClick={() => setDisciplineFilter(prev => (prev === option.value ? '' : option.value))}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {metricFilters.map(option => (
              <FilterPill
                key={option.value}
                label={option.label}
                icon={option.icon}
                active={metricFilter === option.value}
                onClick={() => setMetricFilter(prev => (prev === option.value ? '' : option.value))}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisi in corso...
            </div>
          )}

          {!loading && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 p-4">
                <h3 className="text-sm font-semibold text-slate-700">Dettagli discipline</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Visualizza solo gli esercizi per la disciplina selezionata per capire come distribuisci il lavoro.
                </p>
                <div className="mt-4 space-y-3">
                  {filteredExercises.length === 0 && (
                    <p className="text-sm text-slate-500">Nessun esercizio per i filtri selezionati.</p>
                  )}
                  {filteredExercises.slice(0, 6).map(exercise => (
                    <div key={exercise.id} className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-sm font-medium text-slate-700">{exercise.name ?? 'Esercizio'}</p>
                      <p className="text-xs text-slate-500">
                        {exercise.sets ?? '-'}x{exercise.repetitions ?? '-'} · {exercise.distance_m ?? 0} m ·
                        risultati {exercise.results.length}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 p-4">
                <h3 className="text-sm font-semibold text-slate-700">Metriche recenti</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Concentrati sulle ultime rilevazioni della categoria scelta.
                </p>
                <div className="mt-4 space-y-3">
                  {highlightedMetrics.length === 0 && (
                    <p className="text-sm text-slate-500">Nessuna metrica per i filtri selezionati.</p>
                  )}
                  {highlightedMetrics.map(metric => (
                    <div key={metric.id} className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-sm font-medium text-slate-700">{metric.metric_name ?? 'Metrica'}</p>
                      <p className="text-xs text-slate-500">
                        {metric.date ? new Date(metric.date).toLocaleDateString('it-IT') : 'Data non disponibile'} ·{' '}
                        {metric.metric_target ?? '—'}
                      </p>
                      <p className="text-sm font-semibold text-slate-800">
                        {metric.value !== null ? `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}` : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-800">Ripartizione discipline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {disciplineBreakdown.length === 0 && (
              <p className="text-sm text-slate-500">Ancora nessun esercizio registrato.</p>
            )}
            {disciplineBreakdown.map(([discipline, count]) => (
              <div key={discipline} className="flex items-center justify-between rounded-xl border border-slate-200/80 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">{discipline || 'Altro'}</span>
                <span className="text-sm text-slate-500">{count} esercizi</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function notifyError() {
  if (typeof window !== 'undefined') {
    import('sonner').then(module => module.toast.error('Impossibile caricare le statistiche.'));
  }
}
