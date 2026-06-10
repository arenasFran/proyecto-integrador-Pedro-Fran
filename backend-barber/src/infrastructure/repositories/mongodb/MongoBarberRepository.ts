import mongoose from 'mongoose';
import { Barber, BarberSchedule } from '../../../domain/entities/Barber';
import { BarberUpdate, IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { BarberMapper } from '../../mappers/BarberMapper';
import { Barber as BarberModel, Employee } from './models/barber.model';
import { isBarberRaw } from './guards/barber.guards';

export class MongoBarberRepository implements IBarberRepository {
  async findEmployeeById(id: string): Promise<Barber | null> {
    const doc = await BarberModel.findById(id).lean();
    if (!doc) {
      return null;
    }
    if (!isBarberRaw(doc)) {
      throw new Error(`Documento inválido en barberos: el documento ${id} no cumple con el formato esperado`);
    }
    return BarberMapper.fromDocument(doc);
  }

  async findAllEmployees(): Promise<Barber[]> {
    const docs = await BarberModel.find({ kind: { $in: ['Empleado', 'Admin'] } }).lean();
    return docs.map((doc) => {
      if (!isBarberRaw(doc)) {
        throw new Error('Documento inválido en la colección de barberos');
      }
      return BarberMapper.fromDocument(doc);
    });
  }

  async createEmployee(barber: Barber): Promise<Barber> {
    const doc = await Employee.create(BarberMapper.toEmployeeData(barber));
    return BarberMapper.fromDocument(doc);
  }

  async updateEmployee(id: string, update: BarberUpdate): Promise<Barber | null> {
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
    return BarberMapper.fromDocument(doc);
  }

  async deactivateEmployee(id: string): Promise<void> {
    await Employee.findByIdAndUpdate(id, { isActive: false });
  }

  async deleteEmployee(id: string): Promise<void> {
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
    return BarberMapper.fromDocument(doc);
  }
}
