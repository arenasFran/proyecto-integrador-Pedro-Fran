import mongoose from 'mongoose';
import { BarberBlockModel } from './models/barberBlock.model';
import type { BarberBlockProps } from '../../../domain/entities/BarberBlock';

export class MongoBarberBlockRepository {
  async findByBarberAndDate(barberId: string, date: string, session?: mongoose.ClientSession): Promise<BarberBlockProps[]> {
    const query = BarberBlockModel.find({
      barberId: new mongoose.Types.ObjectId(barberId),
      date,
    });
    if (session) query.session(session);
    const docs = await query.lean();
    return docs.map((doc: any) => this.toProps(doc));
  }

  async findByBarberAndDateRange(barberId: string, dateFrom: string, dateTo: string): Promise<BarberBlockProps[]> {
    const docs = await BarberBlockModel.find({
      barberId: new mongoose.Types.ObjectId(barberId),
      date: { $gte: dateFrom, $lte: dateTo },
    }).lean();
    return docs.map((doc: any) => this.toProps(doc));
  }

  async create(data: Omit<BarberBlockProps, 'id'>): Promise<BarberBlockProps> {
    const doc = await BarberBlockModel.create({
      barberId: new mongoose.Types.ObjectId(data.barberId),
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      createdBy: data.createdBy,
    });
    return this.toProps(doc.toObject());
  }

  async deleteById(id: string): Promise<void> {
    await BarberBlockModel.findByIdAndDelete(id);
  }

  async deleteByBarberId(barberId: string): Promise<void> {
    await BarberBlockModel.deleteMany({
      barberId: new mongoose.Types.ObjectId(barberId),
    });
  }

  async findByDateRange(dateFrom: string, dateTo: string): Promise<BarberBlockProps[]> {
    const docs = await BarberBlockModel.find({
      date: { $gte: dateFrom, $lte: dateTo },
    }).lean();
    return docs.map((doc: any) => this.toProps(doc));
  }

  async findById(id: string): Promise<BarberBlockProps | null> {
    const doc = await BarberBlockModel.findById(id).lean();
    if (!doc) return null;
    return this.toProps(doc as any);
  }

  private toProps(doc: any): BarberBlockProps {
    return {
      id: String(doc._id),
      barberId: String(doc.barberId),
      date: doc.date,
      startTime: doc.startTime,
      endTime: doc.endTime,
      createdBy: doc.createdBy,
    };
  }
}
