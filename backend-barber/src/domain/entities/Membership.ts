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
    couponsTotal?: number;
    productDiscount?: number;
  }): Membership {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + MEMBERSHIP_DEFAULTS.durationDays);

    const membership = new Membership({
      id: '',
      userId: data.userId,
      status: 'active',
      startDate: now,
      endDate,
      couponsTotal: data.couponsTotal ?? MEMBERSHIP_DEFAULTS.couponsTotal,
      couponsUsed: 0,
      productDiscount: data.productDiscount ?? MEMBERSHIP_DEFAULTS.productDiscount,
      autoRenew: true,
      createdBy: data.createdBy,
      adminId: data.adminId,
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
  get startDate(): Date { return new Date(this.props.startDate.getTime()); }
  get endDate(): Date { return new Date(this.props.endDate.getTime()); }
  get couponsTotal(): number { return this.props.couponsTotal; }
  get couponsUsed(): number { return this.props.couponsUsed; }
  get productDiscount(): number { return this.props.productDiscount; }
  get autoRenew(): boolean { return this.props.autoRenew; }
  get createdBy(): MembershipSource { return this.props.createdBy; }
  get adminId(): string | undefined { return this.props.adminId; }
  get createdAt(): Date { return new Date(this.props.createdAt.getTime()); }
  get updatedAt(): Date { return new Date(this.props.updatedAt.getTime()); }

  get remainingCoupons(): number {
    return Math.max(0, this.props.couponsTotal - this.props.couponsUsed);
  }

  get isExpired(): boolean {
    return new Date() > this.props.endDate || this.props.status !== 'active';
  }

  redeemCoupon(): void {
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

  expire(): void {
    this.props.status = 'expired';
    this.props.updatedAt = new Date();
  }

  toPrimitives(): MembershipProps {
    return { ...this.props };
  }
}
