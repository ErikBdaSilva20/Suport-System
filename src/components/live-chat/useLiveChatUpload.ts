import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MAX_BYTES = 10 * 1024 * 1024;

export interface UploadedAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
}

export function useLiveChatUpload(ticketId: string) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const upload = async (file: File): Promise<UploadedAttachment | null> => {
    if (file.size > MAX_BYTES) {
      toast({ title: 'Arquivo muito grande', description: 'O limite é 10MB.', variant: 'destructive' });
      return null;
    }
    setUploading(true);
    try {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
      const rand = Math.random().toString(36).slice(2, 10);
      const path = `${ticketId}/${Date.now()}-${rand}${ext ? '.' + ext : ''}`;
      const { error } = await supabase.storage
        .from('live-chat-attachments')
        .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
      if (error) throw error;
      return { path, name: file.name || 'arquivo', size: file.size, type: file.type || 'application/octet-stream' };
    } catch (e: any) {
      toast({ title: 'Falha no upload', description: e.message, variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
