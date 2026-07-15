import { DomainError } from './DomainError';

export class UnauthorizedError extends DomainError {
  constructor(action?: string) {
    super(action ? `Unauthorized: ${action}` : 'Unauthorized');
    this.name = 'UnauthorizedError';
  }
}
