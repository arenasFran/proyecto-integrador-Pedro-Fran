import { Order, type OrderProps } from '../../../domain/entities/Order';
import { Payment } from '../../../domain/entities/Payment';
import { MongoOrderRepository } from '../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoProductRepository } from '../../../infrastructure/repositories/mongodb/MongoProductRepository';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { AppError } from '../../../domain/errors/AppError';
import { RevenueTracker } from '../../services/RevenueTracker';

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
    private readonly paymentRepository?: MongoPaymentRepository,
    private readonly revenueTracker?: RevenueTracker
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
      paymentMethod: 'local',
    });

    const targetStatus = dto.status || 'pending';
    if (targetStatus === 'paid') {
      order.pay(undefined, 'admin_manual');
    } else if (targetStatus === 'delivered') {
      order.pay(undefined, 'admin_manual');
      order.deliver('admin_manual');
    }

    const saved = await this.orderRepository.save(order);

    // El Payment se asocia a un usuario de Mongo real (userId es un ObjectId en el schema).
    // Para un walk-in sin cuenta (dto.userId ausente), orderUserId es el string sintético
    // "manual_<timestamp>", que no es un ObjectId válido: no tiene sentido (ni es seguro)
    // intentar guardar un Payment con ese id, así que directamente no se crea.
    if (targetStatus === 'paid' || targetStatus === 'delivered') {
      const decreased: { productId: string; quantity: number }[] = [];
      for (const item of resolvedItems) {
        const success = await this.productRepository.atomicDecreaseStock(item.productId, item.quantity);
        if (!success) {
          for (const previous of decreased) await this.productRepository.atomicIncreaseStock(previous.productId, previous.quantity);
          throw new AppError(`Stock insuficiente para: ${item.name}`, 409);
        }
        decreased.push(item);
      }
      if (this.paymentRepository && dto.userId) {
        try {
          const paymentDoc = Payment.create({
            type: 'product_order',
            referenceId: saved.id,
            amount: saved.total,
            userId: dto.userId,
          });
          paymentDoc.approve();
          const savedPayment = await this.paymentRepository.save(paymentDoc);
          if (savedPayment?.id) {
            saved.assignPayment(savedPayment.id);
            await this.orderRepository.save(saved);
          }
        } catch (err) {
          console.error('[CreateManualOrderUseCase] Error creating PaymentModel:', err);
        }
      }
    } else if (this.paymentRepository && dto.userId) {
      try {
        const paymentDoc = Payment.create({
          type: 'product_order',
          referenceId: saved.id,
          amount: saved.total,
          userId: dto.userId,
        });
        const savedPayment = await this.paymentRepository.save(paymentDoc);
        if (savedPayment?.id) {
          saved.assignPayment(savedPayment.id);
          await this.orderRepository.save(saved);
        }
      } catch (err) {
        console.error('[CreateManualOrderUseCase] Error creating PaymentModel:', err);
      }
    }

    if (targetStatus === 'paid' || targetStatus === 'delivered') {
      await this.revenueTracker?.trackProductOrder(saved.id, saved.total, new Date(), {
        userId: orderUserId,
      });
    }

    return saved.toPrimitives();
  }
}
