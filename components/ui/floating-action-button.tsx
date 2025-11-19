"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Zap, Copy, History } from "lucide-react";
import { cn } from "@/lib/utils";

type QuickAction = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  action: () => void;
};

type FloatingActionButtonProps = {
  mainAction?: () => void;
  quickActions?: QuickAction[];
};

export function FloatingActionButton({ mainAction, quickActions = [] }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMainClick = () => {
    if (quickActions.length > 0) {
      setIsOpen(!isOpen);
    } else if (mainAction) {
      mainAction();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Quick Actions */}
      <AnimatePresence>
        {isOpen && quickActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-24 right-4 z-50 flex flex-col gap-3 md:hidden"
          >
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    action.action();
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm transition-all active:scale-95",
                    action.color
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium text-sm whitespace-nowrap">{action.label}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={handleMainClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all md:hidden",
          isOpen
            ? "bg-slate-800 text-white"
            : "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
        )}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" strokeWidth={2.5} />}
        </motion.div>
      </motion.button>
    </>
  );
}
