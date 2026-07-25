import { Payment } from '../../../../domain/entities/Payment';
import { MongoMembershipRepository } from '../../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoMembershipTransactionRepository } from '../../../../infrastructure/repositories/mongodb/MongoMembershipTransactionRepository';
import { RevenueTracker } from '../../../services/RevenueTracker';

export class MembershipPaymentHandler {
  constructor(
    private readonly membershipRepository: MongoMembershipRepository,
    private readonly transactionRepository: MongoMembershipTransactionRepository,
    private readonly revenueTracker?: RevenueTracker,
  ) {}

  async handleApproved(payment: Payment): Promise<void> {
    const pending = await this.membershipRepository.findPendingByUser(payment.userId);
    if (pending) {
      pending.approve('system');
      const savedPending = await this.membershipRepository.save(pending);
      await this.transactionRepository.create({
        userId: payment.userId,
        membershipId: savedPending.id,
        amount: payment.amount,
        paymentMethod: 'mercadopago',
        mpPaymentId: payment.mpPaymentId,
        createdBy: 'client',
      });
      await this.revenueTracker?.trackMembership(savedPending.id, payment.amount, new Date(), {
        paymentId: payment.id,
        userId: payment.userId,
      });
      return;
    }

    const existingExpired = await this.membershipRepository.findAnyByUser(payment.userId);
    if (existingExpired && existingExpired.status === 'expired') {
      existingExpired.reactivate(payment.amount, 'mercadopago');
      const saved = await this.membershipRepository.save(existingExpired);
      await this.transactionRepository.create({
        userId: payment.userId,
        membershipId: saved.id,
        amount: payment.amount,
        paymentMethod: 'mercadopago',
        mpPaymentId: payment.mpPaymentId,
        createdBy: 'client',
      });
      await this.revenueTracker?.trackMembership(saved.id, payment.amount, new Date(), {
        paymentId: payment.id,
        userId: payment.userId,
      });
      return;
    }

    const existingActive = await this.membershipRepository.findActiveByUser(payment.userId);
    if (!existingActive) {
      console.log(`[MP-WEBHOOK] Pago ${payment.id} tipo membership aprobado pero no existe membresía pending, expired ni activa para usuario ${payment.userId} — no se crea membresía.`);
    }
  }

  async handleRejected(payment: Payment): Promise<void> {
    const pending = await this.membershipRepository.findPendingByUser(payment.userId);
    if (pending) {
      pending.cancel();
      await this.membershipRepository.save(pending);
    }
  }

  async handleCancelled(_payment: Payment): Promise<void> {
    // No hay acción específica para membresías canceladas
  }

  async handleRefunded(_payment: Payment): Promise<void> {
    // TODO: cancelar/expirar membresía al recibir refund
  }

  async handleChargeBack(_payment: Payment): Promise<void> {
    // TODO: cancelar membresía al recibir chargeback
  }

  async handleInMediation(_payment: Payment): Promise<void> {
    // TODO: notificar admin
  }
}
