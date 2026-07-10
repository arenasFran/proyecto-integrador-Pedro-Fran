import { Request, Response } from 'express';
import { CreateOrderUseCase } from '../../../application/use-cases/product/CreateOrderUseCase';
import { GetOrderUseCase } from '../../../application/use-cases/product/GetOrderUseCase';
import { MongoOrderRepository } from '../../../infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoProductRepository } from '../../../infrastructure/repositories/mongodb/MongoProductRepository';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';

export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly orderRepository: MongoOrderRepository,
    private readonly productRepository: MongoProductRepository
  ) {}

  create = async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const { items } = req.body;

      const result = await this.createOrderUseCase.execute({ userId, items, payerEmail: req.user!.email });

      return sendSuccess(res, result, 201);
    } catch (error) {
      console.error('[OrderController] Error:', error);
      return sendError(res, error, 'Error al crear la orden');
    }
  };

  getMyOrders = async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const orders = await this.orderRepository.findByUser(userId);
      return sendSuccess(res, { orders: orders.map((o) => o.toPrimitives()) });
    } catch (error) {
      return sendError(res, error, 'Error al obtener órdenes');
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const { status, page, limit } = req.query as Record<string, string>;

      const result = await this.orderRepository.findAll({
        status,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return sendSuccess(res, {
        orders: result.data.map((o) => o.toPrimitives()),
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
      return sendSuccess(res, { order: result });
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

  updateStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: string };

      const order = await this.orderRepository.findById(id as string);
      if (!order) throw new AppError('Orden no encontrada.', 404);

      const wasPaid = order.status === 'paid';

      switch (status) {
        case 'paid':
          order.pay();
          break;
        case 'delivered':
          order.deliver();
          break;
        case 'cancelled':
          order.cancel();
          break;
        default:
          throw new AppError('Estado inválido.', 400);
      }

      if (status === 'cancelled') {
        await this.restoreStock(order);
      }

      const saved = await this.orderRepository.save(order);
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
}
