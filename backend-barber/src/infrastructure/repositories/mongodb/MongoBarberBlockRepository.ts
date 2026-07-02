import { BarberBlockModel } from './models/barberBlock.model';
import type { BarberBlockProps } from '../../../domain/entities/BarberBlock';
import type { FlattenMaps } from 'mongoose';

type LeanDoc = FlattenMaps<BarberBlockProps & { _id: unknown }>;

export class MongoBarberBlockRepository {
  async findByBarberAndDate(barberId: string, date: string): Promise<BarberBlockProps[]> {
    const docs = await BarberBlockModel.find({ barberId, date }).lean();
    return docs.map((doc) => this.toProps(doc));
  }

  async findByBarberAndDateRange(barberId: string, dateFrom: string, dateTo: string): Promise<BarberBlockProps[]> {
    const docs = await BarberBlockModel.find({
      barberId,
      date: { $gte: dateFrom, $lte: dateTo },
    }).lean();
    return docs.map((doc) => this.toProps(doc));
  }

  async create(data: Omit<BarberBlockProps, 'id'>): Promise<BarberBlockProps> {
    const doc = await BarberBlockModel.create(data);
    return this.toProps(doc.toObject());
  }

  async deleteById(id: string): Promise<void> {
    await BarberBlockModel.findByIdAndDelete(id);
  }

  async deleteByBarberId(barberId: string): Promise<void> {
    await BarberBlockModel.deleteMany({ barberId });
  }

  async findByDateRange(dateFrom: string, dateTo: string): Promise<BarberBlockProps[]> {
    const docs = await BarberBlockModel.find({
      date: { $gte: dateFrom, $lte: dateTo },
    }).lean();
    return docs.map((doc) => this.toProps(doc));
  }

  async findById(id: string): Promise<BarberBlockProps | null> {
    const doc = await BarberBlockModel.findById(id).lean();
    if (!doc) return null;
    return this.toProps(doc);
  }

  private toProps(doc: LeanDoc): BarberBlockProps {
    return {
      id: String(doc._id),
      barberId: doc.barberId,
      date: doc.date,
      startTime: doc.startTime,
      endTime: doc.endTime,
      createdBy: doc.createdBy,
    };
  }
}
