import MercadoPagoConfig, { Preference, Payment, WebhookSignatureValidator } from 'mercadopago';
import {
  IPaymentService,
  CreatePreferenceParams,
  CreatePreferenceResult,
  GetPaymentResult,
  ValidateWebhookParams,
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

    const isLocalhost = /localhost|127\.0\.0\.1|192\.168\./.test(params.backUrls.success);

    const body = {
      items: params.items.map((item) => ({
        id: item.id ?? '',
        title: item.title,
        description: item.title,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        currency_id: 'UYU',
      })),
      payer: params.payerEmail ? { email: params.payerEmail } : undefined,
      external_reference: params.externalReference,
      statement_descriptor: 'Barbería',
      binary_mode: true,
      ...(isLocalhost ? {} : {
        back_urls: {
          success: params.backUrls.success,
          failure: params.backUrls.failure,
          pending: params.backUrls.pending,
        },
        auto_return: 'approved',
      }),
      notification_url: params.notificationUrl,
      ...(params.expirationDateTo ? { expires: true, expiration_date_to: params.expirationDateTo } : {}),
    };

    const requestOptions = params.idempotencyKey
      ? { idempotencyKey: params.idempotencyKey }
      : undefined;

    try {
      const response = await preference.create({ body, requestOptions });

      return {
        preferenceId: response.id!,
        initPoint: response.init_point!,
        sandboxInitPoint: response.sandbox_init_point,
      };
    } catch (error: any) {
      console.error('Error creando preferencia en MercadoPago:', error?.message || error?.cause || 'Error desconocido');
      throw new Error(error?.message || error?.cause || 'Error creando preferencia en MercadoPago');
    }
  }

  async getPayment(paymentId: string): Promise<GetPaymentResult | null> {
    this.ensureConfigured();
    const payment = new Payment(this.config);

    try {
      const response = await payment.get({ id: paymentId });

      if (!response || !response.id) {
        return null;
      }

      return {
        id: response.id!.toString(),
        status: response.status!,
        statusDetail: response.status_detail!,
        transactionAmount: response.transaction_amount!,
        paymentMethodId: response.payment_method_id!,
        paymentTypeId: response.payment_type_id,
        payerEmail: response.payer?.email,
        externalReference: response.external_reference,
        installments: (response as any).installments,
        cardLastFourDigits: (response as any).card?.last_four_digits,
        cardIssuerId: (response as any).issuer_id,
        dateApproved: (response as any).date_approved,
        operationType: (response as any).operation_type,
        feeAmount: (response as any).fee_details?.[0]?.amount,
        netReceivedAmount: (response as any).transaction_details?.net_received_amount,
        totalPaidAmount: (response as any).transaction_details?.total_paid_amount,
      };
    } catch {
      return null;
    }
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
      console.error('[PaymentWebhook] HMAC inválida para data.id:', params.dataId);
      return false;
    }
  }
}
