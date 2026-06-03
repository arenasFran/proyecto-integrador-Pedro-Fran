import { Appointment } from '../../../domain/entities/Appointment';
import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { IServiceRepository } from '../../../domain/repositories/IServiceRepository';
import { CreateAppointmentDTO } from '../../dto/appointment/CreateAppointmentDTO';
import { AppointmentResponseDTO } from '../../dto/appointment/AppointmentResponseDTO';
import { AppError } from '../../errors/AppError';
import { toMinutes, toTimeString, doesOverlap } from '../../../domain/utils/time';

export class CreateAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly barberRepository: IBarberRepository,
    private readonly serviceRepository: IServiceRepository
  ) {}

  async execute(dto: CreateAppointmentDTO): Promise<{ message: string; appointment: AppointmentResponseDTO }> {
    const barber = await this.barberRepository.findEmployeeById(dto.barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }
    if (!barber.isActive) {
      throw new AppError('El barbero no está activo.', 400);
    }

    const service = await this.serviceRepository.findById(dto.serviceId);
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

    const primitives = created.toPrimitives();
    return {
      message: 'Turno creado exitosamente',
      appointment: primitives,
    };
  }
}
