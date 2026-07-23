import { Request, Response } from 'express';
import { CreateOrderUseCase } from '../../../application/use-cases/product/CreateOrderUseCase';
import { GetOrderUseCase } from '../../../application/use-cases/product/GetOrderUseCase';
import { MongoOrderRepository } from '../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoProductRepository } from '../../../infrastructure/repositories/mongodb/MongoProductRepository';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { IEmailService } from '../../../application/ports/IEmailService';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';
import { Order } from '../../../domain/entities/Order';
import { Payment } from '../../../domain/entities/Payment';

export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly orderRepository: MongoOrderRepository,
    private readonly productRepository: MongoProductRepository,
    private readonly paymentRepository?: MongoPaymentRepository,
    private readonly emailService?: IEmailService,
    private readonly userRepository?: MongoUserRepository
  ) {}

  create = async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const { items, paymentMethod } = req.body;

      const result = await this.createOrderUseCase.execute({ userId, items, payerEmail: req.user!.email, paymentMethod });

      return sendSuccess(res, result, 201);
    } catch (error) {
      console.error('[OrderController] Error:', error);
      return sendError(res, error, 'Error al crear la orden');
    }
  };

  private async enrichWithUser(orders: ReturnType<Order['toPrimitives']>[]): Promise<void> {
    for (const order of orders) {
      const o = order as Record<string, unknown>;
      if (o.clientName) {
        o.userName = o.clientName;
      }
      if (o.clientEmail) {
        o.userEmail = o.clientEmail;
      }
    }

    if (!this.userRepository) return;
    const userIds = [...new Set(orders
      .map((o) => o.userId)
      .filter((id) => id && !(id as string).startsWith('manual_'))
    )];
    if (userIds.length === 0) return;
    const users = await this.userRepository.findByIds(userIds);
    for (const order of orders) {
      const user = users.get(order.userId);
      if (user) {
        const o = order as Record<string, unknown>;
        if (!o.userName) o.userName = `${user.name} ${user.lastname}`;
        if (!o.userEmail) o.userEmail = user.email;
      }
    }
  }

  private async enrichWithProductImages(orders: ReturnType<Order['toPrimitives']>[]): Promise<void> {
    const missingIds = new Set<string>();
    for (const order of orders) {
      for (const item of order.items) {
        if (!item.imageUrl && item.productId) {
          missingIds.add(item.productId);
        }
      }
    }
    if (missingIds.size === 0) return;

    const productMap = new Map<string, string>();
    const products = await Promise.all(
      [...missingIds].map((id) => this.productRepository.findById(id))
    );
    for (const product of products) {
      if (product && product.imageUrl) {
        productMap.set(product.id, product.imageUrl);
      }
    }

    for (const order of orders) {
      for (const item of order.items) {
        if (!item.imageUrl) {
          const img = productMap.get(item.productId);
          if (img) (item as Record<string, unknown>).imageUrl = img;
        }
      }
    }
  }

  getMyOrders = async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const orders = await this.orderRepository.findByUser(userId);
      const primitives = orders.map((o) => o.toPrimitives());
      await this.enrichWithUser(primitives);
      await this.enrichWithProductImages(primitives);
      return sendSuccess(res, { orders: primitives });
    } catch (error) {
      return sendError(res, error, 'Error al obtener órdenes');
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const { status, page, limit, desde, hasta } = req.query as Record<string, string>;

      const result = await this.orderRepository.findAll({
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        desde,
        hasta,
      });

      const orders = result.data.map((o) => o.toPrimitives());
      await this.enrichWithUser(orders);
      await this.enrichWithProductImages(orders);

      return sendSuccess(res, {
        orders,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: result.limit,
      });
    } catch (error) {
      return sendError(res, error, 'Error al listar órdenes');
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const result = await this.getOrderUseCase.execute(
        req.params.id as string,
        req.user!._id,
        req.user!.kind
      );
      const primitives = [result];
      await this.enrichWithUser(primitives);
      await this.enrichWithProductImages(primitives);
      return sendSuccess(res, { order: primitives[0] });
    } catch (error) {
      return sendError(res, error, 'Error al obtener la orden');
    }
  };

  private async restoreStock(order: import('../../../domain/entities/Order').Order): Promise<void> {
    for (const item of order.items) {
      const product = await this.productRepository.findById(item.productId);
      if (product) {
        product.restoreStock(item.quantity);
        await this.productRepository.save(product);
      }
    }
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    if (!this.userRepository) return null;
    try {
      return await this.userRepository.findEmailById(userId);
    } catch {
      return null;
    }
  }

  updateStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: string };
      const actor = req.user?.kind || 'Admin';

      const order = await this.orderRepository.findById(id as string);
      if (!order) throw new AppError('Orden no encontrada.', 404);

      const previousStatus = order.status;

      switch (status) {
        case 'paid':
          order.pay();
          break;
        case 'delivered':
          order.deliver();
          break;
        case 'cancelled':
          order.cancel(actor);
          break;
        default:
          throw new AppError('Estado inválido.', 400);
      }

      if (status === 'cancelled') {
        await this.restoreStock(order);
        if (this.paymentRepository && order.paymentId) {
          try {
            const payment = await this.paymentRepository.findById(order.paymentId);
            if (payment && payment.status === 'approved') {
              payment.cancel();
              await this.paymentRepository.save(payment);
            }
          } catch (err) {
            console.error('[OrderController] Error al actualizar Payment:', err);
          }
        }
      }

      if ((status === 'paid' || status === 'delivered') && this.paymentRepository) {
        try {
          const existingPayment = await this.paymentRepository.findByReference(order.id, 'product_order');
          if (existingPayment && existingPayment.status === 'pending') {
            existingPayment.approve('admin_manual');
            await this.paymentRepository.save(existingPayment);
          } else if (!existingPayment && !order.paymentId) {
            const paymentDoc = Payment.create({
              type: 'product_order',
              referenceId: order.id,
              amount: order.total,
              userId: order.userId,
            });
            paymentDoc.approve('admin_manual');
            await this.paymentRepository.save(paymentDoc);
          }
        } catch (err) {
          console.error('[OrderController] Error updating PaymentModel:', err);
        }
      }

      const saved = await this.orderRepository.save(order);

      if (status === 'delivered' && previousStatus !== 'delivered') {
        const userEmail = await this.getUserEmail(order.userId);
        if (userEmail && this.emailService) {
          this.emailService.sendMail({
            to: userEmail,
            subject: 'Orden entregada - Barbería SA',
            html: `<p>Tu orden <strong>#${order.id}</strong> ha sido marcada como entregada.</p>
<p>Total: $${order.total}</p>
<p>Gracias por tu compra.</p>`,
          }).catch(() => {});
        }
      }

      return sendSuccess(res, { order: saved.toPrimitives() });
    } catch (error) {
      return sendError(res, error, 'Error al actualizar estado de la orden');
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const order = await this.orderRepository.findById(id as string);
      if (!order) throw new AppError('Orden no encontrada.', 404);

      await this.restoreStock(order);
      await this.orderRepository.delete(id as string);
      return sendSuccess(res, { message: 'Orden eliminada correctamente.' });
    } catch (error) {
      return sendError(res, error, 'Error al eliminar la orden');
    }
  };

  createManual = async (req: Request, res: Response) => {
    try {
      const { items, userId, clientName, clientEmail, clientPhone, status } = req.body as {
        items: { productId: string; quantity: number }[];
        userId?: string;
        clientName?: string;
        clientEmail?: string;
        clientPhone?: string;
        status?: string;
      };

      if (!items || items.length === 0) {
        throw new AppError('Debe incluir al menos un producto.', 400);
      }

      if (!userId && !clientName) {
        throw new AppError('Debe seleccionar un cliente registrado o ingresar el nombre.', 400);
      }

      const products = await Promise.all(
        items.map((item) => this.productRepository.findById(item.productId))
      );

      const resolvedItems: { productId: string; name: string; price: number; quantity: number; imageUrl?: string }[] = [];

      for (let i = 0; i < items.length; i++) {
        const product = products[i];
        if (!product) throw new AppError(`Producto no encontrado: ${items[i].productId}`, 404);
        if (product.status !== 'active') throw new AppError(`"${product.name}" no esta disponible`, 400);
        if (product.stock < items[i].quantity) throw new AppError(`Stock insuficiente para: ${product.name}`, 400);

        resolvedItems.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: items[i].quantity,
          imageUrl: product.imageUrl || undefined,
        });
      }

      const orderUserId = userId || 'manual_' + Date.now();

      const order = Order.create({
        userId: orderUserId,
        clientName: clientName || undefined,
        clientEmail: clientEmail || undefined,
        clientPhone: clientPhone || undefined,
        items: resolvedItems,
      });

      const targetStatus = status || 'pending';
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
            console.error('[OrderController] Error creating PaymentModel for manual order:', err);
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
          console.error('[OrderController] Error creating PaymentModel for manual order:', err);
        }
      }

      const primitives = [saved.toPrimitives()];
      await this.enrichWithUser(primitives);
      await this.enrichWithProductImages(primitives);

      return sendSuccess(res, { order: primitives[0] }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear orden manual');
    }
  };
}
