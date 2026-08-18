import mongoose from 'mongoose';
import { MongoAppointmentRepository, UpdateStatusData } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoClientRepository } from '../../../infrastructure/repositories/mongodb/MongoClientRepository';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { AppointmentStatus } from '../../../domain/types/appointment';
import { IEmailService } from '../../ports/IEmailService';
import { AppError } from '../../../domain/errors/AppError';
import { toMinutes, getNowInTimezone } from '../../../domain/utils/time';
import { sendMailWithRetry } from '../shared/sendMailWithRetry';
import { RevenueTracker } from '../../services/RevenueTracker';

export type UpdateAppointmentStatusDTO = {
  status: AppointmentStatus;
  cancelReason?: string;
};

export class UpdateAppointmentStatusUseCase {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly membershipRepository: MongoMembershipRepository,
    private readonly emailService: IEmailService,
    private readonly clientRepository: MongoClientRepository,
    private readonly cancelMinHoursBefore: number,
    private readonly barberRepository: MongoBarberRepository,
    private readonly revenueTracker?: RevenueTracker
  ) {}

  async execute(
    id: string,
    dto: UpdateAppointmentStatusDTO,
    userId?: string,
    userKind?: string
  ): Promise<{ message: string }> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new AppError('Turno no encontrado.', 404);
    }

    // Idempotent: Cancelado → Cancelado es 200 sin mutación
    if (appointment.status === 'Cancelado' && dto.status === 'Cancelado') {
      return { message: 'El turno ya se encontraba cancelado' };
    }

    // Permission check
    const isOwner = appointment.clientId === userId;
    const isAdmin = userKind === 'Admin';
    const isAssignedBarber = userKind === 'Empleado' && appointment.barberId === userId;
    if (!isOwner && !isAdmin && !isAssignedBarber) {
      throw new AppError('No tenés permiso para modificar este turno.', 403);
    }

    const actor = await this.resolveStaffActor(userId);

    // Application-level rules before entity mutation
    if (dto.status === 'Cancelado') {
      const nowInTz = getNowInTimezone();
      const aptStartMinutes = toMinutes(appointment.startTime);
      if (aptStartMinutes !== null) {
        const [y, m, d] = appointment.date.split('-').map(Number);
        const [ny, nm, nd] = nowInTz.date.split('-').map(Number);
        const aptEpochDays = Math.floor(Date.UTC(y, m - 1, d) / (1000 * 60 * 60 * 24));
        const nowEpochDays = Math.floor(Date.UTC(ny, nm - 1, nd) / (1000 * 60 * 60 * 24));
        const diffHours = ((aptEpochDays - nowEpochDays) * 24 * 60 + (aptStartMinutes - nowInTz.minutes)) / 60;
        if (diffHours < this.cancelMinHoursBefore) {
          throw new AppError(
            `No se puede cancelar con menos de ${this.cancelMinHoursBefore}h de anticipación.`, 409
          );
        }
      }
    }

    if (dto.status === 'NoShow') {
      const nowInTz = getNowInTimezone();
      const aptStartMinutes = toMinutes(appointment.startTime);
      if (aptStartMinutes !== null) {
        const [y, m, d] = appointment.date.split('-').map(Number);
        const [ny, nm, nd] = nowInTz.date.split('-').map(Number);
        const aptEpochDays = Math.floor(Date.UTC(y, m - 1, d) / (1000 * 60 * 60 * 24));
        const nowEpochDays = Math.floor(Date.UTC(ny, nm - 1, nd) / (1000 * 60 * 60 * 24));
        const diffMinutes = (aptEpochDays - nowEpochDays) * 24 * 60 + (aptStartMinutes - nowInTz.minutes);
        if (diffMinutes > 0) {
          throw new AppError(
            'No se puede marcar como NoShow un turno que aún no pasó.', 400
          );
        }
      }
    }

    // Entity methods validate transitions and mutate state
    try {
      if (dto.status === 'Cancelado') {
        appointment.cancel(dto.cancelReason, actor);
      } else if (dto.status === 'Completado') {
        appointment.complete(actor);
      } else if (dto.status === 'NoShow') {
        appointment.markNoShow(actor);
      } else {
        throw new Error(`Transición inválida a ${dto.status}.`);
      }
    } catch (error) {
      throw new AppError(
        `No se puede cambiar de ${appointment.status} a ${dto.status}.`, 400
      );
    }

    const lastEntry = appointment.statusHistory[appointment.statusHistory.length - 1];

    const updateData: UpdateStatusData = {
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
      statusHistoryEntry: lastEntry,
    };

    if (appointment.cancelReason) {
      updateData.cancelReason = appointment.cancelReason;
    }
    if (appointment.cancelledAt) {
      updateData.cancelledAt = appointment.cancelledAt;
    }
    if (appointment.cancelledBy) {
      updateData.cancelledBy = appointment.cancelledBy;
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      await this.appointmentRepository.updateStatus(id, updateData, session);

      // Restaurar cupón de membresía si se cancela
      if (dto.status === 'Cancelado' && appointment.paymentMethod === 'memberPass' && appointment.couponRedeemed && !appointment.couponRestoredAt) {
        const restored = await this.membershipRepository.atomicRestoreCoupon(appointment.membershipId!, session);
        if (restored) {
          appointment.markCouponRestored();
        }
      }

      // Contador de inasistencias (NoShow) del cliente
      if (dto.status === 'NoShow' && appointment.clientId) {
        await this.clientRepository.incrementarNoShow(appointment.clientId, session);
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // Los turnos cubiertos por un cupón ya fueron pagados al reservarse.
    // Completar el servicio no debe convertir el precio de lista en ingreso.
    if (dto.status === 'Completado' && appointment.paymentMethod !== 'memberPass') {
      await this.revenueTracker?.trackAppointment(
        id,
        appointment.servicePrice,
        new Date(),
        { barberId: appointment.barberId, serviceId: appointment.serviceId },
      );
    }

    // RN17 — Email notification (async, non-blocking)
    const clientEmail = appointment.clientEmail;
    if (clientEmail) {
      if (dto.status === 'Completado') {
        void sendMailWithRetry(
          this.emailService,
          {
            to: clientEmail,
            subject: 'Turno completado',
            html: `<p>Tu turno del ${appointment.date} a las ${appointment.startTime} fue marcado como completado. ¡Gracias por visitarnos!</p>`,
          },
          'Error enviando email de completado'
        );
      } else if (dto.status === 'NoShow') {
        void sendMailWithRetry(
          this.emailService,
          {
            to: clientEmail,
            subject: 'Turno no concretado (NoShow)',
            html: `<p>Tu turno del ${appointment.date} a las ${appointment.startTime} fue marcado como no concretado por inasistencia.</p>`,
          },
          'Error enviando email de NoShow'
        );
      }
    }

    return { message: `Estado actualizado a ${dto.status}` };
  }

  private async resolveStaffActor(userId?: string): Promise<string> {
    if (userId) {
      const staffMember = await this.barberRepository.findBarberById(userId);
      if (staffMember) {
        return `${staffMember.name} ${staffMember.lastname}`;
      }
    }
    return 'Personal';
  }
}


