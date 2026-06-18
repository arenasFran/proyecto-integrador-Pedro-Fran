import { MongoAppointmentRepository, UpdateStatusData } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { IEmailService } from '../../ports/IEmailService';
import { AppError } from '../../errors/AppError';
import { toMinutes, getNowInTimezone } from '../../../domain/utils/time';

export class CancelAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository,
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
    if (appointment.props.status === 'Cancelado') {
      return { message: 'El turno ya se encontraba cancelado' };
    }

    // RN21 — Permission check
    const isOwner = appointment.props.clientId === userId;
    const isAdmin = userKind === 'Admin';
    const isAssignedBarber = userKind === 'Empleado' && appointment.props.barberId === userId;
    if (!isOwner && !isAdmin && !isAssignedBarber) {
      throw new AppError('No tenés permiso para cancelar este turno.', 403);
    }

    // Application-level rules before entity mutation
    const nowInTz = getNowInTimezone();
    const aptStartMinutes = toMinutes(appointment.props.startTime);
    if (aptStartMinutes !== null) {
      const [y, m, d] = appointment.props.date.split('-').map(Number);
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

    // Entity validates transition internally
    try {
      appointment.cancel(reason, actor);
    } catch (error) {
      throw new AppError(
        `No se puede cancelar un turno en estado ${appointment.props.status}.`, 400
      );
    }

    const lastEntry = appointment.props.statusHistory[appointment.props.statusHistory.length - 1];

    const updateData: UpdateStatusData = {
      status: appointment.props.status,
      statusHistoryEntry: lastEntry,
    };

    if (appointment.props.cancelReason) {
      updateData.cancelReason = appointment.props.cancelReason;
    }
    if (appointment.props.cancelledAt) {
      updateData.cancelledAt = appointment.props.cancelledAt;
    }
    if (appointment.props.cancelledBy) {
      updateData.cancelledBy = appointment.props.cancelledBy;
    }

    await this.appointmentRepository.updateStatus(id, updateData);

    // RN17 — Email notification (async, non-blocking)
    const clientEmail = appointment.props.clientEmail;
    if (clientEmail) {
      this.emailService
        .sendMail({
          to: clientEmail,
          subject: 'Turno cancelado',
          html: `<p>Tu turno del ${appointment.props.date} a las ${appointment.props.startTime} fue cancelado.</p>
${reason ? `<p>Motivo: ${reason}</p>` : ''}`,
        })
        .catch((error) => {
          console.error('Error enviando email de cancelacion:', error);
        });
    }

    return { message: 'Turno cancelado exitosamente' };
  }
}
