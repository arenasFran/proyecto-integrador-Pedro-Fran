import { Order, type OrderProps } from '../../../domain/entities/Order';
import { Payment } from '../../../domain/entities/Payment';
import { MongoOrderRepository } from '../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoProductRepository } from '../../../infrastructure/repositories/mongodb/MongoProductRepository';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { AppError } from '../../../domain/errors/AppError';

export interface CreateManualOrderDTO {
  items: { productId: string; quantity: number }[];
  userId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  status?: string;
}

export class CreateManualOrderUseCase {
  constructor(
    private readonly orderRepository: MongoOrderRepository,
    private readonly productRepository: MongoProductRepository,
    private readonly paymentRepository?: MongoPaymentRepository
  ) {}

  async execute(dto: CreateManualOrderDTO): Promise<OrderProps> {
    if (!dto.items || dto.items.length === 0) {
      throw new AppError('Debe incluir al menos un producto.', 400);
    }

    if (!dto.userId && !dto.clientName) {
      throw new AppError('Debe seleccionar un cliente registrado o ingresar el nombre.', 400);
    }

    const products = await Promise.all(
      dto.items.map((item) => this.productRepository.findById(item.productId))
    );

    const resolvedItems: { productId: string; name: string; price: number; quantity: number; imageUrl?: string }[] = [];

    for (let i = 0; i < dto.items.length; i++) {
      const product = products[i];
      if (!product) throw new AppError(`Producto no encontrado: ${dto.items[i].productId}`, 404);
      if (product.status !== 'active') throw new AppError(`"${product.name}" no esta disponible`, 400);
      if (product.stock < dto.items[i].quantity) throw new AppError(`Stock insuficiente para: ${product.name}`, 400);

      resolvedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: dto.items[i].quantity,
        imageUrl: product.imageUrl || undefined,
      });
    }

    const orderUserId = dto.userId || 'manual_' + Date.now();

    const order = Order.create({
      userId: orderUserId,
      clientName: dto.clientName || undefined,
      clientEmail: dto.clientEmail || undefined,
      clientPhone: dto.clientPhone || undefined,
      items: resolvedItems,
    });

    const targetStatus = dto.status || 'pending';
    if (targetStatus === 'paid') {
      order.pay();
    } else if (targetStatus === 'delivered') {
      order.pay();
      order.deliver();
    }

    const saved = await this.orderRepository.save(order);

    if (targetStatus === 'paid' || targetStatus === 'delivered') {
      for (const item of resolvedItems) {
        await this.productRepository.atomicDecreaseStock(item.productId, item.quantity);
      }
      if (this.paymentRepository) {
        try {
          const paymentDoc = Payment.create({
            type: 'product_order',
            referenceId: saved.id,
            amount: saved.total,
            userId: orderUserId,
          });
          paymentDoc.approve('admin_manual');
          await this.paymentRepository.save(paymentDoc);
        } catch (err) {
          console.error('[CreateManualOrderUseCase] Error creating PaymentModel:', err);
        }
      }
    } else if (this.paymentRepository) {
      try {
        const paymentDoc = Payment.create({
          type: 'product_order',
          referenceId: saved.id,
          amount: saved.total,
          userId: orderUserId,
        });
        await this.paymentRepository.save(paymentDoc);
      } catch (err) {
        console.error('[CreateManualOrderUseCase] Error creating PaymentModel:', err);
      }
    }

    return saved.toPrimitives();
  }
}
