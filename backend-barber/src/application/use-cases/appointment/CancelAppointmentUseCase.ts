import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { IEmailService } from '../../ports/IEmailService';
import { AppError } from '../../errors/AppError';
import { VALID_TRANSITIONS } from '../../../domain/types/appointment';

export class CancelAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly emailService: IEmailService
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

    await this.appointmentRepository.updateStatus(id, {
      status: 'Cancelado',
      cancelReason: reason,
      cancelledAt: new Date(),
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
