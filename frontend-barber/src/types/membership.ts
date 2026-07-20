export type MembershipStatus = 'active' | 'expired' | 'pending';
export type MembershipSource = 'client' | 'admin';
export type PaymentMethod = 'mercadopago' | 'local' | null;
export type BillingCycle = 'monthly' | 'onetime' | null;

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
  durationDays: number;
  billingCycle: BillingCycle;
  createdBy: MembershipSource;
  adminId?: string;
  mpPreapprovalId?: string;
  paymentMethod: PaymentMethod;
  paymentId?: string;
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
  durationDays?: number;
  billingCycle?: 'monthly' | 'onetime';
  paymentMethod?: 'local';
  paymentId?: string;
  price?: number;
};

export type MembershipTransaction = {
  id: string;
  userId: string;
  membershipId: string;
  amount: number;
  paymentMethod: 'mercadopago' | 'local';
  mpPaymentId?: string;
  createdBy: 'client' | 'admin';
  adminId?: string;
  createdAt: string;
};

export type MembershipWithUser = Membership & {
  user: { id: string; name: string; lastname: string; email: string } | null;
};

export type RedeemCouponPayload = {
  userId: string;
};

export type RedeemCouponResponse = {
  remainingCoupons: number;
  couponsUsed: number;
};
