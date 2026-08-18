import { MongoOrderRepository } from '../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { AppError } from '../../../domain/errors/AppError';
import { OrderStockService } from '../../services/OrderStockService';

export interface DeleteOrderDTO {
  orderId: string;
}

export class DeleteOrderUseCase {
  constructor(
    private readonly orderRepository: MongoOrderRepository,
    private readonly orderStockService: OrderStockService
  ) {}

  async execute(dto: DeleteOrderDTO): Promise<void> {
    const order = await this.orderRepository.findById(dto.orderId);
    if (!order) throw new AppError('Orden no encontrada.', 404);

    if (order.status === 'paid' || order.status === 'delivered') {
      await this.orderStockService.restoreStock(order);
    }

    await this.orderRepository.delete(dto.orderId);
  }
}
