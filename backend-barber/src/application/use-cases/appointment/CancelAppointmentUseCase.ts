import mongoose from 'mongoose';
import { MongoAppointmentRepository, UpdateStatusData } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { IEmailService } from '../../ports/IEmailService';
import { AppError } from '../../../domain/errors/AppError';
import { toMinutes, getNowInTimezone } from '../../../domain/utils/time';

export class CancelAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly membershipRepository: MongoMembershipRepository,
    private readonly emailService: IEmailService,
    private readonly cancelMinHoursBefore: number,
    private readonly barberRepository: MongoBarberRepository
  ) {}

  async execute(
    id: string,
    userId: string,
    userKind: string,
    reason?: string,
    barberId?: string
  ): Promise<{ message: string }> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new AppError('Turno no encontrado.', 404);
    }

    // Idempotent: ya cancelado → 200 sin mutación
    if (appointment.status === 'Cancelado') {
      return { message: 'El turno ya se encontraba cancelado' };
    }

    // RN21 — Permission check
    const isOwner = appointment.clientId === userId;
    const isAdmin = userKind === 'Admin';
    const isAssignedBarber = userKind === 'Empleado' && appointment.barberId === userId;
    if (!isOwner && !isAdmin && !isAssignedBarber) {
      throw new AppError('No tenés permiso para cancelar este turno.', 403);
    }

    // Application-level rules before entity mutation
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

    const actor = await this.resolveCancelActor(userId, isAdmin || isAssignedBarber, appointment);

    // Entity validates transition internally
    try {
      appointment.cancel(reason, actor);
    } catch (error) {
      throw new AppError(
        `No se puede cancelar un turno en estado ${appointment.status}.`, 400
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

      // Restaurar cupón de membresía si corresponde
      if (appointment.paymentMethod === 'memberPass' && appointment.clientId) {
        const membership = await this.membershipRepository.findActiveByUser(appointment.clientId, session).catch(() => null);
        if (membership) {
          membership.restoreCoupon();
          await this.membershipRepository.incrementCouponsUsed(membership.id, -1, session);
        }
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // RN17 — Email notification (async, non-blocking)
    const clientEmail = appointment.clientEmail;
    if (clientEmail) {
      this.emailService
        .sendMail({
          to: clientEmail,
          subject: 'Turno cancelado',
          html: `<p>Tu turno del ${appointment.date} a las ${appointment.startTime} fue cancelado.</p>
${reason ? `<p>Motivo: ${reason}</p>` : ''}`,
        })
        .catch((error) => {
          console.error('Error enviando email de cancelacion:', error);
        });
    }

    return { message: 'Turno cancelado exitosamente' };
  }

  private async resolveCancelActor(
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


