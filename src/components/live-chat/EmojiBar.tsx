import { useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const EMOJIS = ['👍','👎','❤️','😀','😂','😅','🙏','🎉','✅','❌','⚠️','🔥','👀','💬','🤔','😉'];

interface Props {
  onPick: (emoji: string) => void;
  size?: 'sm' | 'md';
}

export function EmojiBar({ onPick, size = 'md' }: Props) {
  const [open, setOpen] = useState(false);
  const btnCls = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const iconCls = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="icon" variant="ghost" className={`${btnCls} flex-shrink-0`}>
          <Smile className={iconCls} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-auto p-2">
        <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => { onPick(e); setOpen(false); }}
              className="text-lg hover:bg-secondary rounded p-1 transition"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
