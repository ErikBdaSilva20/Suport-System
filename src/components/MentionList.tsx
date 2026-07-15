import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface MentionItem {
  id: string;
  label: string;
  email?: string;
  avatarUrl?: string | null;
}

interface Props {
  items: MentionItem[];
  command: (item: { id: string; label: string }) => void;
}

export const MentionList = forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, Props>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) command({ id: item.id, label: item.label });
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((selectedIndex + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((selectedIndex + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="rounded-md border border-border bg-popover shadow-md p-2 text-xs text-muted-foreground">
          Nenhum agente encontrado
        </div>
      );
    }

    return (
      <div className="rounded-md border border-border bg-popover shadow-md p-1 min-w-[200px] max-h-64 overflow-auto">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectItem(index)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm rounded-sm transition-colors',
              index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
            )}
          >
            <Avatar className="h-6 w-6">
              {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={item.label} />}
              <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                {item.label.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">{item.label}</span>
              {item.email && <span className="text-[10px] text-muted-foreground truncate">{item.email}</span>}
            </div>
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = 'MentionList';
