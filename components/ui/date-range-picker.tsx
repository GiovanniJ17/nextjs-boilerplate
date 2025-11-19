/**
 * Date Range Picker Component
 * Selettore di intervallo date mobile-friendly
 */

'use client';

import { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onRangeChange: (start: string, end: string) => void;
  onClear?: () => void;
  className?: string;
}

export function DateRangePicker({
  startDate = '',
  endDate = '',
  onRangeChange,
  onClear,
  className,
}: DateRangePickerProps) {
  const [localStart, setLocalStart] = useState(startDate);
  const [localEnd, setLocalEnd] = useState(endDate);
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    if (localStart && localEnd) {
      onRangeChange(localStart, localEnd);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setLocalStart('');
    setLocalEnd('');
    onClear?.();
    setIsOpen(false);
  };

  const quickRanges = [
    {
      label: 'Ultima settimana',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'Ultimo mese',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'Ultimi 3 mesi',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 3);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'Quest\'anno',
      getValue: () => {
        const end = new Date();
        const start = new Date(end.getFullYear(), 0, 1);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      },
    },
  ];

  const formattedRange = startDate && endDate
    ? `${new Date(startDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} - ${new Date(endDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : 'Seleziona periodo';

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'gap-2 justify-between w-full md:w-auto',
          (startDate || endDate) && 'border-orange-300 bg-orange-50 text-orange-700'
        )}
      >
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="text-xs md:text-sm">{formattedRange}</span>
        </span>
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </Button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              className={cn(
                'absolute top-full left-0 right-0 md:left-auto md:right-auto mt-2 z-50',
                'w-full md:w-80 rounded-2xl border border-slate-200 bg-white shadow-xl p-4'
              )}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Quick Ranges */}
              <div className="mb-4">
                <Label className="text-xs font-semibold text-slate-600 mb-2">Periodi rapidi</Label>
                <div className="grid grid-cols-2 gap-2">
                  {quickRanges.map((range) => (
                    <button
                      key={range.label}
                      type="button"
                      onClick={() => {
                        const { start, end } = range.getValue();
                        setLocalStart(start);
                        setLocalEnd(end);
                        onRangeChange(start, end);
                        setIsOpen(false);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 active:scale-95"
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Range */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <Label className="text-xs font-semibold text-slate-600">Periodo personalizzato</Label>
                
                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px] text-slate-500 mb-1">Data inizio</Label>
                    <Input
                      type="date"
                      value={localStart}
                      onChange={(e) => setLocalStart(e.target.value)}
                      max={localEnd || undefined}
                      className="text-sm h-10"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] text-slate-500 mb-1">Data fine</Label>
                    <Input
                      type="date"
                      value={localEnd}
                      onChange={(e) => setLocalEnd(e.target.value)}
                      min={localStart || undefined}
                      className="text-sm h-10"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClear}
                    className="flex-1 h-9 text-xs"
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleApply}
                    disabled={!localStart || !localEnd}
                    className="flex-1 h-9 text-xs bg-orange-500 hover:bg-orange-600"
                  >
                    Applica
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
