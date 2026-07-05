import { MongoAppointmentRepository, UpdateStatusData } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { AppointmentStatus } from '../../../domain/types/appointment';
import { IEmailService } from '../../ports/IEmailService';
import { AppError } from '../../../domain/errors/AppError';
import { toMinutes, getNowInTimezone } from '../../../domain/utils/time';

export type UpdateAppointmentStatusDTO = {
  status: AppointmentStatus;
  cancelReason?: string;
};

export class UpdateAppointmentStatusUseCase {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly membershipRepository: MongoMembershipRepository,
    private readonly emailService: IEmailService,
    private readonly cancelMinHoursBefore: number
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

    const actorMap: Record<string, string> = { Admin: 'admin', Empleado: 'empleado' };
    const actor = (userKind && actorMap[userKind]) || 'system';

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

    await this.appointmentRepository.updateStatus(id, updateData);

    // Restaurar cupón de membresía si se cancela
    if (dto.status === 'Cancelado' && appointment.paymentMethod === 'memberPass' && appointment.clientId) {
      const membership = await this.membershipRepository.findActiveByUser(appointment.clientId).catch(() => null);
      if (membership) {
        membership.restoreCoupon();
        await this.membershipRepository.save(membership);
      }
    }

    // RN17 — Email notification (async, non-blocking)
    const clientEmail = appointment.clientEmail;
    if (clientEmail) {
      if (dto.status === 'Completado') {
        this.emailService
          .sendMail({
            to: clientEmail,
            subject: 'Turno completado',
            html: `<p>Tu turno del ${appointment.date} a las ${appointment.startTime} fue marcado como completado. ¡Gracias por visitarnos!</p>`,
          })
          .catch((error) => {
            console.error('Error enviando email de completado:', error);
          });
      } else if (dto.status === 'NoShow') {
        this.emailService
          .sendMail({
            to: clientEmail,
            subject: 'Turno no concretado (NoShow)',
            html: `<p>Tu turno del ${appointment.date} a las ${appointment.startTime} fue marcado como no concretado por inasistencia.</p>`,
          })
          .catch((error) => {
            console.error('Error enviando email de NoShow:', error);
          });
      }
    }

    return { message: `Estado actualizado a ${dto.status}` };
  }
}


