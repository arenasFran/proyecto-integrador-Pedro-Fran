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

  /**
   * Descuenta el stock de cada item de forma atómica. Si algún item no tiene
   * stock suficiente, revierte los que sí se llegaron a descontar y devuelve
   * false (en vez de dejar la orden a medio descontar).
   */
  async decreaseStock(order: Order): Promise<boolean> {
    const decreased: { productId: string; quantity: number }[] = [];

    for (const item of order.items) {
      const ok = await this.productRepository.atomicDecreaseStock(item.productId, item.quantity);
      if (!ok) {
        for (const done of decreased) {
          await this.productRepository.atomicIncreaseStock(done.productId, done.quantity);
        }
        return false;
      }
      decreased.push({ productId: item.productId, quantity: item.quantity });
    }

    return true;
  }
}
