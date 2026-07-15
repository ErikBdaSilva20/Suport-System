import type { AuditLogEntry } from '@/types';
import { Clock } from 'lucide-react';

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

export function AuditTimeline({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <div className="space-y-0">
      {entries.map((entry, i) => (
        <div key={entry.id} className="flex gap-3 relative pb-4">
          {i < entries.length - 1 && (
            <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
          )}
          <div className="flex-shrink-0 mt-1">
            <div className="h-[22px] w-[22px] rounded-full bg-secondary flex items-center justify-center">
              <Clock className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground">
              <span className="font-medium">{entry.user_name}</span>{' '}
              <span className="text-muted-foreground">{entry.action}</span>
            </p>
            {entry.details && <p className="text-xs text-muted-foreground">{entry.details}</p>}
            <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(entry.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
