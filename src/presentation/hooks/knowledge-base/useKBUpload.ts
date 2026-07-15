import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = 'kb-images';

export function useKBUpload(articleId?: string) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const upload = async (file: File): Promise<{ url: string; name: string } | null> => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Envie apenas imagens.', variant: 'destructive' });
      return null;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: 'Imagem muito grande', description: 'O limite é 10MB.', variant: 'destructive' });
      return null;
    }
    setUploading(true);
    try {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'png';
      const rand = Math.random().toString(36).slice(2, 10);
      const folder = articleId ?? 'draft';
      const path = `${folder}/${Date.now()}-${rand}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type || 'image/png', upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return { url: data.publicUrl, name: file.name || 'imagem' };
    } catch (e: any) {
      toast({ title: 'Falha no upload', description: e.message, variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
}
