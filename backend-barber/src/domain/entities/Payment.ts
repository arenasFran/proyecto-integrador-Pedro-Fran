import { PaymentData, PaymentType, PaymentStatus } from '../types/payment.types';

export type PaymentProps = PaymentData;

export class Payment {
  private props: PaymentProps;

  private constructor(props: PaymentProps) {
    this.props = { ...props };
  }

  static create(data: {
    type: PaymentType;
    referenceId: string;
    amount: number;
    userId: string;
    mpPreferenceId?: string;
    currency?: string;
  }): Payment {
    const now = new Date();
    return new Payment({
      id: '',
      type: data.type,
      referenceId: data.referenceId,
      status: 'pending',
      mpPaymentId: undefined,
      mpPreferenceId: data.mpPreferenceId,
      amount: data.amount,
      currency: data.currency ?? 'UYU',
      userId: data.userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: PaymentProps): Payment {
    return new Payment(props);
  }

  get id(): string { return this.props.id; }
  get type(): PaymentType { return this.props.type; }
  get referenceId(): string { return this.props.referenceId; }
  get status(): PaymentStatus { return this.props.status; }
  get mpPaymentId(): string | undefined { return this.props.mpPaymentId; }
  get mpPreferenceId(): string | undefined { return this.props.mpPreferenceId; }
  get amount(): number { return this.props.amount; }
  get currency(): string { return this.props.currency; }
  get userId(): string { return this.props.userId; }
  get createdAt(): Date { return new Date(this.props.createdAt.getTime()); }
  get updatedAt(): Date { return new Date(this.props.updatedAt.getTime()); }

  toPrimitives(): PaymentProps {
    return { ...this.props };
  }

  approve(mpPaymentId: string): void {
    if (this.props.status !== 'pending') {
      return;
    }
    this.props.status = 'approved';
    this.props.mpPaymentId = mpPaymentId;
    this.props.updatedAt = new Date();
  }

  reject(): void {
    if (this.props.status !== 'pending') {
      return;
    }
    this.props.status = 'rejected';
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    if (this.props.status === 'approved') {
      return;
    }
    this.props.status = 'cancelled';
    this.props.updatedAt = new Date();
  }

  refund(mpPaymentId: string): void {
    if (this.props.status === 'refunded') {
      return;
    }
    this.props.status = 'refunded';
    this.props.mpPaymentId = mpPaymentId;
    this.props.updatedAt = new Date();
  }

  chargeBack(mpPaymentId: string): void {
    if (this.props.status === 'charge_back') {
      return;
    }
    this.props.status = 'charge_back';
    this.props.mpPaymentId = mpPaymentId;
    this.props.updatedAt = new Date();
  }

  inMediation(mpPaymentId: string): void {
    if (this.props.status === 'in_mediation') {
      return;
    }
    this.props.status = 'in_mediation';
    this.props.mpPaymentId = mpPaymentId;
    this.props.updatedAt = new Date();
  }

  assignPreference(mpPreferenceId: string): void {
    this.props.mpPreferenceId = mpPreferenceId;
    this.props.updatedAt = new Date();
  }
}
