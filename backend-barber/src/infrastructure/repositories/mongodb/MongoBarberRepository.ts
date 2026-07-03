import mongoose from 'mongoose';
import { Barber, BarberSchedule } from '../../../domain/entities/Barber';
import { Barber as BarberModel, Employee } from './models/barber.model';
import { isBarberRaw } from './guards/barber.guards';

export type BarberUpdate = {
  email?: string;
  name?: string;
  lastname?: string;
  phone?: string;
  services?: string[];
  age?: number | null;
  photoUrl?: string | null;
  isActive?: boolean;
  slotDuration?: number;
  maxAdvanceDays?: number;
  passwordHash?: string;
};

const createEmptyDay = () => ({
  startTime: null,
  endTime: null,
  breaks: [],
});

const createDefaultSchedule = (): BarberSchedule => ({
  monday: createEmptyDay(),
  tuesday: createEmptyDay(),
  wednesday: createEmptyDay(),
  thursday: createEmptyDay(),
  friday: createEmptyDay(),
  saturday: createEmptyDay(),
  sunday: createEmptyDay(),
});

const toBarberEntity = (doc: Record<string, any>): Barber => {
  const schedule = doc.schedule || createDefaultSchedule();
  const slotDuration = doc.slotDuration ?? 30;

  return Barber.create({
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    lastname: doc.lastname,
    phone: doc.phone,
    kind: doc.kind,
    services: doc.services || [],
    age: doc.age,
    photoUrl: doc.photoUrl ?? null,
    isActive: doc.isActive ?? true,
    slotDuration,
    schedule,
    maxAdvanceDays: doc.maxAdvanceDays ?? 30,
    passwordHash: doc.password,
  });
};

const toBarberEmployeeData = (barber: Barber): Record<string, unknown> => ({
  email: barber.email,
  password: barber.passwordHash,
  name: barber.name,
  lastname: barber.lastname,
  phone: barber.phone,
  kind: barber.kind,
  services: barber.services,
  age: barber.age,
  photoUrl: barber.photoUrl ?? null,
  isActive: barber.isActive,
  slotDuration: barber.slotDuration,
  maxAdvanceDays: barber.maxAdvanceDays,
  schedule: barber.schedule,
});

export class MongoBarberRepository {
  async findBarberById(id: string): Promise<Barber | null> {
    const doc = await BarberModel.findById(id).lean();
    if (!doc) {
      return null;
    }
    if (!isBarberRaw(doc)) {
      throw new Error(`Documento inválido en barberos: el documento ${id} no cumple con el formato esperado`);
    }
    return toBarberEntity(doc);
  }

  async findAllBarbers(): Promise<Barber[]> {
    const docs = await BarberModel.find({ kind: { $in: ['Empleado', 'Admin'] } }).lean();
    return docs.map((doc) => {
      if (!isBarberRaw(doc)) {
        throw new Error('Documento inválido en la colección de barberos');
      }
      return toBarberEntity(doc);
    });
  }

  async findAllBarbersPaginated(page = 1, limit = 50, search?: string): Promise<{ data: Barber[]; total: number; page: number; totalPages: number; limit: number }> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { kind: { $in: ['Empleado', 'Admin'] } };

    if (search?.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [
        { name: regex },
        { lastname: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [docs, total] = await Promise.all([
      BarberModel.find(filter).skip(skip).limit(limit).lean(),
      BarberModel.countDocuments(filter),
    ]);

    return {
      data: docs.map((doc) => {
        if (!isBarberRaw(doc)) {
          throw new Error('Documento inválido en la colección de barberos');
        }
        return toBarberEntity(doc);
      }),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
    };
  }

  async createBarber(barber: Barber): Promise<Barber> {
    const doc = await Employee.create(toBarberEmployeeData(barber));
    return toBarberEntity(doc);
  }

  async updateBarber(id: string, update: BarberUpdate): Promise<Barber | null> {
    if ('password' in update && update.passwordHash === undefined) {
      throw new Error('Password must be pre-hashed. Use passwordHash field.');
    }

    const data: Record<string, unknown> = { ...update };
    if (update.passwordHash !== undefined) {
      data.password = update.passwordHash;
      delete data.passwordHash;
    }

    const doc = await BarberModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: data },
      { returnDocument: 'after', strict: false }
    ).lean();

    if (!doc) {
      return null;
    }
    if (!isBarberRaw(doc)) {
      throw new Error(`Documento inválido tras actualizar barbero ${id}`);
    }
    return toBarberEntity(doc);
  }

  async deactivateBarber(id: string): Promise<void> {
    await Employee.findByIdAndUpdate(id, { isActive: false });
  }

  async deleteBarber(id: string): Promise<void> {
    await BarberModel.findByIdAndDelete(id);
  }

  async updateSchedule(id: string, schedule: BarberSchedule): Promise<Barber | null> {
    const doc = await BarberModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { schedule } },
      { returnDocument: 'after', strict: false }
    ).lean();

    if (!doc) {
      return null;
    }
    if (!isBarberRaw(doc)) {
      throw new Error(`Documento inválido tras actualizar schedule del barbero ${id}`);
    }
    return toBarberEntity(doc);
  }
}
