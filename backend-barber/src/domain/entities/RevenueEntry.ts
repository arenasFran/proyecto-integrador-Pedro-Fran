import { RevenueSource } from '../types/revenue';

export class RevenueEntry {
  private constructor(private readonly props: {
    id: string;
    source: RevenueSource;
    amount: number;
    date: Date;
    referenceId: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
  }) {}

  static create(data: {
    source: RevenueSource;
    amount: number;
    referenceId: string;
    date?: Date;
    metadata?: Record<string, unknown>;
  }): RevenueEntry {
    const now = new Date();
    return new RevenueEntry({
      id: '',
      source: data.source,
      amount: data.amount,
      date: data.date ?? now,
      referenceId: data.referenceId,
      metadata: data.metadata,
      createdAt: now,
    });
  }

  static restore(props: RevenueEntry['props']): RevenueEntry {
    return new RevenueEntry(props);
  }

  get id(): string { return this.props.id; }
  get source(): RevenueSource { return this.props.source; }
  get amount(): number { return this.props.amount; }
  get date(): Date { return this.props.date; }
  get referenceId(): string { return this.props.referenceId; }
  get metadata(): Record<string, unknown> | undefined { return this.props.metadata; }
  get createdAt(): Date { return this.props.createdAt; }

  toPrimitives() {
    return { ...this.props };
  }
}
