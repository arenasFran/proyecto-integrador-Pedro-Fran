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
  externalReference?: string;
  preapprovalId?: string;
};

export type ValidateWebhookParams = {
  xSignature: string;
  xRequestId: string;
  dataId: string;
};

export type CreatePreapprovalParams = {
  externalReference: string;
  payerEmail: string;
  backUrl: string;
  transactionAmount: number;
  reason: string;
};

export type CreatePreapprovalResult = {
  preapprovalId: string;
  initPoint: string;
};

export type GetPreapprovalResult = {
  id: string;
  status: string;
  payerEmail?: string;
  externalReference?: string;
};

export interface IPaymentService {
  createPreference(params: CreatePreferenceParams): Promise<CreatePreferenceResult>;
  getPayment(paymentId: string): Promise<GetPaymentResult>;
  validateWebhookSignature(params: ValidateWebhookParams): boolean;
  createPreapproval(params: CreatePreapprovalParams): Promise<CreatePreapprovalResult>;
  getPreapproval(preapprovalId: string): Promise<GetPreapprovalResult>;
  cancelPreapproval(preapprovalId: string): Promise<void>;
}
