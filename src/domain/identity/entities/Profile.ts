import type { UserRole } from '../value-objects/UserRole';

export interface ProfileProps {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
}

export class Profile {
  private constructor(private readonly props: ProfileProps) {}

  static create(props: ProfileProps): Profile {
    return new Profile(props);
  }

  get id() { return this.props.id; }
  get role() { return this.props.role; }
  get isActive() { return this.props.isActive; }

  isAdmin(): boolean {
    return this.props.role === 'admin';
  }

  toPlainObject(): ProfileProps {
    return { ...this.props };
  }
}
