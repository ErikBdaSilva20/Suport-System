export interface CSATResponseProps {
  id: string;
  ticketId: string;
  customerId: string;
  rating: number; // 1-5
  comment?: string | null;
  token: string;
  submittedAt?: Date | null;
  createdAt: Date;
}

export class CSATResponse {
  private constructor(private readonly props: CSATResponseProps) {}

  static create(props: CSATResponseProps): CSATResponse {
    return new CSATResponse(props);
  }

  get id() { return this.props.id; }
  get rating() { return this.props.rating; }

  isSubmitted(): boolean {
    return this.props.submittedAt !== null;
  }

  toPlainObject(): CSATResponseProps {
    return { ...this.props };
  }
}
