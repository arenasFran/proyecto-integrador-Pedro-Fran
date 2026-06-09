import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { IEmailService } from '../../ports/IEmailService';
import { AppError } from '../../errors/AppError';
import { VALID_TRANSITIONS, StatusHistoryEntry } from '../../../domain/types/appointment';
import { toMinutes, getNowInTimezone } from '../../../domain/utils/time';

export class CancelAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly emailService: IEmailService,
    private readonly cancelMinHoursBefore: number
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

    // RN09 — State machine validation
    const allowedFrom = VALID_TRANSITIONS[appointment.status];
    if (!allowedFrom || !allowedFrom.includes('Cancelado')) {
      throw new AppError(
        `No se puede cancelar un turno en estado ${appointment.status}.`, 400
      );
    }

    // RN21 — Permission check
    const isOwner = appointment.clientId === userId;
    const isAdmin = userKind === 'Admin';
    const isAssignedBarber = userKind === 'Empleado' && appointment.barberId === userId;
    if (!isOwner && !isAdmin && !isAssignedBarber) {
      throw new AppError('No tenés permiso para cancelar este turno.', 403);
    }

    // Task 2 — Límite mínimo de anticipación
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

    const actorMap: Record<string, string> = { Admin: 'admin', Empleado: 'empleado' };
    const actor = actorMap[userKind] || 'cliente';

    const statusHistoryEntry: StatusHistoryEntry = {
      status: 'Cancelado',
      timestamp: new Date(),
      actor,
    };

    await this.appointmentRepository.updateStatus(id, {
      status: 'Cancelado',
      cancelReason: reason,
      cancelledAt: new Date(),
      cancelledBy: actor,
      statusHistoryEntry,
    });

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
}
