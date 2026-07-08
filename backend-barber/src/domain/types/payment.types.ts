export type PaymentType = 'appointment' | 'membership' | 'product_order';

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type PaymentData = {
  id: string;
  type: PaymentType;
  referenceId: string;
  status: PaymentStatus;
  mpPaymentId?: string;
  mpPreferenceId?: string;
  amount: number;
  currency: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};
