import { Order } from '../../../domain/entities/Order';
import { Payment } from '../../../domain/entities/Payment';
import { MongoOrderRepository } from '../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoProductRepository } from '../../../infrastructure/repositories/mongodb/MongoProductRepository';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { CreatePaymentUseCase } from '../payment/CreatePaymentUseCase';
import { AppError } from '../../../domain/errors/AppError';

export type CreateOrderDTO = {
  userId: string;
  items: { productId: string; quantity: number }[];
  payerEmail?: string;
  paymentMethod?: 'online' | 'local';
};

export type CreateOrderResult = {
  orderId: string;
  preferenceId?: string;
  initPoint?: string;
  sandboxInitPoint?: string;
};

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: MongoOrderRepository,
    private readonly productRepository: MongoProductRepository,
    private readonly membershipRepository: MongoMembershipRepository,
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly paymentRepository?: MongoPaymentRepository
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

    const resolvedItems: { productId: string; name: string; price: number; quantity: number; imageUrl?: string }[] = [];

    for (let i = 0; i < dto.items.length; i++) {
      const product = products[i];
      if (!product) {
        throw new AppError('Algunos productos del carrito ya no están disponibles. Limpiá el carrito y volvé a intentar.', 404);
      }
      if (product.status !== 'active') {
        throw new AppError(`"${product.name}" no está disponible actualmente`, 400);
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
        imageUrl: product.imageUrl || undefined,
      });
    }

    const order = Order.create({
      userId: dto.userId,
      items: resolvedItems,
    });

    const saved = await this.orderRepository.save(order);

    const paymentMethod = dto.paymentMethod || 'online';

    if (paymentMethod === 'local') {
      for (const item of resolvedItems) {
        await this.productRepository.atomicDecreaseStock(item.productId, item.quantity);
      }
      if (this.paymentRepository) {
        try {
          const paymentDoc = Payment.create({
            type: 'product_order',
            referenceId: saved.id,
            amount: saved.total,
            userId: dto.userId,
          });
          await this.paymentRepository.save(paymentDoc);
        } catch (err) {
          console.error('[CreateOrderUseCase] Error creating PaymentModel for local order:', err);
        }
      }
      return { orderId: saved.id };
    }

    let paymentResult: { preferenceId: string; initPoint: string; sandboxInitPoint?: string };
    try {
      paymentResult = await this.createPaymentUseCase.execute({
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
        payerEmail: dto.payerEmail,
      });
    } catch (error) {
      await this.orderRepository.delete(saved.id);
      throw error;
    }

    return {
      preferenceId: paymentResult.preferenceId,
      initPoint: paymentResult.initPoint,
      sandboxInitPoint: paymentResult.sandboxInitPoint ?? '',
      orderId: saved.id,
    };
  }
}
