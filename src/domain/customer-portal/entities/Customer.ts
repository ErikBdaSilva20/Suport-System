export interface CustomerProps {
  id: string;
  authUserId?: string | null;
  email: string;
  fullName: string;
  phone?: string | null;
  company?: string | null;
  notes?: string | null;
  createdAt: Date;
}

export class Customer {
  private constructor(private readonly props: CustomerProps) {}

  static create(props: CustomerProps): Customer {
    return new Customer(props);
  }

  get id() { return this.props.id; }
  get email() { return this.props.email; }

  toPlainObject(): CustomerProps {
    return { ...this.props };
  }
}
