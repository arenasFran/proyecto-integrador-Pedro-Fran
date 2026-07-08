export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type PaymentType = 'appointment' | 'membership' | 'product_order';

export type Payment = {
  id: string;
  type: PaymentType;
  referenceId: string;
  status: PaymentStatus;
  mpPaymentId?: string;
  mpPreferenceId?: string;
  amount: number;
  currency: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type InitiatePaymentResponse = {
  preferenceId: string;
  initPoint: string;
  paymentId: string;
};

export type CreateSubscriptionResponse = {
  preapprovalId: string;
  initPoint: string;
};
