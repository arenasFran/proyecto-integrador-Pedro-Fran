export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'pending';
export type MembershipSource = 'client' | 'admin';

export type Membership = {
  id: string;
  userId: string;
  status: MembershipStatus;
  price: number;
  startDate: string;
  endDate: string;
  couponsTotal: number;
  couponsUsed: number;
  productDiscount: number;
  autoRenew: boolean;
  createdBy: MembershipSource;
  adminId?: string;
  mpPreapprovalId?: string;
  nextBillingDate?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type MyMembershipResponse = {
  active: Membership | null;
  pending: Membership | null;
  history: Membership[];
};

export type CreateMembershipPayload = {
  userId: string;
  couponsTotal?: number;
  productDiscount?: number;
};

export type RedeemCouponPayload = {
  userId: string;
};

export type RedeemCouponResponse = {
  remainingCoupons: number;
  couponsUsed: number;
};

export type MembershipWithUser = Membership & {
  user: { id: string; name: string; lastname: string; email: string } | null;
};
