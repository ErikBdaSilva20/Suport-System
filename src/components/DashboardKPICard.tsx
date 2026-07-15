import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DashboardKPICardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: number;
}

export function DashboardKPICard({ icon, label, value, trend }: DashboardKPICardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 shadow-elevation-1 hover:shadow-elevation-3 transition-all duration-200 group">
      <div className="flex items-center justify-between">
        <span className="text-accent group-hover:scale-110 transition-transform duration-200">{icon}</span>
        {trend !== undefined && (
          <span className={cn('flex items-center gap-1 text-xs font-medium',
            isPositive && 'text-sla-ok',
            isNegative && 'text-destructive'
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1.5 font-medium uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}
