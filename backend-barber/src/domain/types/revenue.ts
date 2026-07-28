export type RevenueSource = 'appointment' | 'product_order' | 'membership';

export interface RevenueEntryData {
  id: string;
  source: RevenueSource;
  amount: number;
  date: Date;
  referenceId: string;
  paymentId?: string;
  metadata?: {
    appointmentId?: string;
    orderId?: string;
    membershipId?: string;
    paymentId?: string;
    transactionId?: string;
    userId?: string;
  };
  createdAt: Date;
}
