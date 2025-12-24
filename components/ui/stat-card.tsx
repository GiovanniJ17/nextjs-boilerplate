import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type StatCardVariant = "default" | "yellow" | "orange" | "green" | "purple" | "blue";

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
  variant?: StatCardVariant;
}

const variantStyles: Record<StatCardVariant, string> = {
  default: "bg-card text-card-foreground",
  yellow: "bg-brand-yellow text-brand-dark",
  orange: "bg-brand-orange text-brand-dark",
  green: "bg-brand-green text-brand-dark",
  purple: "bg-brand-purple text-white",
  blue: "bg-brand-blue text-white",
};

export function StatCard({ label, value, icon: Icon, trend, suffix, className = "", variant = "default" }: StatCardProps) {
  const isColorful = variant !== "default";
  
  return (
    <Card className={cn("overflow-hidden border-none shadow-sm", variantStyles[variant], className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={cn("text-sm font-medium", isColorful ? "opacity-90" : "text-muted-foreground")}>{label}</p>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-bold tracking-tight">
                {value}
              </span>
              {suffix && <span className={cn("text-sm font-medium", isColorful ? "opacity-80" : "text-muted-foreground")}>{suffix}</span>}
            </div>
            {trend && (
              <p className={cn("mt-1 text-xs font-medium flex items-center gap-1", 
                isColorful ? "opacity-90" : (trend.isPositive ? 'text-green-500' : 'text-red-500')
              )}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl",
              isColorful ? "bg-black/10" : "bg-secondary text-muted-foreground"
            )}>
              <Icon className="h-6 w-6" strokeWidth={2} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

