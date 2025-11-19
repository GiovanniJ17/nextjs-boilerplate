/**
 * Mobile Wizard Step Indicator
 * Indicatore di progresso per wizard multi-step su mobile
 */

'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WizardStep = {
  id: string;
  label: string;
  emoji?: string;
  icon?: React.ComponentType<{ className?: string }>;
};

interface MobileStepIndicatorProps {
  steps: WizardStep[];
  currentStepId: string;
  completedStepIds?: string[];
  onStepClick?: (stepId: string) => void;
  className?: string;
}

export function MobileStepIndicator({
  steps,
  currentStepId,
  completedStepIds = [],
  onStepClick,
  className,
}: MobileStepIndicatorProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStepId);

  return (
    <div className={cn(
      'md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm',
      className
    )}>
      {/* Progress Bar */}
      <div className="relative h-1 bg-slate-100">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 to-cyan-500"
          initial={{ width: 0 }}
          animate={{ 
            width: `${((currentIndex + 1) / steps.length) * 100}%` 
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        />
      </div>

      {/* Step Dots */}
      <div className="flex items-center justify-between px-4 py-3">
        {steps.map((step, index) => {
          const isActive = step.id === currentStepId;
          const isCompleted = completedStepIds.includes(step.id);
          const isPast = index < currentIndex;
          const isFuture = index > currentIndex;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepClick?.(step.id)}
              disabled={!onStepClick}
              className={cn(
                'flex flex-col items-center gap-1.5 transition-all',
                onStepClick && 'active:scale-95',
                !onStepClick && 'cursor-default'
              )}
            >
              {/* Dot */}
              <motion.div
                className={cn(
                  'relative flex items-center justify-center rounded-full transition-all',
                  isActive && 'h-10 w-10 bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg',
                  (isCompleted || isPast) && !isActive && 'h-8 w-8 bg-green-500',
                  isFuture && !isActive && 'h-8 w-8 bg-slate-200'
                )}
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {isCompleted || isPast ? (
                  <Check className={cn(
                    'transition-all',
                    isActive ? 'h-5 w-5 text-white' : 'h-4 w-4 text-white'
                  )} />
                ) : (
                  <span className={cn(
                    'transition-all',
                    isActive && 'text-xl',
                    !isActive && 'text-base',
                    isActive ? 'text-white' : 'text-slate-400'
                  )}>
                    {step.emoji || (index + 1)}
                  </span>
                )}

                {/* Active Ring */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-orange-300"
                    initial={{ scale: 1, opacity: 0 }}
                    animate={{ 
                      scale: 1.3, 
                      opacity: [0, 1, 0] 
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  />
                )}
              </motion.div>

              {/* Label */}
              <span className={cn(
                'text-[10px] font-medium transition-colors text-center max-w-[60px]',
                isActive ? 'text-sky-600' : 'text-slate-500'
              )}>
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Desktop Step Indicator (horizontal)
 */
interface DesktopStepIndicatorProps {
  steps: WizardStep[];
  currentStepId: string;
  completedStepIds?: string[];
  onStepClick?: (stepId: string) => void;
  className?: string;
}

export function DesktopStepIndicator({
  steps,
  currentStepId,
  completedStepIds = [],
  onStepClick,
  className,
}: DesktopStepIndicatorProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStepId);

  return (
    <div className={cn('hidden md:block', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.id === currentStepId;
          const isCompleted = completedStepIds.includes(step.id);
          const isPast = index < currentIndex;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step */}
              <button
                type="button"
                onClick={() => onStepClick?.(step.id)}
                disabled={!onStepClick}
                className={cn(
                  'flex items-center gap-3 transition-all',
                  onStepClick && 'cursor-pointer hover:opacity-80',
                  !onStepClick && 'cursor-default'
                )}
              >
                {/* Circle */}
                <div className={cn(
                  'flex items-center justify-center rounded-full transition-all shrink-0',
                  isActive && 'h-12 w-12 bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg',
                  (isCompleted || isPast) && !isActive && 'h-10 w-10 bg-green-500',
                  !isActive && !isCompleted && !isPast && 'h-10 w-10 bg-slate-200'
                )}>
                  {isCompleted || isPast ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : (
                    <span className={cn(
                      'text-lg font-semibold',
                      isActive ? 'text-white' : 'text-slate-400'
                    )}>
                      {step.emoji || (index + 1)}
                    </span>
                  )}
                </div>

                {/* Label */}
                <div className="flex flex-col items-start">
                  <span className={cn(
                    'text-xs text-slate-500 font-medium',
                    isActive && 'text-sky-600'
                  )}>
                    Step {index + 1}
                  </span>
                  <span className={cn(
                    'text-sm font-semibold transition-colors',
                    isActive ? 'text-sky-600' : 'text-slate-700'
                  )}>
                    {step.label}
                  </span>
                </div>
              </button>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 h-[2px] mx-4 bg-slate-200 relative overflow-hidden">
                  {(isPast || isCompleted) && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-400"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.5 }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
