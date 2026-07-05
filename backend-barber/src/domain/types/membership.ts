export type MembershipStatus = 'active' | 'expired' | 'cancelled';

export type MembershipSource = 'client' | 'admin';

export type MembershipData = {
  id: string;
  userId: string;
  status: MembershipStatus;
  startDate: Date;
  endDate: Date;
  couponsTotal: number;
  couponsUsed: number;
  productDiscount: number;
  createdBy: MembershipSource;
  adminId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export const MEMBERSHIP_DEFAULTS = {
  couponsTotal: 4,
  productDiscount: 10,
  durationDays: 30,
} as const;
