/**
 * Advanced Statistics Calculator
 * Funzioni per calcoli statistici avanzati per analisi performance atleti
 */

export type RPEDistributionItem = {
  rpe: number;
  count: number;
  percentage: number;
};

export type PersonalBest = {
  distance: number;
  time: number;
  date: string;
  improvement: number | null;
  sessionType: string | null;
};

export type RecoveryAnalysis = {
  avgRecoveryBetweenReps: number | null;
  avgRecoveryBetweenSets: number | null;
  optimalRange: { min: number; max: number } | null;
  outliers: { session: string; value: number }[];
};

export type TrainingLoadItem = {
  date: string;
  load: number;
  acuteLoad: number;
  chronicLoad: number;
  ratio: number;
};

export type LocationStat = {
  location: string;
  sessions: number;
  avgPerformance: number | null;
  bestPerformance: number | null;
};

export type PhaseStat = {
  phase: string;
  sessions: number;
  volume: number;
  avgIntensity: number | null;
};

export type MonthlyProgress = {
  month: string;
  sessions: number;
  distance: number;
  avgSpeed: number | null;
  pbs: number;
};

export type PerformanceTrend = {
  distance: number;
  trend: 'improving' | 'stable' | 'declining';
  changePercentage: number;
  recentAvg: number;
  previousAvg: number;
};

export type SmartInsight = {
  category: 'performance' | 'recovery' | 'volume' | 'intensity' | 'health';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
};

/**
 * Calcola la distribuzione degli RPE
 */
export function calculateRPEDistribution(rpeValues: number[]): RPEDistributionItem[] {
  if (rpeValues.length === 0) return [];

  const counts = new Map<number, number>();
  rpeValues.forEach(rpe => {
    const rounded = Math.round(rpe);
    counts.set(rounded, (counts.get(rounded) || 0) + 1);
  });

  const total = rpeValues.length;
  return Array.from(counts.entries())
    .map(([rpe, count]) => ({
      rpe,
      count,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => a.rpe - b.rpe);
}

/**
 * Analizza i recuperi tra ripetizioni e serie
 */
export function analyzeRecovery(
  recoveryData: { sessionId: string; value: number; type: 'rep' | 'set' }[]
): RecoveryAnalysis {
  const repRecoveries = recoveryData.filter(d => d.type === 'rep').map(d => d.value);
  const setRecoveries = recoveryData.filter(d => d.type === 'set').map(d => d.value);

  const avgRepRecovery = repRecoveries.length > 0
    ? repRecoveries.reduce((sum, val) => sum + val, 0) / repRecoveries.length
    : null;

  const avgSetRecovery = setRecoveries.length > 0
    ? setRecoveries.reduce((sum, val) => sum + val, 0) / setRecoveries.length
    : null;

  // Calcola range ottimale (media ± 20%)
  let optimalRange = null;
  if (avgRepRecovery != null) {
    optimalRange = {
      min: Math.round(avgRepRecovery * 0.8),
      max: Math.round(avgRepRecovery * 1.2),
    };
  }

  // Trova outliers (oltre ±30% dalla media)
  const outliers: { session: string; value: number }[] = [];
  if (avgRepRecovery != null) {
    recoveryData
      .filter(d => d.type === 'rep')
      .forEach(d => {
        const deviation = Math.abs((d.value - avgRepRecovery!) / avgRepRecovery!);
        if (deviation > 0.3) {
          outliers.push({ session: d.sessionId, value: d.value });
        }
      });
  }

  return {
    avgRecoveryBetweenReps: avgRepRecovery,
    avgRecoveryBetweenSets: avgSetRecovery,
    optimalRange,
    outliers,
  };
}

/**
 * Calcola Personal Bests per distanza
 */
export function calculatePersonalBests(
  performances: { distance: number; time: number; date: string; sessionType: string | null }[]
): PersonalBest[] {
  const pbMap = new Map<number, PersonalBest>();

  // Ordina per data
  const sorted = [...performances].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sorted.forEach(perf => {
    const existing = pbMap.get(perf.distance);
    
    if (!existing || perf.time < existing.time) {
      const improvement = existing ? ((existing.time - perf.time) / existing.time) * 100 : null;
      pbMap.set(perf.distance, {
        distance: perf.distance,
        time: perf.time,
        date: perf.date,
        improvement,
        sessionType: perf.sessionType,
      });
    }
  });

  return Array.from(pbMap.values()).sort((a, b) => a.distance - b.distance);
}

/**
 * Calcola Training Load con metodo Acute:Chronic Workload Ratio
 */
export function calculateTrainingLoad(
  sessions: { date: string; volume: number; intensity: number }[]
): TrainingLoadItem[] {
  if (sessions.length === 0) return [];

  // Ordina per data
  const sorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return sorted.map((session, index) => {
    const load = session.volume * (session.intensity / 10); // Load = Volume × Intensità normalizzata

    // Acute Load: media ultimi 7 giorni
    const acuteWindow = sorted.slice(Math.max(0, index - 6), index + 1);
    const acuteLoad = acuteWindow.reduce((sum, s) => sum + s.volume * (s.intensity / 10), 0) / acuteWindow.length;

    // Chronic Load: media ultimi 28 giorni
    const chronicWindow = sorted.slice(Math.max(0, index - 27), index + 1);
    const chronicLoad = chronicWindow.reduce((sum, s) => sum + s.volume * (s.intensity / 10), 0) / chronicWindow.length;

    // Acute:Chronic Ratio
    const ratio = chronicLoad > 0 ? acuteLoad / chronicLoad : 1;

    return {
      date: session.date,
      load,
      acuteLoad,
      chronicLoad,
      ratio,
    };
  });
}

/**
 * Analizza performance per location
 */
export function analyzeLocationStats(
  data: { location: string; sessionId: string; avgTime: number | null }[]
): LocationStat[] {
  const locationMap = new Map<string, { times: number[]; sessions: Set<string> }>();

  data.forEach(item => {
    if (!locationMap.has(item.location)) {
      locationMap.set(item.location, { times: [], sessions: new Set() });
    }
    const entry = locationMap.get(item.location)!;
    entry.sessions.add(item.sessionId);
    if (item.avgTime != null) {
      entry.times.push(item.avgTime);
    }
  });

  return Array.from(locationMap.entries()).map(([location, data]) => ({
    location,
    sessions: data.sessions.size,
    avgPerformance: data.times.length > 0
      ? data.times.reduce((sum, t) => sum + t, 0) / data.times.length
      : null,
    bestPerformance: data.times.length > 0 ? Math.min(...data.times) : null,
  }));
}

/**
 * Calcola progresso mensile
 */
export function calculateMonthlyProgress(
  sessions: { date: string; distance: number; avgSpeed: number | null; isPB: boolean }[]
): MonthlyProgress[] {
  const monthMap = new Map<string, { sessions: number; distance: number; speeds: number[]; pbs: number }>();

  sessions.forEach(session => {
    const month = session.date.substring(0, 7); // YYYY-MM
    if (!monthMap.has(month)) {
      monthMap.set(month, { sessions: 0, distance: 0, speeds: [], pbs: 0 });
    }
    const entry = monthMap.get(month)!;
    entry.sessions++;
    entry.distance += session.distance;
    if (session.avgSpeed != null) {
      entry.speeds.push(session.avgSpeed);
    }
    if (session.isPB) {
      entry.pbs++;
    }
  });

  return Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      sessions: data.sessions,
      distance: data.distance,
      avgSpeed: data.speeds.length > 0
        ? data.speeds.reduce((sum, s) => sum + s, 0) / data.speeds.length
        : null,
      pbs: data.pbs,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Analizza trend performance per distanza
 */
export function analyzePerformanceTrends(
  performances: { distance: number; time: number; date: string }[],
  recentDays: number = 30
): PerformanceTrend[] {
  const distanceMap = new Map<number, { recent: number[]; previous: number[] }>();

  const now = new Date();
  const recentCutoff = new Date(now.getTime() - recentDays * 24 * 60 * 60 * 1000);
  const previousCutoff = new Date(recentCutoff.getTime() - recentDays * 24 * 60 * 60 * 1000);

  performances.forEach(perf => {
    const perfDate = new Date(perf.date);
    if (!distanceMap.has(perf.distance)) {
      distanceMap.set(perf.distance, { recent: [], previous: [] });
    }
    const entry = distanceMap.get(perf.distance)!;

    if (perfDate >= recentCutoff) {
      entry.recent.push(perf.time);
    } else if (perfDate >= previousCutoff) {
      entry.previous.push(perf.time);
    }
  });

  return Array.from(distanceMap.entries())
    .filter(([_, data]) => data.recent.length > 0 && data.previous.length > 0)
    .map(([distance, data]) => {
      const recentAvg = data.recent.reduce((sum, t) => sum + t, 0) / data.recent.length;
      const previousAvg = data.previous.reduce((sum, t) => sum + t, 0) / data.previous.length;
      const changePercentage = ((recentAvg - previousAvg) / previousAvg) * 100;

      let trend: 'improving' | 'stable' | 'declining';
      if (changePercentage < -2) trend = 'improving'; // Tempo minore = miglioramento
      else if (changePercentage > 2) trend = 'declining';
      else trend = 'stable';

      return {
        distance,
        trend,
        changePercentage,
        recentAvg,
        previousAvg,
      };
    })
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Genera insights intelligenti basati sui dati
 */
export function generateSmartInsights(data: {
  trainingLoad: TrainingLoadItem[];
  rpeDistribution: RPEDistributionItem[];
  avgRPE: number | null;
  performanceTrends: PerformanceTrend[];
  recoveryAnalysis: RecoveryAnalysis;
  totalSessions: number;
  recentDays: number;
}): SmartInsight[] {
  const insights: SmartInsight[] = [];

  // Check sovrallenamento (Acute:Chronic > 1.5)
  const recentLoad = data.trainingLoad.slice(-7);
  const highRatios = recentLoad.filter(item => item.ratio > 1.5).length;
  if (highRatios >= 3) {
    insights.push({
      category: 'health',
      severity: 'high',
      title: 'Rischio Sovrallenamento',
      description: `Il rapporto carico acuto/cronico è elevato negli ultimi ${highRatios} allenamenti.`,
      recommendation: 'Considera di ridurre il volume o l\'intensità nei prossimi allenamenti per permettere un recupero adeguato.',
    });
  }

  // Check RPE troppo alto costantemente
  const highRPESessions = data.rpeDistribution.filter(item => item.rpe >= 8).reduce((sum, item) => sum + item.count, 0);
  const highRPEPercentage = data.totalSessions > 0 ? (highRPESessions / data.totalSessions) * 100 : 0;
  if (highRPEPercentage > 40) {
    insights.push({
      category: 'intensity',
      severity: 'medium',
      title: 'Intensità Elevata Frequente',
      description: `Il ${highRPEPercentage.toFixed(0)}% delle sessioni ha RPE ≥ 8.`,
      recommendation: 'Bilancia gli allenamenti ad alta intensità con sessioni di recupero attivo per ottimizzare i progressi.',
    });
  }

  // Check miglioramenti
  const improving = data.performanceTrends.filter(t => t.trend === 'improving');
  if (improving.length > 0) {
    insights.push({
      category: 'performance',
      severity: 'low',
      title: 'Progressi Evidenti',
      description: `Miglioramenti riscontrati su ${improving.length} distanze monitorate.`,
      recommendation: 'Ottimo lavoro! Mantieni la consistenza nell\'allenamento per consolidare questi progressi.',
    });
  }

  // Check performance in declino
  const declining = data.performanceTrends.filter(t => t.trend === 'declining');
  if (declining.length >= 2) {
    insights.push({
      category: 'performance',
      severity: 'medium',
      title: 'Performance in Calo',
      description: `Rilevato calo prestazionale su ${declining.length} distanze.`,
      recommendation: 'Valuta la qualità del recupero e considera un periodo di scarico per permettere supercompensazione.',
    });
  }

  // Check recuperi
  if (data.recoveryAnalysis.outliers.length > 5) {
    insights.push({
      category: 'recovery',
      severity: 'medium',
      title: 'Recuperi Irregolari',
      description: `${data.recoveryAnalysis.outliers.length} recuperi anomali rilevati.`,
      recommendation: 'Standardizza i tempi di recupero tra ripetizioni per garantire consistenza e comparabilità dei risultati.',
    });
  }

  // Check volume basso
  const avgSessionsPerWeek = data.totalSessions / (data.recentDays / 7);
  if (avgSessionsPerWeek < 2) {
    insights.push({
      category: 'volume',
      severity: 'low',
      title: 'Frequenza Allenamento Bassa',
      description: `Media di ${avgSessionsPerWeek.toFixed(1)} sessioni a settimana.`,
      recommendation: 'Considera di aumentare la frequenza degli allenamenti per migliorare la continuità e i progressi.',
    });
  }

  return insights.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Formatta velocità in m/s a ritmo per 100m
 */
export function formatPace(metersPerSecond: number): string {
  const secondsPer100m = 100 / metersPerSecond;
  return `${secondsPer100m.toFixed(2)}s/100m`;
}

/**
 * Calcola statistiche fase allenamento
 */
export function calculatePhaseStats(
  sessions: { phase: string | null; distance: number; intensity: number | null }[]
): PhaseStat[] {
  const phaseMap = new Map<string, { sessions: number; volume: number; intensities: number[] }>();

  sessions.forEach(session => {
    const phase = session.phase || 'Non specificato';
    if (!phaseMap.has(phase)) {
      phaseMap.set(phase, { sessions: 0, volume: 0, intensities: [] });
    }
    const entry = phaseMap.get(phase)!;
    entry.sessions++;
    entry.volume += session.distance;
    if (session.intensity != null) {
      entry.intensities.push(session.intensity);
    }
  });

  return Array.from(phaseMap.entries()).map(([phase, data]) => ({
    phase,
    sessions: data.sessions,
    volume: data.volume,
    avgIntensity: data.intensities.length > 0
      ? data.intensities.reduce((sum, i) => sum + i, 0) / data.intensities.length
      : null,
  }));
}
