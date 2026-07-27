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
  ): Promise<{ period: string; revenue: number }[]> {
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

    return RevenueEntryModel.aggregate([
      { $match: match },
      { $group: { _id: groupId, revenue: { $sum: '$amount' } } },
      { $project: { period: '$_id', revenue: 1, _id: 0 } },
      { $sort: { period: 1 } },
    ]);
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
