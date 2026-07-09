import mongoose from 'mongoose';
import { Appointment } from '../../../domain/entities/Appointment';
import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoServiceRepository } from '../../../infrastructure/repositories/mongodb/MongoServiceRepository';
import { MongoClientRepository } from '../../../infrastructure/repositories/mongodb/MongoClientRepository';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoTempLockRepository } from '../../../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { MongoBarberBlockRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberBlockRepository';
import { IEmailService } from '../../ports/IEmailService';
import { AppointmentProps } from '../../../domain/entities/Appointment';
import { AppError } from '../../../domain/errors/AppError';
import { Phone } from '../../../domain/value-objects/Phone';

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
  paymentMethod?: 'local' | 'online' | 'memberPass';
  tempLockId?: string;
  createdBy?: { type: 'staff' | 'registered' | 'anonymous'; userId?: string };
};
import {
  toMinutes,
  doesOverlap,
  getNowInTimezone,
  getNowDateInTimezone,
  validateAppointmentSlot,
} from '../../../domain/utils/time';

const MAX_ACTIVE_APPOINTMENTS = 10;

export class CreateAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly barberRepository: MongoBarberRepository,
    private readonly serviceRepository: MongoServiceRepository,
    private readonly clientRepository: MongoClientRepository,
    private readonly emailService: IEmailService,
    private readonly tempLockRepository: MongoTempLockRepository,
    private readonly blockRepository: MongoBarberBlockRepository,
    private readonly membershipRepository: MongoMembershipRepository
  ) {}

  async execute(dto: CreateAppointmentDTO): Promise<{ message: string; appointment: AppointmentProps }> {
    if (dto.clientPhone) {
      dto.clientPhone = Phone.create(dto.clientPhone).getValue();
    }

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

    const { startMinutes, endMinutes, endTime, daySchedule } = validateAppointmentSlot(
      dto.startTime, dto.date, barber
    );

    // RN10 — Cliente no registrado: buscar o crear entidad
    if (!dto.clientId) {
      let unregisteredClient = await this.findOrCreateUnregisteredClient(dto);
      dto.clientId = unregisteredClient.id;
    }

    const now = getNowDateInTimezone();
    const paymentMethod = dto.paymentMethod || 'local';
    const creationActor = await this.resolveCreationActor(dto);

    let needsMembershipRedeem = false;
    if (paymentMethod === 'memberPass') {
      if (!dto.clientId) {
        throw new AppError('Debés iniciar sesión para usar la membresía.', 400);
      }
      needsMembershipRedeem = true;
    }

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
      paymentStatus: paymentMethod === 'memberPass' ? 'Pagado' : 'Pendiente',
      paymentMethod,
      createdBy: dto.createdBy,
      statusHistory: [{ status: 'Confirmado', timestamp: now, actor: creationActor }],
      version: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Transacción: canje de cupón + creación de turno + limpieza TempLock
    const session = await mongoose.startSession();
    let created;
    try {
      session.startTransaction();

      // RN15 — Máximo MAX_ACTIVE_APPOINTMENTS turnos activos por cliente
      await this.validateActiveAppointmentsLimit(dto, session);

      if (needsMembershipRedeem) {
        const membership = await this.membershipRepository.findActiveByUser(dto.clientId!, session);
        if (!membership) {
          throw new AppError('No tenés una membresía activa.', 400);
        }
        membership.redeemCoupon();
        await this.membershipRepository.incrementCouponsUsed(membership.id, 1, session);
      }

      // RN04 — Colisión con otros turnos activos
      const existingAppointments = await this.appointmentRepository.findByBarberAndDate(
        dto.barberId,
        dto.date,
        session
      );

      for (const existing of existingAppointments) {
        if (existing.status === 'Cancelado') continue;
        if (doesOverlap(dto.startTime, endTime, existing.startTime, existing.endTime)) {
          throw new AppError('El horario seleccionado ya está ocupado.', 409);
        }
      }

      // RN04b — Colisión con bloques del barbero
      const blocks = await this.blockRepository.findByBarberAndDate(dto.barberId, dto.date, session);
      for (const block of blocks) {
        if (doesOverlap(dto.startTime, endTime, block.startTime, block.endTime)) {
          throw new AppError('El horario seleccionado está bloqueado para este barbero.', 409);
        }
      }

      // Validar TempLock antes de crear
      if (dto.tempLockId) {
        const lock = await this.tempLockRepository.findById(dto.tempLockId, session);
        if (!lock) {
          throw new AppError('El horario ya fue reservado. Intentá de nuevo.', 409);
        }
        if (lock.barberId !== dto.barberId || lock.date !== dto.date || lock.startTime !== dto.startTime) {
          throw new AppError('El horario ya fue reservado. Intentá de nuevo.', 409);
        }
      }

      // Crear el turno
      created = await this.appointmentRepository.create(appointment.toPrimitives(), session);

      // Eliminar TempLock si existe
      if (dto.tempLockId) {
        await this.tempLockRepository.deleteOne(dto.barberId, dto.date, dto.startTime, session).catch(() => {});
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // RN17 — Notificar por email (asíncrono, no bloqueante)
    this.sendCreationEmail(created!, barber.name, barber.lastname);

    return {
      message: 'Turno creado exitosamente',
      appointment: created!.toPrimitives(),
    };
  }

  private async resolveCreationActor(dto: CreateAppointmentDTO): Promise<string> {
    if (dto.createdBy?.type === 'staff' && dto.createdBy.userId) {
      const staffMember = await this.barberRepository.findBarberById(dto.createdBy.userId);
      if (staffMember) {
        return `${staffMember.name} ${staffMember.lastname}`;
      }
    }
    return `${dto.clientName} ${dto.clientLastname}`;
  }

  private async findOrCreateUnregisteredClient(
    dto: CreateAppointmentDTO
  ): Promise<import('../../../domain/entities/Client').Client> {
    if (dto.clientEmail && dto.clientPhone) {
      const client = await this.clientRepository.findByBoth(dto.clientEmail, dto.clientPhone);
      if (client) return client;
    }
    return this.clientRepository.createUnregistered({
      name: dto.clientName,
      lastname: dto.clientLastname,
      phone: dto.clientPhone,
      contactEmail: dto.clientEmail,
    });
  }

  async validateActiveAppointmentsLimit(
    dto: CreateAppointmentDTO,
    session?: mongoose.ClientSession
  ): Promise<void> {
    let appointments: import('../../../domain/entities/Appointment').Appointment[] = [];

    if (dto.clientId) {
      appointments = await this.appointmentRepository.findByClientId(dto.clientId, session);
    } else if (dto.clientEmail && dto.clientPhone) {
      appointments = await this.appointmentRepository.findByContact(dto.clientEmail, dto.clientPhone, session);
    }

    const activeCount = appointments.filter((a) => a.status === 'Confirmado').length;

    if (activeCount >= MAX_ACTIVE_APPOINTMENTS) {
      throw new AppError(
        `Alcanzaste el máximo de ${MAX_ACTIVE_APPOINTMENTS} turnos activos. Esperá a que se completen algunos antes de reservar otro.`,
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


