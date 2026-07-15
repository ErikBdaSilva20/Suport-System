import { supabase } from '@/integrations/supabase/client';

type BucketName = 'ticket-attachments' | 'kb-images' | 'company-assets';

export class SupabaseStorageService {
  async upload(bucket: BucketName, path: string, file: File): Promise<string> {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /** Uploads and returns the storage path (for private buckets). */
  async uploadPrivate(bucket: BucketName, path: string, file: File): Promise<string> {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    return path;
  }

  /** Creates a temporary signed URL for a private-bucket file. */
  async getSignedUrl(bucket: BucketName, path: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  }

  async remove(bucket: BucketName, paths: string[]): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw error;
  }
}
