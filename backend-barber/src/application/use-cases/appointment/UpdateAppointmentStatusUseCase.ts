import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { AppointmentStatus, VALID_TRANSITIONS, StatusHistoryEntry } from '../../../domain/types/appointment';
import { AppError } from '../../errors/AppError';
import { toMinutes, getNowInTimezone } from '../../../domain/utils/time';

export type UpdateAppointmentStatusDTO = {
  status: AppointmentStatus;
  cancelReason?: string;
};

export class UpdateAppointmentStatusUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository,
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

    // RN09 — State machine validation
    const allowedFrom = VALID_TRANSITIONS[appointment.status];
    if (!allowedFrom || !allowedFrom.includes(dto.status)) {
      throw new AppError(
        `No se puede cambiar de ${appointment.status} a ${dto.status}.`, 400
      );
    }

    // Task 2 — Límite mínimo de anticipación (solo para cancelación)
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

    // Task 5 — NoShow solo si el turno ya pasó
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

    const actorMap: Record<string, string> = { Admin: 'admin', Empleado: 'empleado' };
    const actor = (userKind && actorMap[userKind]) || 'system';

    const statusHistoryEntry: StatusHistoryEntry = {
      status: dto.status,
      timestamp: new Date(),
      actor,
    };

    if (dto.status === 'Cancelado') {
      await this.appointmentRepository.updateStatus(id, {
        status: dto.status,
        cancelReason: dto.cancelReason,
        cancelledAt: new Date(),
        cancelledBy: actor,
        statusHistoryEntry,
      });
    } else {
      await this.appointmentRepository.updateStatus(id, {
        status: dto.status,
        statusHistoryEntry,
      });
    }

    return { message: `Estado actualizado a ${dto.status}` };
  }
}
