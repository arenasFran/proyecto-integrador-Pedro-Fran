import { Request, Response } from 'express';
import { CreateOrderUseCase } from '../../../application/use-cases/product/CreateOrderUseCase';
import { GetOrderUseCase } from '../../../application/use-cases/product/GetOrderUseCase';
import { UpdateOrderStatusUseCase } from '../../../application/use-cases/product/UpdateOrderStatusUseCase';
import { CreateManualOrderUseCase } from '../../../application/use-cases/product/CreateManualOrderUseCase';
import { DeleteOrderUseCase } from '../../../application/use-cases/product/DeleteOrderUseCase';
import { MongoOrderRepository } from '../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoProductRepository } from '../../../infrastructure/repositories/mongodb/MongoProductRepository';
import { IEmailService } from '../../../application/ports/IEmailService';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { sendSuccess, sendError } from '../../../common/response';
import { Order } from '../../../domain/entities/Order';

export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    private readonly createManualOrderUseCase: CreateManualOrderUseCase,
    private readonly deleteOrderUseCase: DeleteOrderUseCase,
    private readonly orderRepository: MongoOrderRepository,
    private readonly productRepository: MongoProductRepository,
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

      const { order: saved, previousStatus } = await this.updateOrderStatusUseCase.execute({
        orderId: id as string,
        status,
        actor,
      });

      if (status === 'delivered' && previousStatus !== 'delivered') {
        const userEmail = await this.getUserEmail(saved.userId);
        if (userEmail && this.emailService) {
          this.emailService.sendMail({
            to: userEmail,
            subject: 'Orden entregada - Barbería SA',
            html: `<p>Tu orden <strong>#${saved.id}</strong> ha sido marcada como entregada.</p>
<p>Total: $${saved.total}</p>
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
      await this.deleteOrderUseCase.execute({ orderId: id as string });
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

      const primitives = await this.createManualOrderUseCase.execute({
        items,
        userId,
        clientName,
        clientEmail,
        clientPhone,
        status,
      });

      const result = [primitives];
      await this.enrichWithUser(result);
      await this.enrichWithProductImages(result);

      return sendSuccess(res, { order: result[0] }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear orden manual');
    }
  };
}
