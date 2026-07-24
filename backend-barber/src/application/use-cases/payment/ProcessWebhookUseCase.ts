import { Payment } from '../../../domain/entities/Payment';
import mongoose from 'mongoose';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoMembershipTransactionRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipTransactionRepository';
import { IPaymentService } from '../../ports/IPaymentService';
import { IEmailService } from '../../ports/IEmailService';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { Membership } from '../../../domain/entities/Membership';
import { getConfig } from '../../../infrastructure/config/env';
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
    private readonly membershipRepository: MongoMembershipRepository,
    private readonly transactionRepository: MongoMembershipTransactionRepository,
    private readonly mercadoPagoService: IPaymentService,
    private readonly emailService?: IEmailService,
    private readonly userRepository?: MongoUserRepository
  ) {
    this.appointmentHandler = appointmentHandler;
    this.membershipHandler = membershipHandler;
    this.productOrderHandler = productOrderHandler;
  }

  async execute(rawBody: unknown, xSignature: string, xRequestId: string, dataIdFromQuery: string): Promise<void> {
    const notifications = Array.isArray(rawBody) ? rawBody : [rawBody];

    for (const raw of notifications) {
      await this.processNotification(raw as { type?: string; topic?: string; action?: string; data?: { id?: string } }, xSignature, xRequestId, dataIdFromQuery);
    }
  }

  private async processNotification(
    notification: { type?: string; topic?: string; action?: string; data?: { id?: string } },
    xSignature: string,
    xRequestId: string,
    dataIdFromQuery: string
  ): Promise<void> {

    if (!notification || !notification.data?.id) {
      console.log('[MP-DEBUG-WEBHOOK] Webhook recibido SIN data.id — no se puede procesar');
      console.log('[MP-DEBUG-WEBHOOK] body raw:', JSON.stringify(notification));
      return;
    }

    const topic = notification.type || notification.topic;
    console.log('[MP-DEBUG-WEBHOOK] topic:', topic, '| action:', notification.action, '| data.id:', notification.data.id);

    if (topic === 'preapproval' || topic === 'subscription_preapproval') {
      console.log('[MP-DEBUG-WEBHOOK] Notificación de preapproval — data.id:', notification.data.id);
      await this.handlePreapprovalNotification(notification.data.id, xSignature, xRequestId);
      return;
    }

    if (topic === 'subscription_authorized_payment') {
      await this.processPaymentNotification(notification.data.id);
      return;
    }

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

  private async handlePreapprovalNotification(
    preapprovalId: string,
    _xSignature: string,
    _xRequestId: string
  ): Promise<void> {
    const mpPreapproval = await this.mercadoPagoService.getPreapproval(preapprovalId);
    if (!mpPreapproval) {
      console.log(`[MP-WEBHOOK] Preapproval ${preapprovalId} no encontrado en MP.`);
      return;
    }

    const userId = mpPreapproval.externalReference;
    if (!userId) {
      console.log(`[MP-WEBHOOK] Preapproval ${preapprovalId} sin externalReference — ignorando.`);
      return;
    }

    if (mpPreapproval.status === 'cancelled') {
      const membership = await this.membershipRepository.findByPreapprovalId(preapprovalId);
      if (membership && membership.status === 'active') {
        membership.cancel();
        await this.membershipRepository.save(membership);
        console.log(`[MP-WEBHOOK] Membresía ${membership.id} cancelada por cancelación de preapproval ${preapprovalId}.`);
      }
      return;
    }

    if (mpPreapproval.status === 'expired') {
      const membership = await this.membershipRepository.findByPreapprovalId(preapprovalId);
      if (membership && membership.status === 'active') {
        membership.expire();
        await this.membershipRepository.save(membership);
        console.log(`[MP-WEBHOOK] Membresía ${membership.id} expirada por vencimiento de preapproval ${preapprovalId}.`);
      }
      return;
    }

    if (mpPreapproval.status === 'paused') {
      console.log(`[MP-WEBHOOK] Preapproval ${preapprovalId} pausado — no se modifica la membresía local.`);
      return;
    }

    if (mpPreapproval.status === 'pending') {
      return;
    }

    if (mpPreapproval.status !== 'authorized') {
      console.log(`[MP-WEBHOOK] Preapproval ${preapprovalId} con estado desconocido: ${mpPreapproval.status} — ignorando.`);
      return;
    }

    const existingActive = await this.membershipRepository.findActiveByUser(userId);
    if (existingActive) {
      console.warn(`[MP-WEBHOOK] Preapproval ${preapprovalId} autorizada pero usuario ${userId} ya tiene membresía activa ${existingActive.id} — ignorando.`);
      return;
    }

    const config = getConfig();

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const pending = await this.membershipRepository.findPendingByUser(userId, session);
      if (pending) {
        pending.approve('system');
        await this.membershipRepository.save(pending, session);
        await this.transactionRepository.create({
          userId,
          membershipId: pending.id,
          amount: pending.price,
          paymentMethod: 'mercadopago',
          mpPaymentId: preapprovalId,
          createdBy: 'client',
        }, session);
        await session.commitTransaction();
        return;
      }

      const existingExpired = await this.membershipRepository.findAnyByUser(userId);
      const fallbackPrice = config.membershipPriceUyu;
      let membership: Membership;
      if (existingExpired && existingExpired.status === 'expired') {
        existingExpired.reactivate(existingExpired.price, 'mercadopago');
        existingExpired.toPrimitives();
        membership = existingExpired;
      } else {
        membership = Membership.create({
          userId,
          createdBy: 'client',
          price: fallbackPrice,
          mpPreapprovalId: preapprovalId,
          status: 'active',
          paymentMethod: 'mercadopago',
          billingCycle: 'monthly',
        });
      }
      const saved = await this.membershipRepository.save(membership, session);
      await this.transactionRepository.create({
        userId,
        membershipId: saved.id,
        amount: saved.price,
        paymentMethod: 'mercadopago',
        mpPaymentId: preapprovalId,
        createdBy: 'client',
      }, session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
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

    const existingTransaction = await this.transactionRepository.findByMpPaymentId(mpPayment.id);
    if (existingTransaction) {
      return;
    }

    const membership = await this.membershipRepository.findByPreapprovalId(mpPayment.preapprovalId);
    if (!membership) {
      console.log(`[MP-WEBHOOK] Pago de suscripción ${mpPayment.id} sin membresía asociada al preapproval ${mpPayment.preapprovalId} — ignorando (posible condición de carrera o membresía cancelada).`);
      return;
    }

    if (membership.status === 'expired' || membership.status === 'cancelled') {
      console.log(`[MP-WEBHOOK] Pago de suscripción ${mpPayment.id} para membresía ${membership.status} ${membership.id} — ignorando.`);
      return;
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      membership.renew();
      const saved = await this.membershipRepository.save(membership, session);
      await this.transactionRepository.create({
        userId: saved.userId,
        membershipId: saved.id,
        amount: saved.price,
        paymentMethod: 'mercadopago',
        mpPaymentId: mpPayment.id,
        createdBy: 'client',
      }, session);

      const subscriptionPayment = Payment.create({
        type: 'membership',
        referenceId: saved.id,
        amount: saved.price,
        userId: saved.userId,
      });
      subscriptionPayment.approve(mpPayment.id);
      await this.paymentRepository.save(subscriptionPayment, session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
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
