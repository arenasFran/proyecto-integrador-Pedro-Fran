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

    let paymentForCancellation = null;
    if (dto.status === 'cancelled' && this.paymentRepository) {
      paymentForCancellation = order.paymentId
        ? await this.paymentRepository.findById(order.paymentId)
        : await this.paymentRepository.findByReference(order.id, 'product_order');
      if (paymentForCancellation && paymentForCancellation.status === 'approved') {
        throw new AppError('No se puede cancelar una orden con un pago ya aprobado. Procesá el reembolso en MercadoPago antes de cancelarla.', 409);
      }
    }

    switch (dto.status) {
      case 'paid':
        order.pay(undefined, dto.actor);
        break;
      case 'delivered':
        if (previousStatus === 'pending') order.pay(undefined, dto.actor);
        order.deliver(dto.actor);
        break;
      case 'cancelled':
        order.cancel(dto.actor);
        break;
      default:
        throw new AppError('Estado inválido.', 400);
    }

    // La orden solo reserva/descuenta stock una vez, en la transición pending → paid/delivered
    // (el checkout local y el webhook de MP aprobado ya lo hacen por su cuenta). Si esta
    // aprobación manual es la que hace esa transición por primera vez, hay que descontarlo acá;
    // si no hay stock suficiente, se marca stock_issue en vez de darla por pagada/entregada.
    let stockIssue = false;
    if (previousStatus === 'pending' && (dto.status === 'paid' || dto.status === 'delivered')) {
      const decreased = await this.orderStockService.decreaseStock(order);
      if (!decreased) {
        order.markStockIssue();
        stockIssue = true;
      }
    }

    if (dto.status === 'cancelled') {
      if (previousStatus === 'paid') await this.orderStockService.restoreStock(order);
      if (this.paymentRepository && paymentForCancellation) {
        try {
          // Ya se descartó más arriba el caso 'approved' (bloquea la cancelación),
          // así que acá cancel() sí tiene efecto real (ej. deja de estar 'pending').
          paymentForCancellation.cancel();
          await this.paymentRepository.save(paymentForCancellation);
        } catch (err) {
          console.error('[UpdateOrderStatusUseCase] Error al actualizar Payment:', err);
        }
      }
    }

    if (!stockIssue && (dto.status === 'paid' || dto.status === 'delivered') && this.paymentRepository) {
      try {
        const existingPayment = await this.paymentRepository.findByReference(order.id, 'product_order');
        if (existingPayment && existingPayment.status === 'pending') {
           existingPayment.approve();
          await this.paymentRepository.save(existingPayment);
        } else if (!existingPayment && !order.paymentId) {
          const paymentDoc = Payment.create({
            type: 'product_order',
            referenceId: order.id,
            amount: order.total,
            userId: order.userId,
          });
           paymentDoc.approve();
          await this.paymentRepository.save(paymentDoc);
        }
      } catch (err) {
        console.error('[UpdateOrderStatusUseCase] Error updating PaymentModel:', err);
      }
    }

    const saved = await this.orderRepository.save(order);
    if (!stockIssue && (dto.status === 'paid' || dto.status === 'delivered')) {
      await this.revenueTracker?.trackProductOrder(saved.id, saved.total, new Date(), {
        userId: saved.userId,
        paymentId: saved.paymentId,
      });
    }
    return { order: saved, previousStatus };
  }

}
