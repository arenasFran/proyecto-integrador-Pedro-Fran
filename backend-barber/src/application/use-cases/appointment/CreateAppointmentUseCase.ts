import { Appointment } from '../../../domain/entities/Appointment';
import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { CreateAppointmentDTO } from '../../dto/appointment/CreateAppointmentDTO';
import { AppError } from '../../errors/AppError';
import { SERVICES } from '../../../infrastructure/config/services';

const toMinutes = (time: string): number | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const toTimeString = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const doesOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean => {
  const aStart = toMinutes(startA);
  const aEnd = toMinutes(endA);
  const bStart = toMinutes(startB);
  const bEnd = toMinutes(endB);
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) {
    return true;
  }
  return aStart < bEnd && bStart < aEnd;
};

export class CreateAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly barberRepository: IBarberRepository
  ) {}

  async execute(dto: CreateAppointmentDTO): Promise<{ message: string; appointment: Record<string, unknown> }> {
    const barber = await this.barberRepository.findEmployeeById(dto.barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }
    if (!barber.isActive) {
      throw new AppError('El barbero no está activo.', 400);
    }

    const service = SERVICES.find((s) => s.id === dto.serviceId);
    if (!service) {
      throw new AppError('Servicio no encontrado.', 404);
    }

    const startMinutes = toMinutes(dto.startTime);
    if (startMinutes === null) {
      throw new AppError('Formato de hora inválido.', 400);
    }
    const endMinutes = startMinutes + service.durationMinutes;
    const endTime = toTimeString(endMinutes);

    const existingAppointments = await this.appointmentRepository.findByBarberAndDate(
      dto.barberId,
      dto.date
    );

    for (const existing of existingAppointments) {
      if (existing.status === 'Cancelado') continue;
      if (doesOverlap(dto.startTime, endTime, existing.startTime, existing.endTime)) {
        throw new AppError('El horario seleccionado ya está ocupado.', 409);
      }
    }

    const now = new Date();
    const appointment = Appointment.create({
      id: '',
      barberId: dto.barberId,
      clientId: dto.clientId,
      clientName: dto.clientName,
      clientLastname: dto.clientLastname,
      clientPhone: dto.clientPhone,
      clientEmail: dto.clientEmail,
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      serviceDuration: service.durationMinutes,
      date: dto.date,
      startTime: dto.startTime,
      endTime,
      status: 'Pendiente',
      createdAt: now,
      updatedAt: now,
    });

    const created = await this.appointmentRepository.create(appointment.toPrimitives());

    return {
      message: 'Turno creado exitosamente',
      appointment: created.toPrimitives(),
    };
  }
}
