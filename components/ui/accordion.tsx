import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
  badge?: string | number;
}

export function Accordion({ title, children, defaultOpen = false, icon, badge }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <h3 className="text-base sm:text-lg font-semibold text-slate-800">{title}</h3>
          {badge !== undefined && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="border-t border-slate-200 px-5 py-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
