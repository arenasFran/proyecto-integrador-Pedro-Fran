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
      back_urls: {
        success: params.backUrls.success,
        failure: params.backUrls.failure,
        pending: params.backUrls.pending,
      },
      notification_url: params.notificationUrl,
    };

    console.log('[MP-DEBUG] ===== CREANDO PREFERENCIA =====');
    console.log('[MP-DEBUG] AccessToken (primeros 15 chars):', this.accessToken?.substring(0, 15));
    console.log('[MP-DEBUG] Environment:', this.accessToken?.startsWith('TEST') ? 'TEST' : 'PRODUCTION');
    console.log('[MP-DEBUG] notification_url:', params.notificationUrl);
    console.log('[MP-DEBUG] back_urls:', JSON.stringify(params.backUrls));
    console.log('[MP-DEBUG] Body completo:', JSON.stringify(body, null, 2));

    const requestOptions = params.idempotencyKey
      ? { idempotencyKey: params.idempotencyKey }
      : undefined;

    try {
      const response = await preference.create({ body, requestOptions });

      const responseAny = response as any;

      console.log('[MP-DEBUG] ===== RESPUESTA PREFERENCIA =====');
      console.log('[MP-DEBUG] response.id:', responseAny.id);
      console.log('[MP-DEBUG] collector_id:', responseAny.collector_id, '(quien recibe el pago)');
      console.log('[MP-DEBUG] collector es test?', String(responseAny.collector_id).startsWith('353'));
      console.log('[MP-DEBUG] live_mode:', responseAny.live_mode, '(false=test, true=produccion)');
      console.log('[MP-DEBUG] client_id:', responseAny.client_id);
      console.log('[MP-DEBUG] init_point:', responseAny.init_point);
      console.log('[MP-DEBUG] sandbox_init_point:', responseAny.sandbox_init_point);
      console.log('[MP-DEBUG] payer:', JSON.stringify(responseAny.payer));
      console.log('[MP-DEBUG] site_id:', responseAny.site_id);
      console.log('[MP-DEBUG] operation_type:', responseAny.operation_type);
      console.log('[MP-DEBUG] items[0].currency_id:', responseAny.items?.[0]?.currency_id);
      console.log('[MP-DEBUG] Response completo:', JSON.stringify(responseAny, null, 2));

      return {
        preferenceId: response.id!,
        initPoint: response.init_point!,
        sandboxInitPoint: response.sandbox_init_point,
      };
    } catch (error: any) {
      console.error('[MP-DEBUG] ===== ERROR CREANDO PREFERENCIA =====');
      console.error('[MP-DEBUG] error.message:', error?.message);
      console.error('[MP-DEBUG] error.name:', error?.name);
      console.error('[MP-DEBUG] error.stack:', error?.stack);
      console.error('[MP-DEBUG] error.cause:', error?.cause);
      console.error('[MP-DEBUG] error.status:', error?.status);
      if (error?.details) {
        console.error('[MP-DEBUG] error.details:', JSON.stringify(error.details));
      }
      if (error?.response) {
        console.error('[MP-DEBUG] error.response:', JSON.stringify(error.response));
      }
      throw error;
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
        payerEmail: response.payer?.email,
        externalReference: response.external_reference,
        preapprovalId: response.preapproval_id,
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
      const ts = params.xSignature?.match(/ts=(\d+)/)?.[1] || '?';
      const manifest = `id:${params.dataId};request-id:${params.xRequestId};ts:${ts};`;
      console.log('[MP-DEBUG-WEBHOOK] HMAC inválida. Verificá que el secret en el Dashboard de MP (Tus integraciones → Webhooks) coincida exactamente con MP_WEBHOOK_SECRET del .env');
      console.log('[MP-DEBUG-WEBHOOK] Manifest usado:', manifest);
      console.log('[MP-DEBUG-WEBHOOK] xSignature:', params.xSignature);
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
