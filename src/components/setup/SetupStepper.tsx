import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepDef {
  key: string;
  label: string;
  done: boolean;
}

interface Props {
  steps: StepDef[];
  current: number;
  onJump?: (idx: number) => void;
}

export function SetupStepper({ steps, current, onJump }: Props) {
  return (
    <div className="flex items-center gap-2 w-full">
      {steps.map((s, i) => {
        const active = i === current;
        const done = s.done;
        return (
          <div key={s.key} className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onJump?.(i)}
              className={cn(
                'flex items-center gap-2 min-w-0 transition-colors',
                onJump ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
                  done && 'bg-status-resolved/20 border-status-resolved text-status-resolved',
                  !done && active && 'bg-primary text-primary-foreground border-primary',
                  !done && !active && 'bg-secondary text-muted-foreground border-border',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-xs truncate',
                  active ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
            </button>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
