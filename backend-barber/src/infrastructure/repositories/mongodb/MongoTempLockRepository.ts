import crypto from 'crypto';
import mongoose, { ClientSession } from 'mongoose';
import TempLockModel from './models/tempLock.model';

export type TempLockData = {
  barberId: string;
  date: string;
  startTime: string;
  clientId?: string;
};

export type TempLockWithId = TempLockData & { id: string; createdAt: Date };

export type TempLockCreationResult = {
  id: string;
  ownerToken: string;
};

export type TempLockReleaseResult = 'released' | 'not_found' | 'forbidden';

const tokensMatch = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

export class MongoTempLockRepository {
  async create(data: TempLockData): Promise<TempLockCreationResult> {
    try {
      const ownerToken = crypto.randomBytes(32).toString('hex');
      const doc = await TempLockModel.create({
        barberId: new mongoose.Types.ObjectId(data.barberId),
        date: data.date,
        startTime: data.startTime,
        clientId: data.clientId,
        ownerToken,
      });
      return { id: doc._id.toString(), ownerToken };
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new Error('El horario ya fue apartado por otro usuario.');
      }
      throw error;
    }
  }

  async release(id: string, ownerToken: string): Promise<TempLockReleaseResult> {
    const doc = await TempLockModel.findById(id);
    if (!doc) {
      return 'not_found';
    }
    if (!tokensMatch(doc.ownerToken, ownerToken)) {
      return 'forbidden';
    }
    await doc.deleteOne();
    return 'released';
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
      createdAt: doc.createdAt,
    };
  }
}