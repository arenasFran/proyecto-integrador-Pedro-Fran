import mongoose from 'mongoose';
import { Barber, BarberSchedule } from '../../../domain/entities/Barber';
import { BarberUpdate, IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { BarberMapper } from '../../mappers/BarberMapper';
import type { IAdmin, IEmployee } from './models/barber.model';
import { Barber as BarberModel, Employee } from './models/barber.model';

export class MongoBarberRepository implements IBarberRepository {
  async findEmployeeById(id: string): Promise<Barber | null> {
    const doc = await BarberModel.findById(id).lean();
    if (!doc) {
      return null;
    }
    return BarberMapper.fromDocument(doc as unknown as IEmployee | IAdmin);
  }

  async findAllEmployees(): Promise<Barber[]> {
    const docs = await BarberModel.find({ kind: { $in: ['Empleado', 'Admin'] } }).lean();
    return docs.map((doc) => BarberMapper.fromDocument(doc as unknown as IEmployee | IAdmin));
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

    return BarberMapper.fromDocument(doc as unknown as IEmployee | IAdmin);
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

    return BarberMapper.fromDocument(doc as unknown as IEmployee | IAdmin);
  }
}
