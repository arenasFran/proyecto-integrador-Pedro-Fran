import { Appointment } from '../../../domain/entities/Appointment';
import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { StaticServiceRepository } from '../../../infrastructure/repositories/static/StaticServiceRepository';
import { MongoClientRepository } from '../../../infrastructure/repositories/mongodb/MongoClientRepository';
import { MongoTempLockRepository } from '../../../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { IEmailService } from '../../ports/IEmailService';
import { AppointmentProps } from '../../../domain/entities/Appointment';

type CreateAppointmentDTO = {
  barberId: string;
  serviceId: string;
  date: string;
  startTime: string;
  clientId?: string;
  clientName: string;
  clientLastname: string;
  clientPhone?: string;
  clientEmail?: string;
  tempLockId?: string;
  createdBy?: { type: 'staff' | 'registered' | 'anonymous'; userId?: string };
};
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
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly barberRepository: MongoBarberRepository,
    private readonly serviceRepository: StaticServiceRepository,
    private readonly clientRepository: MongoClientRepository,
    private readonly emailService: IEmailService,
    private readonly tempLockRepository: MongoTempLockRepository
  ) {}

  async execute(dto: CreateAppointmentDTO): Promise<{ message: string; appointment: AppointmentProps }> {
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

    const barber = await this.barberRepository.findBarberById(dto.barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }
    if (!barber.isActive) {
      throw new AppError('El barbero no está activo.', 400);
    }

    // Task 7 — Límite máximo de anticipación por barbero
    const [y, m, d] = dto.date.split('-').map(Number);
    const [ny, nm, nd] = nowInTz.date.split('-').map(Number);
    const aptEpoch = Date.UTC(y, m - 1, d);
    const nowEpoch = Date.UTC(ny, nm - 1, nd);
    const diffDays = (aptEpoch - nowEpoch) / (1000 * 60 * 60 * 24);
    if (diffDays > barber.maxAdvanceDays) {
      throw new AppError(
        `No se puede reservar con más de ${barber.maxAdvanceDays} días de anticipación.`, 400
      );
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

    // RN10 — Cliente no registrado: buscar o crear entidad
    if (!dto.clientId) {
      let unregisteredClient = await this.findOrCreateUnregisteredClient(dto);
      dto.clientId = unregisteredClient.id;
    }

    // RN15 — Máximo 1 turno activo por cliente
    await this.validateMaxOneActive(dto, undefined, !!dto.clientId);

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
      status: 'Confirmado',
      paymentStatus: 'Pendiente',
      paymentMethod: 'local',
      createdBy: dto.createdBy,
      statusHistory: [{ status: 'Confirmado', timestamp: now, actor: 'system' }],
      createdAt: now,
      updatedAt: now,
    });

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

    // Validar TempLock antes de crear
    if (dto.tempLockId) {
      const lock = await this.tempLockRepository.findById(dto.tempLockId);
      if (!lock) {
        throw new AppError('El horario ya fue reservado. Intentá de nuevo.', 409);
      }
      if (lock.barberId !== dto.barberId || lock.date !== dto.date || lock.startTime !== dto.startTime) {
        throw new AppError('El horario ya fue reservado. Intentá de nuevo.', 409);
      }
    }

    // Crear el turno
    let created;
    try {
      created = await this.appointmentRepository.create(appointment.toPrimitives());
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new AppError('El horario ya está ocupado.', 409);
      }
      throw error;
    }

    // Eliminar TempLock si existe
    if (dto.tempLockId) {
      await this.tempLockRepository.deleteOne(dto.barberId, dto.date, dto.startTime).catch(() => {});
    }

    // RN17 — Notificar por email (asíncrono, no bloqueante)
    this.sendCreationEmail(created, barber.name, barber.lastname);

    return {
      message: 'Turno creado exitosamente',
      appointment: created.toPrimitives(),
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

  async validateMaxOneActive(
    dto: CreateAppointmentDTO,
    excludeAppointmentId: string | undefined,
    isRegistered: boolean
  ): Promise<void> {
    let activeAppointments: import('../../../domain/entities/Appointment').Appointment[] = [];

    if (dto.clientId) {
      activeAppointments = await this.appointmentRepository.findByClientId(dto.clientId);
    } else if (dto.clientEmail && dto.clientPhone) {
      activeAppointments = await this.appointmentRepository.findByContact(dto.clientEmail, dto.clientPhone);
    }

    const filtered = excludeAppointmentId
      ? activeAppointments.filter((a) => a.id !== excludeAppointmentId)
      : activeAppointments;

    const hasActive = filtered.some(
      (a) => a.status === 'Confirmado'
    );

    if (hasActive) {
      if (isRegistered) {
        throw new AppError(
          'Ya tenés un turno activo. Reagendalo desde Mis Turnos.',
          409
        );
      } else {
        throw new AppError(
          'Ya tenés un turno activo con estos datos. Registrate para poder reagendarlo.',
          409
        );
      }
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
          subject: 'Turno agendado',
          html: `<p>Tu turno con ${barberName} ${barberLastname} el ${appointment.date} a las ${appointment.startTime} fue agendado exitosamente.</p>
<p>Servicio: ${appointment.serviceName}</p>
<p>Precio: $${appointment.servicePrice}</p>
<p>Estado de pago: ${appointment.paymentStatus === 'Pagado' ? 'Pagado' : 'Pendiente — abonás en el local'}</p>`,
      })
      .catch((error) => {
        console.error('Error enviando email de creación:', error);
      });
  }
}
