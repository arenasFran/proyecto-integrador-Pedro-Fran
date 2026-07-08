import MercadoPagoConfig, { Preference, Payment, WebhookSignatureValidator } from 'mercadopago';
import { IPaymentService, CreatePreferenceParams, CreatePreferenceResult, GetPaymentResult, ValidateWebhookParams } from '../../application/ports/IPaymentService';

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
}
