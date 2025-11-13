"use client";

import { Calendar, Clock, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type QuickFilter = {
  key: string;
  label: string;
  icon: React.ReactNode;
  fromDate: string;
  toDate: string;
  description: string;
};

interface QuickFiltersProps {
  onSelectFilter: (fromDate: string, toDate: string) => void;
  activeFilter: string;
  setActiveFilter: (key: string) => void;
}

export function QuickFilters({ onSelectFilter, activeFilter, setActiveFilter }: QuickFiltersProps) {
  const today = new Date();
  
  const quickFilters: QuickFilter[] = [
    {
      key: "last7days",
      label: "Ultimi 7 giorni",
      icon: <Zap className="h-4 w-4" />,
      fromDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      toDate: today.toISOString().split("T")[0],
      description: "Una settimana",
    },
    {
      key: "last30days",
      label: "Ultimi 30 giorni",
      icon: <Calendar className="h-4 w-4" />,
      fromDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      toDate: today.toISOString().split("T")[0],
      description: "Un mese",
    },
    {
      key: "last3months",
      label: "Ultimi 3 mesi",
      icon: <TrendingUp className="h-4 w-4" />,
      fromDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      toDate: today.toISOString().split("T")[0],
      description: "Trimestre",
    },
    {
      key: "thisYear",
      label: "Quest'anno",
      icon: <Clock className="h-4 w-4" />,
      fromDate: `${today.getFullYear()}-01-01`,
      toDate: today.toISOString().split("T")[0],
      description: "Anno corrente",
    },
  ];

  const handleFilterClick = (filter: QuickFilter) => {
    if (activeFilter === filter.key) {
      // Deseleziona se già attivo
      setActiveFilter("");
      onSelectFilter("", "");
    } else {
      setActiveFilter(filter.key);
      onSelectFilter(filter.fromDate, filter.toDate);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {quickFilters.map((filter) => {
        const isActive = activeFilter === filter.key;
        return (
          <button
            key={filter.key}
            onClick={() => handleFilterClick(filter)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
              isActive
                ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50/50"
            )}
            title={filter.description}
          >
            {filter.icon}
            <span>{filter.label}</span>
          </button>
        );
      })}
    </div>
  );
}
