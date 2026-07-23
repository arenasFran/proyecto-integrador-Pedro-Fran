import mongoose from 'mongoose';
import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoServiceRepository } from '../../../infrastructure/repositories/mongodb/MongoServiceRepository';
import { MongoBarberBlockRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberBlockRepository';
import { IEmailService } from '../../ports/IEmailService';
import { AppointmentProps } from '../../../domain/entities/Appointment';
import { AppError } from '../../../domain/errors/AppError';
import { sendMailWithRetry } from '../shared/sendMailWithRetry';

type RescheduleAppointmentDTO = {
  date: string;
  startTime: string;
  barberId: string;
};
import {
  toMinutes,
  doesOverlap,
  getNowInTimezone,
  validateAppointmentSlot,
} from '../../../domain/utils/time';
import { VALID_TRANSITIONS } from '../../../domain/types/appointment';

export class RescheduleAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly barberRepository: MongoBarberRepository,
    private readonly serviceRepository: MongoServiceRepository,
    private readonly emailService: IEmailService,
    private readonly blockRepository: MongoBarberBlockRepository
  ) {}

  async execute(
    id: string,
    dto: RescheduleAppointmentDTO,
    userId: string,
    userKind: string
  ): Promise<{ message: string; appointment: AppointmentProps }> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new AppError('Turno no encontrado.', 404);
    }

    // RN09 — No se puede reagendar en estado terminal
    const allowedTransitions = VALID_TRANSITIONS[appointment.status];
    if (!allowedTransitions || allowedTransitions.length === 0) {
      throw new AppError(
        `No se puede reagendar un turno ${appointment.status}.`, 400
      );
    }

    // RN20 — Permission: owner, admin, or assigned barber
    const isOwner = appointment.clientId === userId;
    const isAdmin = userKind === 'Admin';
    const isAssignedBarber = userKind === 'Empleado' && appointment.barberId === userId;
    if (!isOwner && !isAdmin && !isAssignedBarber) {
      throw new AppError('No tenés permiso para reagendar este turno.', 403);
    }

    const actor = await this.resolveActor(userId, isAdmin || isAssignedBarber, appointment);

    const barber = await this.barberRepository.findBarberById(dto.barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }
    if (!barber.isActive) {
      throw new AppError('El barbero no está activo.', 400);
    }

    // Task 7 — Límite máximo de anticipación por barbero
    const nowInTz = getNowInTimezone();
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

    const service = await this.serviceRepository.findByIdIncludingInactive(appointment.serviceId);
    if (!service) {
      throw new AppError('Servicio no encontrado.', 404);
    }

    // RN01 — Revalidar fecha
    if (dto.date < nowInTz.date) {
      throw new AppError('No se puede agendar en el pasado.', 400);
    }
    if (dto.date === nowInTz.date) {
      const startMins = toMinutes(dto.startTime);
      if (startMins !== null && startMins <= nowInTz.minutes) {
        throw new AppError('La hora ya pasó.', 400);
      }
    }

    const { startMinutes, endMinutes, endTime, daySchedule } = validateAppointmentSlot(
      dto.startTime, dto.date, barber
    );

    // Transacción: colisión + turno activo + actualización del turno
    const session = await mongoose.startSession();
    let updated;
    try {
      session.startTransaction();

      // RN04 — Colisión
      const existingAppointments = await this.appointmentRepository.findByBarberAndDate(
        dto.barberId,
        dto.date,
        session
      );
      for (const existing of existingAppointments) {
        if (existing.status === 'Cancelado') continue;
        if (existing.id === id) continue; // excluirse a sí mismo
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

      updated = await this.appointmentRepository.update(id, {
        date: dto.date,
        startTime: dto.startTime,
        endTime,
        barberId: dto.barberId,
        serviceDuration: barber.slotDuration,
        version: appointment.version,
      }, session);

      if (!updated) {
        throw new AppError(
          'El turno fue modificado por otro usuario. Recargá e intentá de nuevo.',
          409
        );
      }

      await this.appointmentRepository.updateStatus(id, {
        statusHistoryEntry: {
          status: updated.status,
          timestamp: new Date(),
          actor: `${actor} (reprogramado)`,
        },
      }, session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // RN17 — Email notification (async)
    const clientEmail = updated!.clientEmail;
    if (clientEmail) {
      void sendMailWithRetry(
        this.emailService,
        {
          to: clientEmail,
          subject: 'Turno reprogramado',
          html: `<p>Tu turno fue reprogramado.</p>
<p>Nueva fecha: ${updated!.date} a las ${updated!.startTime}</p>
<p>Barbero: ${barber.name} ${barber.lastname}</p>`,
        },
        'Error enviando email de reprogramacion'
      );
    }

    return {
      message: 'Turno reagendado exitosamente',
      appointment: updated!.toPrimitives(),
    };
  }

  private async resolveActor(
    userId: string,
    isStaff: boolean,
    appointment: import('../../../domain/entities/Appointment').Appointment
  ): Promise<string> {
    if (isStaff) {
      const staffMember = await this.barberRepository.findBarberById(userId);
      if (staffMember) {
        return `${staffMember.name} ${staffMember.lastname}`;
      }
      return 'Personal';
    }
    return `${appointment.clientName} ${appointment.clientLastname}`;
  }
}

