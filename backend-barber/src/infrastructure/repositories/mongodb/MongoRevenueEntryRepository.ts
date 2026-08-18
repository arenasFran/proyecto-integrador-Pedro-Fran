import mongoose from 'mongoose';
import { RevenueEntryModel, IRevenueEntryDocument } from './models/revenue-entry.model';
import { RevenueEntry } from '../../../domain/entities/RevenueEntry';

export class MongoRevenueEntryRepository {
  async create(entry: RevenueEntry, session?: mongoose.ClientSession): Promise<RevenueEntry> {
    const primitives = entry.toPrimitives();
    const query = RevenueEntryModel.create([{
      source: primitives.source,
      amount: primitives.amount,
      date: primitives.date,
      referenceId: primitives.referenceId,
      paymentId: primitives.paymentId,
      metadata: primitives.metadata,
    }], session ? { session } : undefined);

    const [doc] = await query;
    return this.toDomain(doc);
  }

  async findByReferenceId(referenceId: string): Promise<RevenueEntry | null> {
    const doc = await RevenueEntryModel.findOne({ referenceId });
    return doc ? this.toDomain(doc) : null;
  }

  async findByPaymentId(paymentId: string): Promise<RevenueEntry | null> {
    const doc = await RevenueEntryModel.findOne({ paymentId });
    return doc ? this.toDomain(doc) : null;
  }

  async getTotalByDateRange(desde: Date, hasta: Date, source?: string): Promise<number> {
    const filter: Record<string, unknown> = {
      date: { $gte: desde, $lte: hasta },
    };
    if (source) filter.source = source;

    const result = await RevenueEntryModel.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  async getTotalByDateRangeAndSource(
    desde: Date,
    hasta: Date,
  ): Promise<{ source: string; total: number }[]> {
    return RevenueEntryModel.aggregate([
      { $match: { date: { $gte: desde, $lte: hasta } } },
      { $group: { _id: '$source', total: { $sum: '$amount' } } },
      { $project: { source: '$_id', total: 1, _id: 0 } },
    ]);
  }

  async getRevenueByService(desde: Date, hasta: Date): Promise<{ serviceId: string; total: number }[]> {
    return RevenueEntryModel.aggregate([
      { $match: { date: { $gte: desde, $lte: hasta }, source: 'appointment' } },
      { $group: { _id: '$metadata.serviceId', total: { $sum: '$amount' } } },
      { $match: { _id: { $ne: null } } },
      { $project: { serviceId: '$_id', total: 1, _id: 0 } },
    ]);
  }

  async getProductPerformance(desde: Date, hasta: Date): Promise<{
    productId: string;
    name: string;
    totalSold: number;
    totalRevenue: number;
    timesOrdered: number;
  }[]> {
    return RevenueEntryModel.aggregate([
      { $match: { date: { $gte: desde, $lte: hasta }, source: 'product_order' } },
      {
        $lookup: {
          from: 'orders',
          let: { orderId: '$referenceId' },
          pipeline: [
            { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$orderId'] } } },
            { $project: { total: 1, items: 1 } },
          ],
          as: 'order',
        },
      },
      { $unwind: '$order' },
      { $unwind: '$order.items' },
      { $set: { lineGross: { $multiply: ['$order.items.price', '$order.items.quantity'] } } },
      {
        $set: {
          allocatedRevenue: {
            $cond: [
              { $gt: ['$order.total', 0] },
              { $multiply: ['$amount', { $divide: ['$lineGross', '$order.total'] }] },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: { productId: '$order.items.productId', name: '$order.items.name' },
          totalSold: { $sum: '$order.items.quantity' },
          totalRevenue: { $sum: '$allocatedRevenue' },
          timesOrdered: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          productId: '$_id.productId',
          name: '$_id.name',
          totalSold: 1,
          totalRevenue: 1,
          timesOrdered: 1,
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);
  }

  async getRevenueByBarber(desde: Date, hasta: Date): Promise<{ barberId: string; total: number }[]> {
    return RevenueEntryModel.aggregate([
      { $match: { date: { $gte: desde, $lte: hasta }, source: 'appointment' } },
      { $group: { _id: '$metadata.barberId', total: { $sum: '$amount' } } },
      { $match: { _id: { $ne: null } } },
      { $project: { barberId: '$_id', total: 1, _id: 0 } },
    ]);
  }

  async getRevenueByPeriod(
    desde: Date,
    hasta: Date,
    period: { field: string; format: string },
    source?: string,
    barberId?: string,
    includeCount = false,
  ): Promise<{ period: string; revenue: number; count?: number }[]> {
    const groupId: Record<string, unknown> = {};

    if (period.field === 'day') {
      groupId.$dateToString = { format: '%Y-%m-%d', date: '$date' };
    } else if (period.field === 'month') {
      groupId.$dateToString = { format: '%Y-%m', date: '$date' };
    } else if (period.field === 'year') {
      groupId.$dateToString = { format: '%Y', date: '$date' };
    }

    const match: Record<string, unknown> = { date: { $gte: desde, $lte: hasta } };
    if (source) match.source = source;
    if (barberId) match['metadata.barberId'] = barberId;

    const project: Record<string, unknown> = { period: '$_id', revenue: 1, _id: 0 };
    if (includeCount) project.count = 1;

    return RevenueEntryModel.aggregate([
      { $match: match },
      { $group: { _id: groupId, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: project },
      { $sort: { period: 1 } },
    ]);
  }

  async getRevenueByDay(desde: Date, hasta: Date): Promise<{
    fecha: string;
    ingresos: number;
    porOrigen: Record<string, number>;
  }[]> {
    const rows = await RevenueEntryModel.aggregate([
      { $match: { date: { $gte: desde, $lte: hasta } } },
      {
        $group: {
          _id: {
            fecha: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            source: '$source',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.fecha': 1 } },
    ]);

    const byDate = new Map<string, { ingresos: number; porOrigen: Record<string, number> }>();
    for (const row of rows as Array<{ _id: { fecha: string; source: string }; total: number }>) {
      const current = byDate.get(row._id.fecha) ?? { ingresos: 0, porOrigen: {} };
      current.ingresos += row.total;
      current.porOrigen[row._id.source] = row.total;
      byDate.set(row._id.fecha, current);
    }

    return [...byDate.entries()].map(([fecha, value]) => ({ fecha, ...value }));
  }

  private toDomain(doc: IRevenueEntryDocument): RevenueEntry {
    return RevenueEntry.restore({
      id: doc._id.toString(),
      source: doc.source,
      amount: doc.amount,
      date: doc.date,
      referenceId: doc.referenceId,
      paymentId: doc.paymentId,
      metadata: doc.metadata as Record<string, unknown> | undefined,
      createdAt: doc.createdAt,
    });
  }
}
