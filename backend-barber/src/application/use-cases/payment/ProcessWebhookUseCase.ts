import { Payment } from '../../../domain/entities/Payment';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { IPaymentService } from '../../ports/IPaymentService';
import { IEmailService } from '../../ports/IEmailService';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { AppointmentPaymentHandler } from './handlers/AppointmentPaymentHandler';
import { MembershipPaymentHandler } from './handlers/MembershipPaymentHandler';
import { ProductOrderPaymentHandler } from './handlers/ProductOrderPaymentHandler';

export class ProcessWebhookUseCase {
  private readonly appointmentHandler: AppointmentPaymentHandler;
  private readonly membershipHandler: MembershipPaymentHandler;
  private readonly productOrderHandler: ProductOrderPaymentHandler;

  constructor(
    private readonly paymentRepository: MongoPaymentRepository,
    appointmentHandler: AppointmentPaymentHandler,
    membershipHandler: MembershipPaymentHandler,
    productOrderHandler: ProductOrderPaymentHandler,
    private readonly mercadoPagoService: IPaymentService,
    private readonly emailService?: IEmailService,
    private readonly userRepository?: MongoUserRepository,
  ) {
    this.appointmentHandler = appointmentHandler;
    this.membershipHandler = membershipHandler;
    this.productOrderHandler = productOrderHandler;
  }

  async execute(rawBody: unknown, _xSignature: string, _xRequestId: string, _dataIdFromQuery: string): Promise<void> {
    const notifications = Array.isArray(rawBody) ? rawBody : [rawBody];

    for (const raw of notifications) {
      await this.processNotification(raw as { type?: string; topic?: string; action?: string; data?: { id?: string } });
    }
  }

  private async processNotification(
    notification: { type?: string; topic?: string; action?: string; data?: { id?: string } },
  ): Promise<void> {

    if (!notification || !notification.data?.id) {
      console.log('[MP-DEBUG-WEBHOOK] Webhook recibido SIN data.id — no se puede procesar');
      console.log('[MP-DEBUG-WEBHOOK] body raw:', JSON.stringify(notification));
      return;
    }

    const topic = notification.type || notification.topic;
    console.log('[MP-DEBUG-WEBHOOK] topic:', topic, '| action:', notification.action, '| data.id:', notification.data.id);

    if (topic === 'payment') {
      await this.processPaymentNotification(notification.data.id);
      return;
    }

    if (topic === 'topic_chargebacks_wh') {
      await this.handleChargebackNotification(notification.data.id);
      return;
    }

    if (topic === 'topic_merchant_order_wh') {
      console.log('[MP-WEBHOOK] Notificación de merchant_order — data.id:', notification.data.id);
      return;
    }

    console.log('[MP-WEBHOOK] Topic desconocido:', topic, '— ignorando');
  }

  private async processPaymentNotification(mpPaymentId: string): Promise<void> {
    console.log('[MP-DEBUG-WEBHOOK] Notificación de pago recibida — payment_id:', mpPaymentId);

    const mpPayment = await this.mercadoPagoService.getPayment(mpPaymentId);
    if (!mpPayment) {
      console.log(`[MP-DEBUG-WEBHOOK] Pago ${mpPaymentId} no encontrado en MercadoPago — ignorando.`);
      return;
    }

    let payment: Payment | null = null;

    payment = await this.paymentRepository.findByMpPaymentId(mpPaymentId);

    if (!payment && mpPayment.externalReference) {
      payment = await this.paymentRepository.findById(mpPayment.externalReference);
    }

    if (!payment) {
      return;
    }

    const mpStatusDetail = mpPayment.statusDetail;
    const paymentMethod = mpPayment.paymentMethodId;

    const enrichmentData = {
      mpStatusDetail: mpPayment.statusDetail,
      mpPaymentMethodId: mpPayment.paymentMethodId,
      mpPaymentTypeId: mpPayment.paymentTypeId,
      mpInstallments: mpPayment.installments,
      mpTotalPaidAmount: mpPayment.totalPaidAmount,
      mpNetReceivedAmount: mpPayment.netReceivedAmount,
      mpFeeAmount: mpPayment.feeAmount,
      mpCardLastFourDigits: mpPayment.cardLastFourDigits,
      mpCardIssuerId: mpPayment.cardIssuerId,
      mpDateApproved: mpPayment.dateApproved ? new Date(mpPayment.dateApproved) : undefined,
      mpOperationType: mpPayment.operationType,
    };

    switch (mpPayment.status) {
      case 'approved':
        payment.approve(mpPaymentId);
        payment.enrich(enrichmentData);
        await this.paymentRepository.save(payment);
        await this.handleApproved(payment, mpStatusDetail, paymentMethod);
        break;
      case 'rejected':
        payment.reject();
        payment.enrich({ mpStatusDetail: mpPayment.statusDetail, mpPaymentMethodId: mpPayment.paymentMethodId });
        await this.paymentRepository.save(payment);
        await this.handleRejected(payment);
        break;
      case 'cancelled':
      case 'by_collector':
        payment.cancel();
        payment.enrich({ mpStatusDetail: mpPayment.statusDetail });
        await this.paymentRepository.save(payment);
        await this.handleCancelled(payment);
        break;
      case 'refunded':
        payment.refund(mpPaymentId);
        payment.enrich(enrichmentData);
        await this.paymentRepository.save(payment);
        await this.handleRefunded(payment, mpStatusDetail, paymentMethod);
        break;
      case 'charge_back':
        payment.chargeBack(mpPaymentId);
        payment.enrich(enrichmentData);
        await this.paymentRepository.save(payment);
        await this.handleChargeBack(payment, mpStatusDetail, paymentMethod);
        break;
      case 'in_mediation':
        payment.inMediation(mpPaymentId);
        payment.enrich(enrichmentData);
        await this.paymentRepository.save(payment);
        await this.handleInMediation(payment, mpStatusDetail, paymentMethod);
        break;
      case 'in_process':
        console.log(`[MP-WEBHOOK] Pago ${mpPaymentId} en proceso (in_process) — status_detail: ${mpStatusDetail}. Esperando resolución.`);
        break;
      case 'pending':
        if (mpStatusDetail === 'pending_waiting_payment' || mpStatusDetail === 'pending_waiting_transfer') {
          console.log(`[MP-WEBHOOK] Pago ${mpPaymentId} pendiente de pago offline — status_detail: ${mpStatusDetail}`);
        } else {
          console.log(`[MP-WEBHOOK] Pago ${mpPaymentId} en estado pending — status_detail: ${mpStatusDetail}`);
        }
        break;
      default:
        break;
    }
  }

  private async handleChargebackNotification(chargebackId: string): Promise<void> {
    console.warn(`[MP-WEBHOOK] Chargeback recibido: ${chargebackId} — consultando detalle...`);
    try {
      console.warn(`[MP-WEBHOOK] Chargeback ${chargebackId} requiere acción manual.`);
    } catch (error) {
      console.error('[MP-WEBHOOK] Error procesando chargeback:', error);
    }
  }

  private async handleApproved(payment: Payment, mpStatusDetail?: string, paymentMethod?: string): Promise<void> {
    if (payment.type === 'appointment') {
      await this.appointmentHandler.handleApproved(payment);
    } else if (payment.type === 'membership') {
      await this.membershipHandler.handleApproved(payment);
    } else if (payment.type === 'product_order') {
      await this.productOrderHandler.handleApproved(payment, mpStatusDetail, paymentMethod);
    }
  }

  private async sendPaymentNotification(payment: Payment, statusText: string): Promise<void> {
    const userEmail = await this.getUserEmail(payment.userId);
    if (!userEmail || !this.emailService) return;
    this.emailService.sendMail({
      to: userEmail,
      subject: `Pago ${statusText} - Barbería SA`,
      html: `<p>Tu pago de $${payment.amount} fue ${statusText}.</p>`,
    }).catch(() => {});
  }

  private async handleRejected(payment: Payment): Promise<void> {
    if (payment.type === 'appointment') {
      await this.appointmentHandler.handleRejected(payment);
    } else if (payment.type === 'product_order') {
      await this.productOrderHandler.handleRejected(payment);
    }
    await this.sendPaymentNotification(payment, 'rechazado');
  }

  private async handleCancelled(payment: Payment): Promise<void> {
    if (payment.type === 'appointment') {
      await this.appointmentHandler.handleCancelled(payment);
    } else if (payment.type === 'product_order') {
      await this.productOrderHandler.handleCancelled(payment);
    }
    await this.sendPaymentNotification(payment, 'cancelado');
  }

  private async handleRefunded(payment: Payment, mpStatusDetail?: string, paymentMethod?: string): Promise<void> {
    if (payment.type === 'appointment') {
      await this.appointmentHandler.handleRefunded(payment);
    } else if (payment.type === 'product_order') {
      await this.productOrderHandler.handleRefunded(payment, mpStatusDetail, paymentMethod);
    }
    await this.sendPaymentNotification(payment, 'reembolsado');
  }

  private async handleChargeBack(payment: Payment, mpStatusDetail?: string, paymentMethod?: string): Promise<void> {
    if (payment.type === 'appointment') {
      await this.appointmentHandler.handleChargeBack(payment);
    } else if (payment.type === 'product_order') {
      await this.productOrderHandler.handleChargeBack(payment, mpStatusDetail, paymentMethod);
    }
    console.log(`[MP-WEBHOOK] Chargeback detectado para payment ${payment.id} - referencia ${payment.referenceId}`);
  }

  private async handleInMediation(payment: Payment, mpStatusDetail?: string, paymentMethod?: string): Promise<void> {
    if (payment.type === 'product_order') {
      await this.productOrderHandler.handleInMediation(payment, mpStatusDetail, paymentMethod);
    }
    console.log(`[MP-WEBHOOK] Mediación iniciada para payment ${payment.id} - referencia ${payment.referenceId}`);
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    if (!this.userRepository) return null;
    try {
      return await this.userRepository.findEmailById(userId);
    } catch {
      return null;
    }
  }
}
