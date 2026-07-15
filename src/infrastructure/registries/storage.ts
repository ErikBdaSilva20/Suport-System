import { SupabaseStorageService } from '@/infrastructure/supabase/storage/SupabaseStorageService';

export type BucketName = 'ticket-attachments' | 'kb-images' | 'company-assets';

export interface IStorageService {
  upload(bucket: BucketName, path: string, file: File): Promise<string>;
  uploadPrivate(bucket: BucketName, path: string, file: File): Promise<string>;
  getSignedUrl(bucket: BucketName, path: string, expiresInSeconds?: number): Promise<string>;
  remove(bucket: BucketName, paths: string[]): Promise<void>;
}

let storageService: IStorageService | null = null;

export function getStorageService(): IStorageService {
  if (!storageService) storageService = new SupabaseStorageService();
  return storageService;
}
