import { Order } from '../../../domain/entities/Order';
import { Payment } from '../../../domain/entities/Payment';
import { MongoOrderRepository } from '../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { AppError } from '../../../domain/errors/AppError';
import { RevenueTracker } from '../../services/RevenueTracker';
import { OrderStockService } from '../../services/OrderStockService';

export interface UpdateOrderStatusDTO {
  orderId: string;
  status: string;
  actor: string;
}

export class UpdateOrderStatusUseCase {
  constructor(
    private readonly orderRepository: MongoOrderRepository,
    private readonly orderStockService: OrderStockService,
    private readonly paymentRepository?: MongoPaymentRepository,
    private readonly revenueTracker?: RevenueTracker
  ) {}

  async execute(dto: UpdateOrderStatusDTO): Promise<{ order: Order; previousStatus: string }> {
    const order = await this.orderRepository.findById(dto.orderId);
    if (!order) throw new AppError('Orden no encontrada.', 404);

    const previousStatus = order.status;

    switch (dto.status) {
      case 'paid':
        order.pay();
        break;
      case 'delivered':
        order.deliver();
        break;
      case 'cancelled':
        order.cancel(dto.actor);
        break;
      default:
        throw new AppError('Estado inválido.', 400);
    }

    if (dto.status === 'cancelled') {
      await this.orderStockService.restoreStock(order);
      if (this.paymentRepository && order.paymentId) {
        try {
          const payment = await this.paymentRepository.findById(order.paymentId);
          if (payment && payment.status === 'approved') {
            payment.cancel();
            await this.paymentRepository.save(payment);
          }
        } catch (err) {
          console.error('[UpdateOrderStatusUseCase] Error al actualizar Payment:', err);
        }
      }
    }

    if ((dto.status === 'paid' || dto.status === 'delivered') && this.paymentRepository) {
      try {
        const existingPayment = await this.paymentRepository.findByReference(order.id, 'product_order');
        if (existingPayment && existingPayment.status === 'pending') {
          existingPayment.approve('admin_manual');
          await this.paymentRepository.save(existingPayment);
        } else if (!existingPayment && !order.paymentId) {
          const paymentDoc = Payment.create({
            type: 'product_order',
            referenceId: order.id,
            amount: order.total,
            userId: order.userId,
          });
          paymentDoc.approve('admin_manual');
          await this.paymentRepository.save(paymentDoc);
        }
      } catch (err) {
        console.error('[UpdateOrderStatusUseCase] Error updating PaymentModel:', err);
      }
    }

    const saved = await this.orderRepository.save(order);
    if (dto.status === 'paid' || dto.status === 'delivered') {
      await this.revenueTracker?.trackProductOrder(saved.id, saved.total, new Date(), {
        userId: saved.userId,
        paymentId: saved.paymentId,
      });
    }
    return { order: saved, previousStatus };
  }

}
