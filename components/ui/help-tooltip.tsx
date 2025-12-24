"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type HelpTooltipProps = {
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
};

export function HelpTooltip({ 
  title, 
  description, 
  position = "top",
  className 
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(255,255,255,0.03)] text-muted transition-colors hover:bg-[rgba(255,255,255,0.06)]"
        aria-label="Mostra aiuto"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 w-64 rounded-xl border border-default bg-[rgba(255,255,255,0.03)] p-3 shadow-lg text-default",
              positionClasses[position]
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-default">{title}</h4>
                <p className="mt-1 text-xs text-muted">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted hover:bg-[rgba(255,255,255,0.03)] hover:text-default"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
