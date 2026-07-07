export type MembershipStatus = 'active' | 'expired' | 'cancelled';
export type MembershipSource = 'client' | 'admin';

export type Membership = {
  id: string;
  userId: string;
  status: MembershipStatus;
  startDate: string;
  endDate: string;
  couponsTotal: number;
  couponsUsed: number;
  productDiscount: number;
  createdBy: MembershipSource;
  adminId?: string;
  createdAt: string;
  updatedAt: string;
};

export type MyMembershipResponse = {
  active: Membership | null;
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
