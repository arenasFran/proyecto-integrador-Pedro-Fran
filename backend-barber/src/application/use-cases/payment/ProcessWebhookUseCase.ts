import { Payment } from '../../../domain/entities/Payment';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoOrderRepository } from '../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { IPaymentService } from '../../ports/IPaymentService';
import { Membership } from '../../../domain/entities/Membership';
import { getConfig } from '../../../infrastructure/config/env';

export class ProcessWebhookUseCase {
  constructor(
    private readonly paymentRepository: MongoPaymentRepository,
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly membershipRepository: MongoMembershipRepository,
    private readonly orderRepository: MongoOrderRepository,
    private readonly mercadoPagoService: IPaymentService
  ) {}

  async execute(rawBody: unknown, xSignature: string, xRequestId: string): Promise<void> {
    const notification = rawBody as { type?: string; action?: string; data?: { id?: string } };
    if (!notification || notification.type !== 'payment' || !notification.data?.id) {
      return;
    }

    const dataId = notification.data.id;
    const valid = this.mercadoPagoService.validateWebhookSignature({
      xSignature,
      xRequestId,
      dataId,
    });
    if (!valid) {
      throw new Error('Firma HMAC inválida en el webhook de MercadoPago.');
    }

    const mpPaymentId = notification.data.id;
    const mpPayment = await this.mercadoPagoService.getPayment(mpPaymentId);
    if (!mpPayment) {
      throw new Error(`Pago ${mpPaymentId} no encontrado en MercadoPago.`);
    }

    let payment: Payment | null = null;

    payment = await this.paymentRepository.findByMpPaymentId(mpPaymentId);

    if (!payment && mpPayment.externalReference) {
      payment = await this.paymentRepository.findById(mpPayment.externalReference);
    }

    if (!payment) {
      return;
    }

    switch (mpPayment.status) {
      case 'approved':
        payment.approve(mpPaymentId);
        await this.paymentRepository.save(payment);
        await this.handleApproved(payment);
        break;
      case 'rejected':
        payment.reject();
        await this.paymentRepository.save(payment);
        await this.handleRejected(payment);
        break;
      case 'cancelled':
        payment.cancel();
        await this.paymentRepository.save(payment);
        await this.handleCancelled(payment);
        break;
      default:
        break;
    }
  }

  private async handleApproved(payment: Payment): Promise<void> {
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
          await this.orderRepository.save(order);
        }
        break;
      }
    }
  }

  private async handleRejected(_payment: Payment): Promise<void> {
  }

  private async handleCancelled(payment: Payment): Promise<void> {
    if (payment.type === 'product_order') {
      const order = await this.orderRepository.findById(payment.referenceId);
      if (order && order.status === 'pending') {
        order.cancel();
        await this.orderRepository.save(order);
      }
    }
  }
}
