export type CreatePreferenceParams = {
  items: Array<{ title: string; quantity: number; unitPrice: number; id?: string }>;
  externalReference: string;
  backUrls: { success: string; failure: string; pending: string };
  notificationUrl?: string;
};

export type CreatePreferenceResult = {
  preferenceId: string;
  initPoint: string;
};

export type GetPaymentResult = {
  id: string;
  status: string;
  statusDetail: string;
  transactionAmount: number;
  paymentMethodId: string;
  payerEmail?: string;
};

export type ValidateWebhookParams = {
  xSignature: string;
  xRequestId: string;
  dataId: string;
};

export interface IPaymentService {
  createPreference(params: CreatePreferenceParams): Promise<CreatePreferenceResult>;
  getPayment(paymentId: string): Promise<GetPaymentResult>;
  validateWebhookSignature(params: ValidateWebhookParams): boolean;
}
