import mongoose, { ClientSession } from 'mongoose';
import TempLockModel from './models/tempLock.model';

export type TempLockData = {
  barberId: string;
  date: string;
  startTime: string;
  clientId?: string;
};

export type TempLockWithId = TempLockData & { id: string };

export class MongoTempLockRepository {
  async create(data: TempLockData): Promise<string> {
    try {
      const doc = await TempLockModel.create({
        barberId: new mongoose.Types.ObjectId(data.barberId),
        date: data.date,
        startTime: data.startTime,
        clientId: data.clientId,
      });
      return doc._id.toString();
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

  async deleteById(id: string): Promise<void> {
    await TempLockModel.findByIdAndDelete(id);
  }

  async deleteOne(barberId: string, date: string, startTime: string, session?: ClientSession): Promise<void> {
    const opts: Record<string, unknown> = {};
    if (session) opts.session = session;
    await TempLockModel.deleteOne({
      barberId: new mongoose.Types.ObjectId(barberId),
      date,
      startTime,
    }, opts);
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

  async findById(id: string, session?: ClientSession): Promise<TempLockWithId | null> {
    const query = TempLockModel.findById(id);
    if (session) query.session(session);
    const doc = await query.lean();
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      barberId: doc.barberId.toString(),
      date: doc.date,
      startTime: doc.startTime,
      clientId: doc.clientId,
    };
  }
}