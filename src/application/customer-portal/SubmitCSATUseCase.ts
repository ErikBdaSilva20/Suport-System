import { getCSATRepository } from '@/infrastructure/registries/customer-portal';
import type { CSATResponse } from '@/domain/customer-portal/entities/CSATResponse';

export class SubmitCSATUseCase {
  async execute(token: string, rating: number, comment?: string): Promise<CSATResponse> {
    return getCSATRepository().submit(token, rating, comment);
  }
}
