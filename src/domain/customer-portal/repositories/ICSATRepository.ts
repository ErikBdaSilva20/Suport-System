import type { CSATResponse } from '../entities/CSATResponse';

export interface ICSATRepository {
  findByToken(token: string): Promise<CSATResponse | null>;
  submit(token: string, rating: number, comment?: string): Promise<CSATResponse>;
  avgRating(since?: Date): Promise<number>;
}
