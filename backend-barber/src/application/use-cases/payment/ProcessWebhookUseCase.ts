import { Payment } from '../../../domain/entities/Payment';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoOrderRepository } from '../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoProductRepository } from '../../../infrastructure/repositories/mongodb/MongoProductRepository';
import { IPaymentService } from '../../ports/IPaymentService';
import { IEmailService } from '../../ports/IEmailService';
import { IUserRepository } from '../../ports/IUserRepository';
import { Membership } from '../../../domain/entities/Membership';
import { getConfig } from '../../../infrastructure/config/env';

export class ProcessWebhookUseCase {
  constructor(
    private readonly paymentRepository: MongoPaymentRepository,
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly membershipRepository: MongoMembershipRepository,
    private readonly orderRepository: MongoOrderRepository,
    private readonly productRepository: MongoProductRepository,
    private readonly mercadoPagoService: IPaymentService,
    private readonly emailService?: IEmailService,
    private readonly userRepository?: IUserRepository
  ) {}

  async execute(rawBody: unknown, xSignature: string, xRequestId: string): Promise<void> {
    const notification = rawBody as { type?: string; topic?: string; action?: string; data?: { id?: string } };

    if (!notification || !notification.data?.id) {
      console.log('[MP-DEBUG-WEBHOOK] Webhook recibido SIN data.id — no se puede procesar');
      console.log('[MP-DEBUG-WEBHOOK] body raw:', JSON.stringify(rawBody));
      return;
    }

    const topic = notification.type || notification.topic;
    console.log('[MP-DEBUG-WEBHOOK] topic:', topic, '| action:', notification.action, '| data.id:', notification.data.id);

    if (topic === 'preapproval' || topic === 'subscription_preapproval') {
      console.log('[MP-DEBUG-WEBHOOK] Notificación de preapproval — data.id:', notification.data.id);
      await this.handlePreapprovalNotification(notification.data.id, xSignature, xRequestId);
      return;
    }

    if (topic !== 'payment') {
      console.log('[MP-DEBUG-WEBHOOK] Topic desconocido:', topic, '— ignorando');
      return;
    }

    console.log('[MP-DEBUG-WEBHOOK] Notificación de pago recibida — payment_id:', notification.data.id);

    const dataId = notification.data.id;
    const valid = this.mercadoPagoService.validateWebhookSignature({
      xSignature,
      xRequestId,
      dataId,
    });
    console.log('[MP-DEBUG-WEBHOOK] HMAC validation result:', valid);
    if (!valid) {
      console.error('[MP-DEBUG-WEBHOOK] Firma HMAC inválida — xSignature:', xSignature, 'xRequestId:', xRequestId, 'dataId:', dataId);
      throw new Error('Firma HMAC inválida en el webhook de MercadoPago.');
    }

    const mpPaymentId = notification.data.id;
    await this.debugFetchPayment(mpPaymentId);

    const mpPayment = await this.mercadoPagoService.getPayment(mpPaymentId);
    if (!mpPayment) {
      console.log(`[MP-DEBUG-WEBHOOK] Pago ${mpPaymentId} no encontrado en MercadoPago — ignorando.`);
      return;
    }

    if (mpPayment.preapprovalId) {
      await this.handleSubscriptionPayment(mpPayment);
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

    switch (mpPayment.status) {
      case 'approved':
        payment.approve(mpPaymentId);
        await this.paymentRepository.save(payment);
        await this.handleApproved(payment, mpStatusDetail, paymentMethod);
        break;
      case 'rejected':
        payment.reject();
        await this.paymentRepository.save(payment);
        await this.handleRejected(payment);
        break;
      case 'cancelled':
      case 'by_collector':
        payment.cancel();
        await this.paymentRepository.save(payment);
        await this.handleCancelled(payment);
        break;
      case 'refunded':
        payment.approve(mpPaymentId);
        await this.paymentRepository.save(payment);
        await this.handleRefunded(payment, mpStatusDetail, paymentMethod);
        break;
      case 'charge_back':
        payment.approve(mpPaymentId);
        await this.paymentRepository.save(payment);
        await this.handleChargeBack(payment, mpStatusDetail, paymentMethod);
        break;
      case 'in_mediation':
        payment.approve(mpPaymentId);
        await this.paymentRepository.save(payment);
        await this.handleInMediation(payment, mpStatusDetail, paymentMethod);
        break;
      default:
        break;
    }
  }

  private async debugFetchPayment(paymentId: string): Promise<void> {
    try {
      const token = getConfig().mpAccessToken;
      if (!token) {
        console.error('[MP-DEBUG-WEBHOOK] MP_ACCESS_TOKEN no configurado para debug');
        return;
      }

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      console.log('[MP-DEBUG-WEBHOOK] ===== DETALLE COMPLETO DEL PAGO =====');
      console.log('[MP-DEBUG-WEBHOOK] id:', data.id);
      console.log('[MP-DEBUG-WEBHOOK] status:', data.status);
      console.log('[MP-DEBUG-WEBHOOK] status_detail:', data.status_detail);
      console.log('[MP-DEBUG-WEBHOOK] status_reason (raw):', JSON.stringify(data.status_reason ?? data.statusDetail ?? null));
      console.log('[MP-DEBUG-WEBHOOK] status_code:', data.status_code);
      console.log('[MP-DEBUG-WEBHOOK] date_created:', data.date_created);
      console.log('[MP-DEBUG-WEBHOOK] date_approved:', data.date_approved);
      console.log('[MP-DEBUG-WEBHOOK] payment_method:', JSON.stringify({
        id: data.payment_method?.id,
        type: data.payment_method?.type,
        issuer_id: data.payment_method?.issuer_id,
      }));
      console.log('[MP-DEBUG-WEBHOOK] transaction_amount:', data.transaction_amount);
      console.log('[MP-DEBUG-WEBHOOK] transaction_details:', JSON.stringify(data.transaction_details));
      console.log('[MP-DEBUG-WEBHOOK] processing_mode:', data.processing_mode);
      console.log('[MP-DEBUG-WEBHOOK] payer:', JSON.stringify({ id: data.payer?.id, email: data.payer?.email, type: data.payer?.type, identification: data.payer?.identification }));
      console.log('[MP-DEBUG-WEBHOOK] collector:', JSON.stringify(data.collector ?? data.collector_id));
      console.log('[MP-DEBUG-WEBHOOK] live_mode:', data.live_mode);
      console.log('[MP-DEBUG-WEBHOOK] error:', JSON.stringify(data.error));
      console.log('[MP-DEBUG-WEBHOOK] cause:', JSON.stringify(data.cause));
      console.log('[MP-DEBUG-WEBHOOK] api_response:', JSON.stringify(data.api_response));
      console.log('[MP-DEBUG-WEBHOOK] response completo:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[MP-DEBUG-WEBHOOK] Error al obtener detalle del pago desde API MP:', error);
    }
  }

  private async handlePreapprovalNotification(
    preapprovalId: string,
    xSignature: string,
    xRequestId: string
  ): Promise<void> {
    const valid = this.mercadoPagoService.validateWebhookSignature({
      xSignature,
      xRequestId,
      dataId: preapprovalId,
    });
    if (!valid) {
      throw new Error('Firma HMAC inválida en webhook de preapproval.');
    }

    const mpPreapproval = await this.mercadoPagoService.getPreapproval(preapprovalId);
    if (!mpPreapproval || mpPreapproval.status !== 'authorized') {
      return;
    }

    const userId = mpPreapproval.externalReference;
    if (!userId) {
      return;
    }

    const existing = await this.membershipRepository.findActiveByUser(userId);
    if (!existing) {
      const config = getConfig();
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);

      const membership = Membership.create({
        userId,
        createdBy: 'client',
        price: config.membershipPriceUyu,
        couponsTotal: 4,
        productDiscount: 10,
        mpPreapprovalId: preapprovalId,
        nextBillingDate: nextDate,
      });
      await this.membershipRepository.save(membership);
    }
  }

  private async handleSubscriptionPayment(mpPayment: {
    id: string;
    status: string;
    preapprovalId?: string;
    externalReference?: string;
  }): Promise<void> {
    if (mpPayment.status !== 'approved' || !mpPayment.preapprovalId) {
      return;
    }

    const membership = await this.membershipRepository.findByPreapprovalId(mpPayment.preapprovalId);
    if (!membership) {
      return;
    }

    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + 1);

    membership.renew(nextDate);
    await this.membershipRepository.save(membership);
  }

  private async handleApproved(payment: Payment, mpStatusDetail?: string, paymentMethod?: string): Promise<void> {
    switch (payment.type) {
      case 'appointment': {
        const appointment = await this.appointmentRepository.findById(payment.referenceId);
        if (appointment && appointment.paymentStatus !== 'Pagado') {
          appointment.pay();
          await this.appointmentRepository.updateStatus(payment.referenceId, {
            paymentStatus: 'Pagado',
            statusHistoryEntry: { status: appointment.status, timestamp: new Date(), actor: 'system' },
          });
        }
        break;
      }
      case 'membership': {
        const existing = await this.membershipRepository.findActiveByUser(payment.userId);
        if (!existing) {
          const config = getConfig();
          const membership = Membership.create({
            userId: payment.userId,
            createdBy: 'client',
            couponsTotal: 4,
            productDiscount: 10,
          });
          await this.membershipRepository.save(membership);
        }
        break;
      }
      case 'product_order': {
        const order = await this.orderRepository.findById(payment.referenceId);
        if (order && order.status === 'pending') {
          order.pay(payment.id);
          order.updateMpMetadata(payment.mpPaymentId || '', mpStatusDetail, paymentMethod);
          await this.orderRepository.save(order);
          for (const item of order.items) {
            await this.productRepository.atomicDecreaseStock(item.productId, item.quantity);
          }
          const userEmail = await this.getUserEmail(payment.userId);
          if (userEmail && this.emailService) {
            this.emailService.sendMail({
              to: userEmail,
              subject: 'Pago aprobado - Barbería SA',
              html: `<p>Tu pago por la orden <strong>#${order.id}</strong> fue aprobado.</p>
<p>Total: $${order.total}</p>
<p>Gracias por tu compra.</p>`,
            }).catch(() => {});
          }
        }
        break;
      }
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
    if (payment.type === 'product_order') {
      const order = await this.orderRepository.findById(payment.referenceId);
      if (order && order.status === 'pending') {
        order.cancel();
        await this.orderRepository.save(order);
      }
    }
    await this.sendPaymentNotification(payment, 'rechazado');
  }

  private async handleCancelled(payment: Payment): Promise<void> {
    if (payment.type === 'product_order') {
      const order = await this.orderRepository.findById(payment.referenceId);
      if (order && order.status === 'pending') {
        order.cancel('system');
        await this.orderRepository.save(order);
      }
    }
    await this.sendPaymentNotification(payment, 'cancelado');
  }

  private async handleRefunded(payment: Payment, mpStatusDetail?: string, paymentMethod?: string): Promise<void> {
    if (payment.type === 'product_order') {
      const order = await this.orderRepository.findById(payment.referenceId);
      if (order && order.status === 'paid') {
        order.refund();
        order.updateMpMetadata(payment.mpPaymentId || '', mpStatusDetail, paymentMethod);
        await this.orderRepository.save(order);
        for (const item of order.items) {
          await this.productRepository.atomicIncreaseStock(item.productId, item.quantity);
        }
        const userEmail = await this.getUserEmail(payment.userId);
        if (userEmail && this.emailService) {
          this.emailService.sendMail({
            to: userEmail,
            subject: 'Reembolso procesado - Barbería SA',
            html: `<p>Tu pago por la orden <strong>#${order.id}</strong> fue reembolsado.</p>
<p>Total: $${order.total}</p>
<p>El importe será acreditado en tu método de pago.</p>`,
          }).catch(() => {});
        }
      }
    }
    await this.sendPaymentNotification(payment, 'reembolsado');
  }

  private async handleChargeBack(payment: Payment, mpStatusDetail?: string, paymentMethod?: string): Promise<void> {
    if (payment.type === 'product_order') {
      const order = await this.orderRepository.findById(payment.referenceId);
      if (order) {
        order.markAsDisputed();
        order.updateMpMetadata(payment.mpPaymentId || '', mpStatusDetail, paymentMethod);
        await this.orderRepository.save(order);
      }
    }
    console.log(`[MP-WEBHOOK] Chargeback detectado para payment ${payment.id} - orden ${payment.referenceId}`);
  }

  private async handleInMediation(payment: Payment, mpStatusDetail?: string, paymentMethod?: string): Promise<void> {
    if (payment.type === 'product_order') {
      const order = await this.orderRepository.findById(payment.referenceId);
      if (order) {
        order.markAsDisputed();
        order.updateMpMetadata(payment.mpPaymentId || '', mpStatusDetail, paymentMethod);
        await this.orderRepository.save(order);
      }
    }
    console.log(`[MP-WEBHOOK] Mediación iniciada para payment ${payment.id} - orden ${payment.referenceId}`);
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
