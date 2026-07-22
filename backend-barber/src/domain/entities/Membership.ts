import { AppError } from '../errors/AppError';
import { MembershipData, MembershipStatus, MembershipSource, PaymentMethod, BillingCycle, MEMBERSHIP_DEFAULTS } from '../types/membership';

export type MembershipProps = MembershipData;

export class Membership {
  private props: MembershipProps;

  private constructor(props: MembershipProps) {
    this.props = { ...props };
  }

  static create(data: {
    userId: string;
    createdBy: MembershipSource;
    adminId?: string;
    price?: number;
    couponsTotal?: number;
    productDiscount?: number;
    durationDays?: number;
    billingCycle?: BillingCycle;
    mpPreapprovalId?: string;
    status?: MembershipStatus;
    paymentMethod?: PaymentMethod;
    paymentId?: string;
  }): Membership {
    const now = new Date();
    const duration = data.durationDays ?? MEMBERSHIP_DEFAULTS.durationDays;

    const isPending = (data.status ?? 'active') === 'pending';
    const endDate = new Date(now);
    if (!isPending) {
      endDate.setDate(endDate.getDate() + duration);
    }

    const membership = new Membership({
      id: '',
      userId: data.userId,
      status: data.status ?? 'active',
      price: data.price ?? 0,
      startDate: now,
      endDate,
      couponsTotal: data.couponsTotal ?? MEMBERSHIP_DEFAULTS.couponsTotal,
      couponsUsed: 0,
      productDiscount: data.productDiscount ?? MEMBERSHIP_DEFAULTS.productDiscount,
      durationDays: duration,
      billingCycle: data.billingCycle ?? null,
      createdBy: data.createdBy,
      adminId: data.adminId,
      mpPreapprovalId: data.mpPreapprovalId,
      paymentMethod: data.paymentMethod ?? null,
      paymentId: data.paymentId,
      approvedBy: undefined,
      approvedAt: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return membership;
  }

  static restore(props: MembershipProps): Membership {
    return new Membership(props);
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get status(): MembershipStatus { return this.props.status; }
  get price(): number { return this.props.price; }
  get startDate(): Date { return new Date(this.props.startDate.getTime()); }
  get endDate(): Date { return new Date(this.props.endDate.getTime()); }
  get couponsTotal(): number { return this.props.couponsTotal; }
  get couponsUsed(): number { return this.props.couponsUsed; }
  get productDiscount(): number { return this.props.productDiscount; }
  get durationDays(): number { return this.props.durationDays; }
  get billingCycle(): BillingCycle { return this.props.billingCycle; }
  get createdBy(): MembershipSource { return this.props.createdBy; }
  get adminId(): string | undefined { return this.props.adminId; }
  get mpPreapprovalId(): string | undefined { return this.props.mpPreapprovalId; }
  get paymentMethod(): PaymentMethod { return this.props.paymentMethod; }
  get paymentId(): string | undefined { return this.props.paymentId; }
  get approvedBy(): string | undefined { return this.props.approvedBy; }
  get approvedAt(): Date | undefined {
    return this.props.approvedAt ? new Date(this.props.approvedAt.getTime()) : undefined;
  }
  get createdAt(): Date { return new Date(this.props.createdAt.getTime()); }
  get updatedAt(): Date { return new Date(this.props.updatedAt.getTime()); }

  get remainingCoupons(): number {
    return Math.max(0, this.props.couponsTotal - this.props.couponsUsed);
  }

  get isExpired(): boolean {
    if (this.props.status === 'pending') return false;
    return new Date() > this.props.endDate || this.props.status !== 'active';
  }

  get isPending(): boolean {
    return this.props.status === 'pending';
  }

  redeemCoupon(): void {
    if (this.isPending) {
      throw new AppError('La membresía está pendiente de pago.', 400);
    }
    if (this.isExpired) {
      throw new AppError('La membresía no está activa o está vencida.', 400);
    }
    if (this.props.couponsUsed >= this.props.couponsTotal) {
      throw new AppError('No quedan cupones disponibles este mes.', 400);
    }
    this.props.couponsUsed += 1;
    this.props.updatedAt = new Date();
  }

  restoreCoupon(): void {
    this.props.couponsUsed = Math.max(0, this.props.couponsUsed - 1);
    this.props.updatedAt = new Date();
  }

  renew(): void {
    if (this.props.status === 'cancelled') {
      throw new AppError('Cannot renew a cancelled membership.', 400);
    }
    const newEndDate = new Date(this.props.endDate);
    newEndDate.setDate(newEndDate.getDate() + this.props.durationDays);
    this.props.endDate = newEndDate;
    this.props.couponsUsed = 0;
    this.props.status = 'active';
    this.props.updatedAt = new Date();
  }

  approve(approvedBy: string): void {
    if (this.props.status !== 'pending') {
      throw new AppError('La membresía no está pendiente de pago.', 400);
    }
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + this.props.durationDays);
    this.props.status = 'active';
    this.props.endDate = endDate;
    this.props.approvedBy = approvedBy;
    this.props.approvedAt = now;
    this.props.updatedAt = now;
  }

  expire(): void {
    if (this.props.status !== 'active') {
      throw new AppError(`No se puede expirar una membresía en estado ${this.props.status}.`, 400);
    }
    this.props.status = 'expired';
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    if (this.props.status !== 'active') {
      throw new AppError(`No se puede cancelar una membresía en estado ${this.props.status}.`, 400);
    }
    this.props.status = 'cancelled';
    this.props.updatedAt = new Date();
  }

  reactivate(price: number, paymentMethod: PaymentMethod, durationDays?: number): void {
    if (this.props.status !== 'expired' && this.props.status !== 'pending') {
      throw new AppError('Solo se puede reactivar una membresía expirada o pendiente.', 400);
    }
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (durationDays ?? this.props.durationDays));
    this.props.status = 'active';
    this.props.price = price;
    this.props.startDate = now;
    this.props.endDate = endDate;
    this.props.couponsUsed = 0;
    this.props.paymentMethod = paymentMethod;
    this.props.updatedAt = now;
  }

  toPrimitives(): MembershipProps {
    return { ...this.props };
  }
}
