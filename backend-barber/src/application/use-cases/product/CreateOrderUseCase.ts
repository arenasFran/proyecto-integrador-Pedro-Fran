import { Order } from '../../../domain/entities/Order';
import { MongoOrderRepository } from '../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoProductRepository } from '../../../infrastructure/repositories/mongodb/MongoProductRepository';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { CreatePaymentUseCase } from '../payment/CreatePaymentUseCase';
import { AppError } from '../../../domain/errors/AppError';

export type CreateOrderDTO = {
  userId: string;
  items: { productId: string; quantity: number }[];
};

export type CreateOrderResult = {
  preferenceId: string;
  initPoint: string;
  orderId: string;
};

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: MongoOrderRepository,
    private readonly productRepository: MongoProductRepository,
    private readonly membershipRepository: MongoMembershipRepository,
    private readonly createPaymentUseCase: CreatePaymentUseCase
  ) {}

  async execute(dto: CreateOrderDTO): Promise<CreateOrderResult> {
    if (!dto.items || dto.items.length === 0) {
      throw new AppError('El carrito está vacío.', 400);
    }

    const products = await Promise.all(
      dto.items.map((item) => this.productRepository.findById(item.productId))
    );

    const membership = await this.membershipRepository.findActiveByUser(dto.userId);
    const discountPercent = membership?.productDiscount ?? 0;

    const resolvedItems: { productId: string; name: string; price: number; quantity: number }[] = [];

    for (let i = 0; i < dto.items.length; i++) {
      const product = products[i];
      if (!product || product.status !== 'active') {
        throw new AppError(`Producto no encontrado: ${dto.items[i].productId}`, 404);
      }
      if (product.stock < dto.items[i].quantity) {
        throw new AppError(`Stock insuficiente para: ${product.name}`, 400);
      }

      const price = discountPercent > 0
        ? Math.round(product.price * (100 - discountPercent) / 100)
        : product.price;

      resolvedItems.push({
        productId: product.id,
        name: product.name,
        price,
        quantity: dto.items[i].quantity,
      });
    }

    const order = Order.create({
      userId: dto.userId,
      items: resolvedItems,
    });

    const saved = await this.orderRepository.save(order);

    for (const item of dto.items) {
      const product = products.find(p => p && p.id === item.productId);
      if (product) {
        product.decreaseStock(item.quantity);
        await this.productRepository.save(product);
      }
    }

    const paymentResult = await this.createPaymentUseCase.execute({
      type: 'product_order',
      referenceId: saved.id,
      amount: saved.total,
      userId: dto.userId,
      items: resolvedItems.map((i) => ({
        title: i.name,
        quantity: i.quantity,
        unitPrice: i.price,
        id: i.productId,
      })),
    });

    return {
      preferenceId: paymentResult.preferenceId,
      initPoint: paymentResult.initPoint,
      orderId: saved.id,
    };
  }
}
