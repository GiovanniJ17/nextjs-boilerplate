/**
 * Mappa delle icone per discipline e tipi di esercizio
 */

import {
  Zap,
  Timer,
  Gauge,
  Target,
  Activity,
  TrendingUp,
  Award,
  Calendar,
  BarChart3,
  FolderKanban,
  Play,
  Clock,
  Flame,
  Heart,
  Medal,
  Repeat,
} from "lucide-react";

// Icone per discipline
export const disciplineIcons = {
  sprint: Zap,
  resistenza: Timer,
  potenza: Gauge,
  tecnica: Target,
  generale: Activity,
} as const;

// Icone per sezioni
export const sectionIcons = {
  registro: Play,
  storico: Calendar,
  statistiche: BarChart3,
  blocco: FolderKanban,
  performance: TrendingUp,
  award: Award,
} as const;

// Icone per metriche
export const metricIcons = {
  time: Clock,
  intensity: Flame,
  heartRate: Heart,
  distance: Medal,
  repetitions: Repeat,
} as const;

// Helper per ottenere l'icona della disciplina
export function getDisciplineIcon(discipline?: string) {
  if (!discipline) return Activity;
  const key = discipline.toLowerCase() as keyof typeof disciplineIcons;
  return disciplineIcons[key] || Activity;
}
