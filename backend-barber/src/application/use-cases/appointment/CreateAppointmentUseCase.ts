import { Appointment } from '../../../domain/entities/Appointment';
import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { IServiceRepository } from '../../../domain/repositories/IServiceRepository';
import { IClientRepository } from '../../../domain/repositories/IClientRepository';
import { ITempLockRepository } from '../../../domain/repositories/ITempLockRepository';
import { IEmailService } from '../../ports/IEmailService';
import { CreateAppointmentDTO } from '../../dto/appointment/CreateAppointmentDTO';
import { AppointmentResponseDTO } from '../../dto/appointment/AppointmentResponseDTO';
import { AppError } from '../../errors/AppError';
import {
  toMinutes,
  toTimeString,
  doesOverlap,
  getDayKey,
  isWithinSchedule,
  isInBreakRange,
  getNowInTimezone,
} from '../../../domain/utils/time';

export class CreateAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly barberRepository: IBarberRepository,
    private readonly serviceRepository: IServiceRepository,
    private readonly clientRepository: IClientRepository,
    private readonly emailService: IEmailService,
    private readonly tempLockRepository: ITempLockRepository
  ) {}

  async execute(dto: CreateAppointmentDTO): Promise<{ message: string; appointment: AppointmentResponseDTO }> {
    const nowInTz = getNowInTimezone();

    // RN01 — Fecha y hora no pueden estar en el pasado
    if (dto.date < nowInTz.date) {
      throw new AppError('No se puede agendar en el pasado.', 400);
    }
    if (dto.date === nowInTz.date) {
      const startMins = toMinutes(dto.startTime);
      if (startMins !== null && startMins <= nowInTz.minutes) {
        throw new AppError('La hora ya pasó.', 400);
      }
    }

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
    const endMinutes = startMinutes + barber.slotDuration;
    const endTime = toTimeString(endMinutes);

    // RN02 — Turno dentro del horario laboral del barbero
    const dayKey = getDayKey(dto.date);
    const daySchedule = barber.schedule[dayKey];
    if (!isWithinSchedule(startMinutes, endMinutes, daySchedule)) {
      throw new AppError('El turno está fuera del horario laboral del barbero.', 400);
    }

    // RN03 — Turno no puede superponerse con breaks
    if (isInBreakRange(startMinutes, endMinutes, daySchedule.breaks)) {
      throw new AppError('El turno se superpone con un descanso del barbero.', 400);
    }

    // RN04 — Colisión con otros turnos activos
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

    // RN10 — Cliente no registrado: buscar o crear entidad
    if (!dto.clientId) {
      let unregisteredClient = await this.findOrCreateUnregisteredClient(dto);
      dto.clientId = unregisteredClient.id;
    }

    // RN15 — Máximo 1 turno activo por día por cliente
    await this.validateMaxOneActivePerDay(dto, undefined);

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
      serviceDuration: barber.slotDuration,
      date: dto.date,
      startTime: dto.startTime,
      endTime,
      status: 'Pendiente',
      createdAt: now,
      updatedAt: now,
    });

    const created = await this.appointmentRepository.create(appointment.toPrimitives());

    // RN16 — Eliminar TempLock si existe
    if (dto.tempLockId) {
      this.tempLockRepository.deleteOne(dto.barberId, dto.date, dto.startTime).catch(() => {});
    }

    // RN17 — Notificar por email (asíncrono, no bloqueante)
    this.sendCreationEmail(created, barber.name, barber.lastname);

    const primitives = created.toPrimitives();
    return {
      message: 'Turno creado exitosamente',
      appointment: primitives,
    };
  }

  private async findOrCreateUnregisteredClient(
    dto: CreateAppointmentDTO
  ): Promise<import('../../../domain/entities/Client').Client> {
    let client = null;
    if (dto.clientEmail) {
      client = await this.clientRepository.findByEmail(dto.clientEmail);
    }
    if (!client && dto.clientPhone) {
      client = await this.clientRepository.findByPhone(dto.clientPhone);
    }
    if (!client) {
      client = await this.clientRepository.createUnregistered({
        name: dto.clientName,
        lastname: dto.clientLastname,
        phone: dto.clientPhone,
        contactEmail: dto.clientEmail,
      });
    }
    return client;
  }

  async validateMaxOneActivePerDay(
    dto: CreateAppointmentDTO,
    excludeAppointmentId?: string
  ): Promise<void> {
    let activeAppointments: import('../../../domain/entities/Appointment').Appointment[] = [];

    if (dto.clientId) {
      activeAppointments = await this.appointmentRepository.findByClientAndDate(
        dto.clientId,
        dto.date
      );
    } else if (dto.clientEmail || dto.clientPhone) {
      activeAppointments = await this.appointmentRepository.findByContactAndDate(
        dto.date,
        dto.clientEmail,
        dto.clientPhone
      );
    }

    const filtered = excludeAppointmentId
      ? activeAppointments.filter((a) => a.id !== excludeAppointmentId)
      : activeAppointments;

    const hasActive = filtered.some(
      (a) => a.status === 'Pendiente' || a.status === 'Confirmado'
    );

    if (hasActive) {
      throw new AppError(
        'Ya tenés un turno activo para esta fecha. Completalo o cancelalo antes de reservar otro.',
        409
      );
    }
  }

  private sendCreationEmail(
    appointment: import('../../../domain/entities/Appointment').Appointment,
    barberName: string,
    barberLastname: string
  ): void {
    const clientEmail = appointment.clientEmail;
    if (!clientEmail) return;

    this.emailService
      .sendMail({
        to: clientEmail,
        subject: 'Turno confirmado',
        html: `<p>Tu turno con ${barberName} ${barberLastname} el ${appointment.date} a las ${appointment.startTime} fue creado exitosamente.</p>
<p>Servicio: ${appointment.serviceName}</p>
<p>Precio: $${appointment.servicePrice}</p>`,
      })
      .catch((error) => {
        console.error('Error enviando email de creación:', error);
      });
  }
}
