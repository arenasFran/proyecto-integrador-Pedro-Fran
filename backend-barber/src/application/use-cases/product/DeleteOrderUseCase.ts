import { MongoOrderRepository } from '../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoProductRepository } from '../../../infrastructure/repositories/mongodb/MongoProductRepository';
import { AppError } from '../../../domain/errors/AppError';

export interface DeleteOrderDTO {
  orderId: string;
}

export class DeleteOrderUseCase {
  constructor(
    private readonly orderRepository: MongoOrderRepository,
    private readonly productRepository: MongoProductRepository
  ) {}

  async execute(dto: DeleteOrderDTO): Promise<void> {
    const order = await this.orderRepository.findById(dto.orderId);
    if (!order) throw new AppError('Orden no encontrada.', 404);

    for (const item of order.items) {
      const product = await this.productRepository.findById(item.productId);
      if (product) {
        product.restoreStock(item.quantity);
        await this.productRepository.save(product);
      }
    }

    await this.orderRepository.delete(dto.orderId);
  }
}
