import { Payment } from '../../../../domain/entities/Payment';
import { MongoOrderRepository } from '../../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoProductRepository } from '../../../../infrastructure/repositories/mongodb/MongoProductRepository';
import { MongoUserRepository } from '../../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { IEmailService } from '../../../../application/ports/IEmailService';
import { RevenueTracker } from '../../../services/RevenueTracker';

export class ProductOrderPaymentHandler {
  constructor(
    private readonly orderRepository: MongoOrderRepository,
    private readonly productRepository: MongoProductRepository,
    private readonly emailService?: IEmailService,
    private readonly userRepository?: MongoUserRepository,
    private readonly revenueTracker?: RevenueTracker
  ) {}

  async handleApproved(payment: Payment, mpStatusDetail?: string, paymentMethod?: string): Promise<void> {
    const order = await this.orderRepository.findById(payment.referenceId);
    if (!order || order.status !== 'pending') return;

    const session = await import('mongoose').then(m => m.default.startSession());
    try {
      session.startTransaction();

      const stockResults: { productId: string; success: boolean }[] = [];
      for (const item of order.items) {
        const ok = await this.productRepository.atomicDecreaseStock(item.productId, item.quantity, session);
        stockResults.push({ productId: item.productId, success: ok });
      }

      const allOk = stockResults.every(r => r.success);

      if (!allOk) {
        for (const item of order.items) {
          const result = stockResults.find(r => r.productId === item.productId);
          if (result?.success) {
            await this.productRepository.atomicIncreaseStock(item.productId, item.quantity, session);
          }
        }

        order.markStockIssue();
        order.updateMpMetadata(payment.mpPaymentId || '', mpStatusDetail, paymentMethod);
        await this.orderRepository.save(order, session);

        console.error(`[STOCK-OVERSELL] Orden ${order.id} — pago aprobado pero stock insuficiente. Payment MP: ${payment.mpPaymentId}`);
        await session.commitTransaction();
        return;
      }

      order.pay(payment.id);
      order.updateMpMetadata(payment.mpPaymentId || '', mpStatusDetail, paymentMethod);
      await this.orderRepository.save(order, session);

      await session.commitTransaction();

      await this.revenueTracker?.trackProductOrder(order.id, order.total, new Date(), {
        userId: payment.userId,
        paymentId: payment.id,
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    const userEmail = await this.getUserEmail(payment.userId);
    if (userEmail && this.emailService) {
      this.emailService.sendMail({
        to: userEmail,
        subject: 'Pago aprobado - Barbería SA',
        html: `<p>Tu pago por la orden <strong>#${payment.referenceId}</strong> fue aprobado.</p>
<p>Total: $${payment.amount}</p>
<p>Gracias por tu compra.</p>`,
      }).catch(() => {});
    }
  }

  async handleRejected(payment: Payment): Promise<void> {
    const order = await this.orderRepository.findById(payment.referenceId);
    if (order && order.status === 'pending') {
      order.cancel('system');
      await this.orderRepository.save(order);
    }
  }

  async handleCancelled(payment: Payment): Promise<void> {
    const order = await this.orderRepository.findById(payment.referenceId);
    if (order && order.status === 'pending') {
      order.cancel('system');
      await this.orderRepository.save(order);
    }
  }

  async handleRefunded(payment: Payment, mpStatusDetail?: string, paymentMethod?: string): Promise<void> {
    const session = await import('mongoose').then(m => m.default.startSession());
    try {
      session.startTransaction();

      const order = await this.orderRepository.findById(payment.referenceId);
      if (order && order.status === 'paid') {
        order.refund();
        order.updateMpMetadata(payment.mpPaymentId || '', mpStatusDetail, paymentMethod);
        await this.orderRepository.save(order, session);
        for (const item of order.items) {
          await this.productRepository.atomicIncreaseStock(item.productId, item.quantity, session);
        }
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    const userEmail = await this.getUserEmail(payment.userId);
    if (userEmail && this.emailService) {
      this.emailService.sendMail({
        to: userEmail,
        subject: 'Reembolso procesado - Barbería SA',
        html: `<p>Tu pago por la orden <strong>#${payment.referenceId}</strong> fue reembolsado.</p>
<p>Total: $${payment.amount}</p>
<p>El importe será acreditado en tu método de pago.</p>`,
      }).catch(() => {});
    }
  }

  async handleChargeBack(payment: Payment, mpStatusDetail?: string, paymentMethod?: string): Promise<void> {
    const order = await this.orderRepository.findById(payment.referenceId);
    if (order) {
      order.markAsDisputed();
      order.updateMpMetadata(payment.mpPaymentId || '', mpStatusDetail, paymentMethod);
      await this.orderRepository.save(order);
    }
  }

  async handleInMediation(payment: Payment, mpStatusDetail?: string, paymentMethod?: string): Promise<void> {
    const order = await this.orderRepository.findById(payment.referenceId);
    if (order) {
      order.markAsDisputed();
      order.updateMpMetadata(payment.mpPaymentId || '', mpStatusDetail, paymentMethod);
      await this.orderRepository.save(order);
    }
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
