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
    <div className={`stat-card ${className} bg-card border-default text-default`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="stat-label text-muted">{label}</p>
          <p className="stat-value mt-0.5">
            {value}
            {suffix && <span className="text-sm text-muted ml-1">{suffix}</span>}
          </p>
          {trend && (
            <p className={`mt-0.5 text-xs font-medium ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.03)] text-muted">
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  );
}
