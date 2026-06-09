import { Barber, BarberSchedule } from '../../domain/entities/Barber';
import type { IAdminRaw, IEmployeeRaw } from '../repositories/mongodb/models/barber.model';

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

export class BarberMapper {
  static fromDocument(doc: IEmployeeRaw | IAdminRaw): Barber {
    const schedule = doc.schedule || createDefaultSchedule();
    const slotDuration = doc.slotDuration ?? 30;

    return Barber.create({
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name,
      lastname: doc.lastname,
      phone: doc.phone,
      kind: doc.kind,
      specialties: doc.specialties || [],
      age: doc.age,
      photoUrl: doc.photoUrl ?? null,
      isActive: doc.isActive ?? true,
      slotDuration,
      schedule,
      passwordHash: doc.password,
    });
  }

  static toEmployeeData(barber: Barber): Record<string, unknown> {
    return {
      email: barber.email,
      password: barber.passwordHash,
      name: barber.name,
      lastname: barber.lastname,
      phone: barber.phone,
      kind: barber.kind,
      specialties: barber.specialties,
      age: barber.age,
      photoUrl: barber.photoUrl ?? null,
      isActive: barber.isActive,
      slotDuration: barber.slotDuration,
      schedule: barber.schedule,
    };
  }
}
