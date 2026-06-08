import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { AppointmentStatus, VALID_TRANSITIONS } from '../../../domain/types/appointment';
import { AppError } from '../../errors/AppError';

export type UpdateAppointmentStatusDTO = {
  status: AppointmentStatus;
  cancelReason?: string;
};

export class UpdateAppointmentStatusUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository
  ) {}

  async execute(
    id: string,
    dto: UpdateAppointmentStatusDTO
  ): Promise<{ message: string }> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new AppError('Turno no encontrado.', 404);
    }

    // RN09 — State machine validation
    const allowedFrom = VALID_TRANSITIONS[appointment.status];
    if (!allowedFrom || !allowedFrom.includes(dto.status)) {
      throw new AppError(
        `No se puede cambiar de ${appointment.status} a ${dto.status}.`, 400
      );
    }

    if (dto.status === 'Cancelado') {
      await this.appointmentRepository.updateStatus(id, {
        status: dto.status,
        cancelReason: dto.cancelReason,
        cancelledAt: new Date(),
      });
    } else {
      await this.appointmentRepository.updateStatus(id, {
        status: dto.status,
      });
    }

    return { message: `Estado actualizado a ${dto.status}` };
  }
}
