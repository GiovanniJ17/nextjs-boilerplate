import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  suffix?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, suffix, className = "" }: StatCardProps) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-1">
            {value}
            {suffix && <span className="text-base text-slate-500 ml-1">{suffix}</span>}
          </p>
          {trend && (
            <p className={`mt-1 text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
}
