export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'pending';

export type MembershipSource = 'client' | 'admin';

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
  autoRenew: boolean;
  createdBy: MembershipSource;
  adminId?: string;
  mpPreapprovalId?: string;
  nextBillingDate?: Date;
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
