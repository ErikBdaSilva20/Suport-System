import { useEffect, useState } from 'react';
import { FileIcon, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatBytes } from './useLiveChatUpload';

interface Props {
  path: string;
  name: string;
  size: number;
  type: string;
  variant?: 'agent' | 'client' | 'neutral';
}

export function AttachmentBubble({ path, name, size, type, variant = 'neutral' }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage
        .from('live-chat-attachments')
        .createSignedUrl(path, 3600);
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    })();
    return () => { cancelled = true; };
  }, [path]);

  const isImage = type.startsWith('image/');

  if (isImage) {
    return (
      <a href={url ?? '#'} target="_blank" rel="noreferrer" className="block">
        {url ? (
          <img src={url} alt={name} className="max-w-[240px] max-h-[240px] rounded-md object-cover" />
        ) : (
          <div className="w-40 h-32 bg-secondary/50 rounded-md animate-pulse" />
        )}
      </a>
    );
  }

  return (
    <a
      href={url ?? '#'}
      target="_blank"
      rel="noreferrer"
      download={name}
      className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-2 hover:bg-secondary/50 transition min-w-[200px] max-w-[280px]"
    >
      <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{name}</p>
        <p className="text-[10px] text-muted-foreground">{formatBytes(size)}</p>
      </div>
      <Download className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
    </a>
  );
}
