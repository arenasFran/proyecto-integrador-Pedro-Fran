import { AppError } from '../errors/AppError';
import { MembershipData, MembershipStatus, MembershipSource, MEMBERSHIP_DEFAULTS } from '../types/membership';

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
    mpPreapprovalId?: string;
    nextBillingDate?: Date;
    status?: MembershipStatus;
  }): Membership {
    const now = new Date();

    const isPending = (data.status ?? 'active') === 'pending';
    const endDate = isPending ? new Date(now) : new Date(now);
    if (!isPending) {
      endDate.setDate(endDate.getDate() + MEMBERSHIP_DEFAULTS.durationDays);
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
      autoRenew: false,
      createdBy: data.createdBy,
      adminId: data.adminId,
      mpPreapprovalId: data.mpPreapprovalId,
      nextBillingDate: data.nextBillingDate,
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
  get autoRenew(): boolean { return this.props.autoRenew; }
  get createdBy(): MembershipSource { return this.props.createdBy; }
  get adminId(): string | undefined { return this.props.adminId; }
  get mpPreapprovalId(): string | undefined { return this.props.mpPreapprovalId; }
  get nextBillingDate(): Date | undefined {
    return this.props.nextBillingDate ? new Date(this.props.nextBillingDate.getTime()) : undefined;
  }
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

  renew(nextBillingDate?: Date): void {
    const newEndDate = new Date(this.props.endDate);
    newEndDate.setDate(newEndDate.getDate() + MEMBERSHIP_DEFAULTS.durationDays);
    this.props.endDate = newEndDate;
    this.props.couponsUsed = 0;
    this.props.status = 'active';
    if (nextBillingDate) {
      this.props.nextBillingDate = nextBillingDate;
    }
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    if (this.props.status !== 'active') {
      throw new AppError('La membresía no está activa.', 400);
    }
    if (!this.props.autoRenew) {
      throw new AppError('La renovación automática ya está desactivada.', 400);
    }
    this.props.autoRenew = false;
    this.props.updatedAt = new Date();
  }

  reactivate(): void {
    if (this.props.status !== 'active') {
      throw new AppError('La membresía no está activa.', 400);
    }
    if (this.props.autoRenew) {
      throw new AppError('La renovación automática ya está activa.', 400);
    }
    this.props.autoRenew = true;
    this.props.updatedAt = new Date();
  }

  approve(approvedBy: string): void {
    if (this.props.status !== 'pending') {
      throw new AppError('La membresía no está pendiente de pago.', 400);
    }
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + MEMBERSHIP_DEFAULTS.durationDays);
    this.props.status = 'active';
    this.props.endDate = endDate;
    this.props.approvedBy = approvedBy;
    this.props.approvedAt = now;
    this.props.updatedAt = now;
  }

  expire(): void {
    this.props.status = 'expired';
    this.props.updatedAt = new Date();
  }

  toPrimitives(): MembershipProps {
    return { ...this.props };
  }

  setEndDate(date: Date): void {
    this.props.endDate = date;
    this.props.updatedAt = new Date();
  }
}
