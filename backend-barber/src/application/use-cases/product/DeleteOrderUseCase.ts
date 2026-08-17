import { MongoOrderRepository } from '../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { AppError } from '../../../domain/errors/AppError';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';

export interface DeleteOrderDTO {
  orderId: string;
}

export class DeleteOrderUseCase {
  constructor(
    private readonly orderRepository: MongoOrderRepository,
    private readonly paymentRepository?: MongoPaymentRepository
  ) {}

  async execute(dto: DeleteOrderDTO): Promise<void> {
    const order = await this.orderRepository.findById(dto.orderId);
    if (!order) throw new AppError('Orden no encontrada.', 404);

    if (order.status !== 'pending' && order.status !== 'cancelled' && order.status !== 'stock_issue') {
      throw new AppError('No se puede eliminar una orden con impacto financiero. Cancelala o procesá el reembolso correspondiente.', 409);
    }

    if (this.paymentRepository) {
      const payment = await this.paymentRepository.findByReference(order.id, 'product_order');
      if (payment?.status === 'approved') {
        throw new AppError('No se puede eliminar una orden con un pago aprobado.', 409);
      }
      if (payment?.status === 'pending') {
        payment.cancel();
        await this.paymentRepository.save(payment);
      }
    }

    await this.orderRepository.delete(dto.orderId);
  }
}
