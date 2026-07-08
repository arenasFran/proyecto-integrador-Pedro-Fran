import MercadoPagoConfig, { Preference, Payment, PreApproval, WebhookSignatureValidator } from 'mercadopago';
import {
  IPaymentService,
  CreatePreferenceParams,
  CreatePreferenceResult,
  GetPaymentResult,
  ValidateWebhookParams,
  CreatePreapprovalParams,
  CreatePreapprovalResult,
  GetPreapprovalResult,
} from '../../application/ports/IPaymentService';

export class MercadoPagoService implements IPaymentService {
  private readonly config: MercadoPagoConfig;

  constructor(
    private readonly accessToken: string | undefined,
    private readonly webhookSecret?: string
  ) {
    this.config = new MercadoPagoConfig({ accessToken: accessToken ?? '' });
  }

  private ensureConfigured(): void {
    if (!this.accessToken) {
      throw new Error('MercadoPago no está configurado. Falta MP_ACCESS_TOKEN en el entorno.');
    }
  }

  async createPreference(params: CreatePreferenceParams): Promise<CreatePreferenceResult> {
    this.ensureConfigured();
    const preference = new Preference(this.config);

    const response = await preference.create({
      body: {
        items: params.items.map((item) => ({
          id: item.id ?? '',
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        })),
        external_reference: params.externalReference,
        back_urls: {
          success: params.backUrls.success,
          failure: params.backUrls.failure,
          pending: params.backUrls.pending,
        },
        notification_url: params.notificationUrl,
        auto_return: 'approved',
      },
    });

    return {
      preferenceId: response.id!,
      initPoint: response.init_point!,
    };
  }

  async getPayment(paymentId: string): Promise<GetPaymentResult> {
    this.ensureConfigured();
    const payment = new Payment(this.config);

    const response = await payment.get({ id: paymentId });

    return {
      id: response.id!.toString(),
      status: response.status!,
      statusDetail: response.status_detail!,
      transactionAmount: response.transaction_amount!,
      paymentMethodId: response.payment_method_id!,
      payerEmail: response.payer?.email,
      externalReference: response.external_reference,
      preapprovalId: response.preapproval_id,
    };
  }

  validateWebhookSignature(params: ValidateWebhookParams): boolean {
    if (!this.webhookSecret) {
      return false;
    }

    try {
      WebhookSignatureValidator.validate({
        xSignature: params.xSignature,
        xRequestId: params.xRequestId,
        dataId: params.dataId,
        secret: this.webhookSecret,
      });
      return true;
    } catch {
      return false;
    }
  }

  async createPreapproval(params: CreatePreapprovalParams): Promise<CreatePreapprovalResult> {
    this.ensureConfigured();
    const preapproval = new PreApproval(this.config);

    const response = await preapproval.create({
      body: {
        reason: params.reason,
        external_reference: params.externalReference,
        payer_email: params.payerEmail,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: params.transactionAmount,
          currency_id: 'UYU',
        },
        back_url: params.backUrl,
      },
    });

    return {
      preapprovalId: response.id!,
      initPoint: response.init_point!,
    };
  }

  async getPreapproval(preapprovalId: string): Promise<GetPreapprovalResult> {
    this.ensureConfigured();
    const preapproval = new PreApproval(this.config);

    const response = await preapproval.get({ id: preapprovalId });

    return {
      id: response.id!,
      status: response.status!,
      payerEmail: response.payer_email,
      externalReference: response.external_reference,
    };
  }

  async cancelPreapproval(preapprovalId: string): Promise<void> {
    this.ensureConfigured();
    const preapproval = new PreApproval(this.config);

    await preapproval.update({ id: preapprovalId, body: { status: 'cancelled' } });
  }
}
