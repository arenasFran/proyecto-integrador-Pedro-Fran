export type MembershipStatus = 'active' | 'expired' | 'pending' | 'cancelled';

export type MembershipSource = 'client' | 'admin';

export type PaymentMethod = 'mercadopago' | 'local' | null;

export type BillingCycle = 'monthly' | 'onetime' | null;

export type MembershipData = {
  id: string;
  userId: string;
  status: MembershipStatus;
  price: number;
  startDate: Date;
  endDate: Date;
  couponsTotal: number;
  couponsUsed: number;
  productDiscount: number;
  durationDays: number;
  billingCycle: BillingCycle;
  createdBy: MembershipSource;
  adminId?: string;
  mpPreapprovalId?: string;
  paymentMethod: PaymentMethod;
  paymentId?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const MEMBERSHIP_DEFAULTS = {
  couponsTotal: 4,
  productDiscount: 10,
  durationDays: 30,
} as const;
