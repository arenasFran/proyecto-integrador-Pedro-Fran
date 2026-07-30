export type CreatePreferenceParams = {
  items: Array<{ title: string; quantity: number; unitPrice: number; id?: string }>;
  externalReference: string;
  backUrls: { success: string; failure: string; pending: string };
  notificationUrl?: string;
  payerEmail?: string;
  idempotencyKey?: string;
  expirationDateTo?: string;
};

export type CreatePreferenceResult = {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
};

export type GetPaymentResult = {
  id: string;
  status: string;
  statusDetail: string;
  transactionAmount: number;
  paymentMethodId: string;
  paymentTypeId?: string;
  payerEmail?: string;
  externalReference?: string;
  installments?: number;
  cardLastFourDigits?: string;
  cardIssuerId?: string;
  dateApproved?: string;
  operationType?: string;
  feeAmount?: number;
  netReceivedAmount?: number;
  totalPaidAmount?: number;
};

export type ValidateWebhookParams = {
  xSignature: string;
  xRequestId: string;
  dataId: string;
};

export interface IPaymentService {
  createPreference(params: CreatePreferenceParams): Promise<CreatePreferenceResult>;
  getPayment(paymentId: string): Promise<GetPaymentResult | null>;
  validateWebhookSignature(params: ValidateWebhookParams): boolean;
}
