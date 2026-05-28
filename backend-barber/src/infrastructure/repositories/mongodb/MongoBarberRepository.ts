import { Barber, BarberSchedule } from '../../../domain/entities/Barber';
import { BarberUpdate, IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { BarberMapper } from '../../mappers/BarberMapper';
import { Employee } from './models/barber.model';

export class MongoBarberRepository implements IBarberRepository {
  async findEmployeeById(id: string): Promise<Barber | null> {
    const doc = await Employee.findById(id);
    if (!doc) {
      return null;
    }
    return BarberMapper.fromEmployee(doc);
  }

  async findAllEmployees(): Promise<Barber[]> {
    const docs = await Employee.find();
    return docs.map((doc) => BarberMapper.fromEmployee(doc));
  }

  async createEmployee(barber: Barber): Promise<Barber> {
    const doc = await Employee.create(BarberMapper.toEmployeeData(barber));
    return BarberMapper.fromEmployee(doc);
  }

  async updateEmployee(id: string, update: BarberUpdate): Promise<Barber | null> {
    const data: Record<string, unknown> = { ...update };
    if (update.passwordHash !== undefined) {
      data.password = update.passwordHash;
      delete data.passwordHash;
    }

    const doc = await Employee.findByIdAndUpdate(id, data, { new: true });
    if (!doc) {
      return null;
    }

    return BarberMapper.fromEmployee(doc);
  }

  async deactivateEmployee(id: string): Promise<void> {
    await Employee.findByIdAndUpdate(id, { isActive: false });
  }

  async updateSchedule(id: string, schedule: BarberSchedule): Promise<Barber | null> {
    const doc = await Employee.findByIdAndUpdate(id, { schedule }, { new: true });
    if (!doc) {
      return null;
    }

    return BarberMapper.fromEmployee(doc);
  }
}
