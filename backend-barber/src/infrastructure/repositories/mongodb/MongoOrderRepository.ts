import mongoose from 'mongoose';
import { OrderModel, IOrderDocument } from './models/order.model';
import { Order } from '../../../domain/entities/Order';
import { parseLocalDateRange } from '../../../common/dateUtils';

type FindAllParams = {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
  desde?: string;
  hasta?: string;
};

type FindAllResult = {
  data: Order[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
};

export class MongoOrderRepository {
  async findById(id: string): Promise<Order | null> {
    const doc = await OrderModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  async findByUser(userId: string): Promise<Order[]> {
    const docs = await OrderModel.find({ userId }).sort({ createdAt: -1 });
    return docs.map((d) => this.toDomain(d));
  }

  async findAll(params: FindAllParams = {}): Promise<FindAllResult> {
    const filter: Record<string, unknown> = {};

    if (params.userId) filter.userId = params.userId;
    if (params.status) filter.status = params.status;
    if (params.desde || params.hasta) {
      filter.createdAt = {} as Record<string, Date>;
      if (params.desde && params.hasta) {
        const range = parseLocalDateRange(params.desde, params.hasta);
        (filter.createdAt as Record<string, Date>).$gte = range.desdeDate;
        (filter.createdAt as Record<string, Date>).$lte = range.hastaDate;
      } else if (params.desde) {
        (filter.createdAt as Record<string, Date>).$gte = parseLocalDateRange(params.desde, params.desde).desdeDate;
      } else if (params.hasta) {
        const range = parseLocalDateRange(params.hasta, params.hasta);
        (filter.createdAt as Record<string, Date>).$lte = range.hastaDate;
      }
    }

    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      OrderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      OrderModel.countDocuments(filter),
    ]);

    return {
      data: docs.map((d) => this.toDomain(d)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  }

  async cancelPendingOlderThan(cutoff: Date): Promise<number> {
    const result = await OrderModel.updateMany(
      {
        status: 'pending',
        createdAt: { $lt: cutoff },
      },
      {
        $set: {
          status: 'cancelled',
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount;
  }

  async delete(id: string): Promise<void> {
    await OrderModel.findByIdAndDelete(id);
  }

  async save(order: Order, session?: mongoose.ClientSession): Promise<Order> {
    const data = order.toPrimitives();

    if (data.id) {
      const update: Record<string, unknown> = {
        status: data.status,
        updatedAt: new Date(),
      };
      if (data.paymentId) update.paymentId = data.paymentId;
      if (data.mpPaymentId) update.mpPaymentId = data.mpPaymentId;
      if (data.mpStatusDetail !== undefined) update.mpStatusDetail = data.mpStatusDetail;
      if (data.paymentMethod !== undefined) update.paymentMethod = data.paymentMethod;
      if (data.statusHistory) update.statusHistory = data.statusHistory;

      const query = OrderModel.findByIdAndUpdate(data.id, { $set: update });
      if (session) query.session(session);
      await query;
      return order;
    }

    const [doc] = await OrderModel.create([{
      userId: data.userId,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      items: data.items,
      total: data.total,
      status: data.status,
      paymentId: data.paymentId,
      mpPaymentId: data.mpPaymentId,
      mpStatusDetail: data.mpStatusDetail,
      paymentMethod: data.paymentMethod,
      statusHistory: data.statusHistory,
    }], session ? { session } : {});

    return Order.restore({
      ...data,
      id: doc._id.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  private toDomain(doc: IOrderDocument): Order {
    return Order.restore({
      id: doc._id.toString(),
      userId: doc.userId,
      clientName: doc.clientName,
      clientEmail: doc.clientEmail,
      clientPhone: doc.clientPhone,
      items: doc.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        imageUrl: i.imageUrl ?? undefined,
      })),
      total: doc.total,
      status: doc.status,
      paymentId: doc.paymentId ?? undefined,
      mpPaymentId: doc.mpPaymentId ?? undefined,
      mpStatusDetail: doc.mpStatusDetail ?? undefined,
      paymentMethod: doc.paymentMethod ?? undefined,
      statusHistory: (doc.statusHistory ?? []).map((h) => ({
        status: h.status,
        timestamp: h.timestamp,
        actor: h.actor,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
