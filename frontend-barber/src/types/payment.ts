export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded' | 'charge_back' | 'in_mediation';

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
  mpStatusDetail?: string;
  mpPaymentMethodId?: string;
  mpPaymentTypeId?: string;
  mpInstallments?: number;
  mpTotalPaidAmount?: number;
  mpNetReceivedAmount?: number;
  mpFeeAmount?: number;
  mpCardLastFourDigits?: string;
  mpCardIssuerId?: string;
  mpDateApproved?: string;
  mpOperationType?: string;
};

export type InitiatePaymentResponse = {
  preferenceId?: string;
  initPoint?: string;
  sandboxInitPoint?: string;
  paymentId?: string;
  orderId: string;
};
