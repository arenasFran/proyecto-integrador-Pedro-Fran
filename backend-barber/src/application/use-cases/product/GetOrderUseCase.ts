import { MongoOrderRepository } from '../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { AppError } from '../../../domain/errors/AppError';
import type { OrderProps } from '../../../domain/entities/Order';

export class GetOrderUseCase {
  constructor(
    private readonly orderRepository: MongoOrderRepository
  ) {}

  async execute(orderId: string, userId: string, userKind: string): Promise<OrderProps> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new AppError('Orden no encontrada.', 404);
    }

    const isOwner = order.userId === userId;
    const isAdmin = userKind === 'Admin';
    if (!isOwner && !isAdmin) {
      throw new AppError('No tenés permiso para ver esta orden.', 403);
    }

    return order.toPrimitives();
  }
}
