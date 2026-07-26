import { Order } from '../../domain/entities/Order';
import { MongoProductRepository } from '../../infrastructure/repositories/mongodb/MongoProductRepository';

export class OrderStockService {
  constructor(
    private readonly productRepository: MongoProductRepository
  ) {}

  async restoreStock(order: Order): Promise<void> {
    for (const item of order.items) {
      const product = await this.productRepository.findById(item.productId);
      if (product) {
        product.restoreStock(item.quantity);
        await this.productRepository.save(product);
      }
    }
  }
}
