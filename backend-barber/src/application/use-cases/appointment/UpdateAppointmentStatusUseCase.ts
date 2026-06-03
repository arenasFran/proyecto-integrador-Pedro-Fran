import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { AppointmentStatus } from '../../../domain/types/appointment';
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
