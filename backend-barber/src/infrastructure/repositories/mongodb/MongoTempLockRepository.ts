import mongoose from 'mongoose';
import { ITempLockRepository, TempLockData } from '../../../domain/repositories/ITempLockRepository';
import TempLockModel from './models/tempLock.model';

export class MongoTempLockRepository implements ITempLockRepository {
  async create(data: TempLockData): Promise<void> {
    try {
      await TempLockModel.create({
        barberId: new mongoose.Types.ObjectId(data.barberId),
        date: data.date,
        startTime: data.startTime,
        clientId: data.clientId,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new Error('El horario ya fue apartado por otro usuario.');
      }
      throw error;
    }
  }

  async deleteMany(filter: { barberId: string }): Promise<void> {
    await TempLockModel.deleteMany({
      barberId: new mongoose.Types.ObjectId(filter.barberId),
    });
  }

  async deleteOne(barberId: string, date: string, startTime: string): Promise<void> {
    await TempLockModel.deleteOne({
      barberId: new mongoose.Types.ObjectId(barberId),
      date,
      startTime,
    });
  }

  async findByBarberAndDate(barberId: string, date: string): Promise<TempLockData[]> {
    const docs = await TempLockModel.find({
      barberId: new mongoose.Types.ObjectId(barberId),
      date,
    }).lean();

    return docs.map((doc) => ({
      barberId: doc.barberId.toString(),
      date: doc.date,
      startTime: doc.startTime,
      clientId: doc.clientId,
    }));
  }
}