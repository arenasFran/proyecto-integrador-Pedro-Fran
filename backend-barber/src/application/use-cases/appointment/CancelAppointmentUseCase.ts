import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { AppError } from '../../errors/AppError';

export class CancelAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository
  ) {}

  async execute(
    id: string,
    userId: string,
    userKind: string,
    reason?: string
  ): Promise<{ message: string }> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new AppError('Turno no encontrado.', 404);
    }

    if (appointment.status === 'Cancelado') {
      throw new AppError('El turno ya está cancelado.', 400);
    }

    if (appointment.status === 'Completado') {
      throw new AppError('No se puede cancelar un turno completado.', 400);
    }

    const isOwner = appointment.clientId === userId;
    const isAdminOrBarber = userKind === 'Admin' || userKind === 'Empleado';
    if (!isOwner && !isAdminOrBarber) {
      throw new AppError('No tenés permiso para cancelar este turno.', 403);
    }

    await this.appointmentRepository.updateStatus(id, {
      status: 'Cancelado',
      cancelReason: reason,
      cancelledAt: new Date(),
    });

    return { message: 'Turno cancelado exitosamente' };
  }
}
