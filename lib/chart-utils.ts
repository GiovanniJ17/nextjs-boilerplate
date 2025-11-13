import { useState } from "react";

// Hook per gestire drill-down nei grafici
export function useChartDrillDown<T>() {
  const [drillDownData, setDrillDownData] = useState<T[] | null>(null);
  const [drillDownTitle, setDrillDownTitle] = useState<string>("");

  const handleDrillDown = (data: T[], title: string) => {
    setDrillDownData(data);
    setDrillDownTitle(title);
  };

  const resetDrillDown = () => {
    setDrillDownData(null);
    setDrillDownTitle("");
  };

  return {
    drillDownData,
    drillDownTitle,
    isDrilledDown: drillDownData !== null,
    handleDrillDown,
    resetDrillDown,
  };
}

// Funzione per aggregare dati per drill-down
export function aggregateByPeriod(
  sessions: any[],
  period: "week" | "month" | "year"
) {
  const grouped = sessions.reduce((acc: any, session) => {
    const date = new Date(session.data);
    let key: string;

    switch (period) {
      case "week":
        const week = getWeekNumber(date);
        key = `${date.getFullYear()}-W${week}`;
        break;
      case "month":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        break;
      case "year":
        key = `${date.getFullYear()}`;
        break;
    }

    if (!acc[key]) {
      acc[key] = {
        period: key,
        sessions: [],
        count: 0,
        totalVolume: 0,
        totalDistance: 0,
        avgIntensity: 0,
      };
    }

    acc[key].sessions.push(session);
    acc[key].count += 1;
    acc[key].totalVolume += session.volume_totale || 0;
    acc[key].totalDistance += session.distanza_totale || 0;
    acc[key].avgIntensity += session.intensita || 0;

    return acc;
  }, {});

  // Calcola medie
  Object.values(grouped).forEach((group: any) => {
    group.avgIntensity = Math.round(group.avgIntensity / group.count);
  });

  return Object.values(grouped);
}

// Helper per numero settimana
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Formattatori custom per tooltips
export const formatters = {
  distance: (value: number) => `${value.toLocaleString()} m`,
  volume: (value: number) => `${value.toLocaleString()} m`,
  intensity: (value: number) => `${value}%`,
  count: (value: number) => `${value} sessioni`,
  rpe: (value: number) => `${value}/10`,
  duration: (value: number) => `${value} min`,
};

// Colori per grafici (palette consistente)
export const chartColors = {
  primary: "#0ea5e9", // sky-500
  secondary: "#06b6d4", // cyan-500
  success: "#22c55e", // green-500
  warning: "#f59e0b", // amber-500
  danger: "#ef4444", // red-500
  purple: "#a855f7", // purple-500
  pink: "#ec4899", // pink-500
  slate: "#64748b", // slate-500
};

// Palette per tipi di allenamento
export const trainingTypeColors: Record<string, string> = {
  velocità: chartColors.danger,
  resistenza: chartColors.primary,
  tecnica: chartColors.success,
  forza: chartColors.purple,
  recupero: chartColors.slate,
  "test/gara": chartColors.warning,
};
