export type PaymentType = 'appointment' | 'membership' | 'product_order';

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded' | 'charge_back' | 'in_mediation';

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
