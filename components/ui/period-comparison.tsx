/**
 * Period Comparison Component
 * Confronta statistiche tra due periodi diversi
 */

'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';

interface PeriodData {
  label: string;
  sessions: number;
  distance: number;
  avgRPE?: number;
  avgSpeed?: number;
  pbs?: number;
  exercises?: number;
}

interface PeriodComparisonProps {
  period1: PeriodData;
  period2: PeriodData;
  className?: string;
}

export function PeriodComparison({ period1, period2, className }: PeriodComparisonProps) {
  const comparisons = useMemo(() => {
    return [
      {
        label: 'Sessioni',
        value1: period1.sessions,
        value2: period2.sessions,
        format: (v: number) => v.toString(),
        icon: '📅',
      },
      {
        label: 'Distanza (m)',
        value1: period1.distance,
        value2: period2.distance,
        format: (v: number) => v.toLocaleString('it-IT'),
        icon: '📏',
      },
      ...(period1.avgRPE && period2.avgRPE ? [{
        label: 'RPE Medio',
        value1: period1.avgRPE,
        value2: period2.avgRPE,
        format: (v: number) => v.toFixed(1),
        icon: '💪',
      }] : []),
      ...(period1.avgSpeed && period2.avgSpeed ? [{
        label: 'Velocità Media (m/s)',
        value1: period1.avgSpeed,
        value2: period2.avgSpeed,
        format: (v: number) => v.toFixed(2),
        icon: '⚡',
      }] : []),
      ...(period1.pbs !== undefined && period2.pbs !== undefined ? [{
        label: 'Personal Bests',
        value1: period1.pbs,
        value2: period2.pbs,
        format: (v: number) => v.toString(),
        icon: '🏆',
      }] : []),
      ...(period1.exercises && period2.exercises ? [{
        label: 'Esercizi',
        value1: period1.exercises,
        value2: period2.exercises,
        format: (v: number) => v.toString(),
        icon: '🎯',
      }] : []),
    ];
  }, [period1, period2]);

  const calculateChange = (val1: number, val2: number) => {
    if (val2 === 0) return { percentage: 0, trend: 'stable' as const };
    const change = ((val1 - val2) / val2) * 100;
    const trend = Math.abs(change) < 5 
      ? 'stable' as const 
      : change > 0 
        ? 'up' as const 
        : 'down' as const;
    return { percentage: change, trend };
  };

  return (
    <Card className={cn('border-slate-200 shadow-sm', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-2xl">🔄</span>
          Confronto Periodi
        </CardTitle>
        <div className="flex items-center gap-3 text-sm text-slate-600 mt-2">
          <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
            <span className="font-semibold text-purple-700">{period1.label}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
          <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200">
            <span className="font-semibold text-orange-700">{period2.label}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {comparisons.map((comp, idx) => {
          const { percentage, trend } = calculateChange(comp.value1, comp.value2);
          
          return (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{comp.icon}</span>
                <div>
                  <div className="text-sm font-medium text-slate-700">{comp.label}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">
                      {comp.format(comp.value2)}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-900">
                      {comp.format(comp.value1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold',
                trend === 'up' && 'bg-green-100 text-green-700',
                trend === 'down' && 'bg-red-100 text-red-700',
                trend === 'stable' && 'bg-slate-100 text-slate-600'
              )}>
                {trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
                {trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
                {trend === 'stable' && <Minus className="h-3.5 w-3.5" />}
                <span>
                  {trend === 'stable' 
                    ? 'Stabile' 
                    : `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * Quick Period Selector
 * Pulsanti rapidi per selezionare periodi comuni da confrontare
 */
interface QuickPeriodSelectorProps {
  onSelect: (period1: { start: string; end: string; label: string }, period2: { start: string; end: string; label: string }) => void;
  className?: string;
}

export function QuickPeriodSelector({ onSelect, className }: QuickPeriodSelectorProps) {
  const quickComparisons = [
    {
      label: 'Questo mese vs precedente',
      getValue: () => {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthEnd = now;
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        
        return {
          period1: {
            start: thisMonthStart.toISOString().split('T')[0],
            end: thisMonthEnd.toISOString().split('T')[0],
            label: 'Mese corrente',
          },
          period2: {
            start: lastMonthStart.toISOString().split('T')[0],
            end: lastMonthEnd.toISOString().split('T')[0],
            label: 'Mese precedente',
          },
        };
      },
    },
    {
      label: 'Ultimi 30gg vs 30gg precedenti',
      getValue: () => {
        const now = new Date();
        const period1End = now;
        const period1Start = new Date(now);
        period1Start.setDate(period1Start.getDate() - 30);
        const period2End = new Date(period1Start);
        period2End.setDate(period2End.getDate() - 1);
        const period2Start = new Date(period2End);
        period2Start.setDate(period2Start.getDate() - 30);
        
        return {
          period1: {
            start: period1Start.toISOString().split('T')[0],
            end: period1End.toISOString().split('T')[0],
            label: 'Ultimi 30gg',
          },
          period2: {
            start: period2Start.toISOString().split('T')[0],
            end: period2End.toISOString().split('T')[0],
            label: '30gg precedenti',
          },
        };
      },
    },
    {
      label: 'Quest\'anno vs anno scorso',
      getValue: () => {
        const now = new Date();
        const thisYearStart = new Date(now.getFullYear(), 0, 1);
        const thisYearEnd = now;
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
        
        return {
          period1: {
            start: thisYearStart.toISOString().split('T')[0],
            end: thisYearEnd.toISOString().split('T')[0],
            label: now.getFullYear().toString(),
          },
          period2: {
            start: lastYearStart.toISOString().split('T')[0],
            end: lastYearEnd.toISOString().split('T')[0],
            label: (now.getFullYear() - 1).toString(),
          },
        };
      },
    },
  ];

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {quickComparisons.map((comparison, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => {
            const { period1, period2 } = comparison.getValue();
            onSelect(period1, period2);
          }}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-all hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 active:scale-95"
        >
          <span>🔄</span>
          {comparison.label}
        </button>
      ))}
    </div>
  );
}
