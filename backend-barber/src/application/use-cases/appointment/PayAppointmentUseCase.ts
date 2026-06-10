import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { PaymentMethod } from '../../../domain/types/appointment';
import { AppError } from '../../errors/AppError';

export type PayAppointmentDTO = {
  paymentMethod?: PaymentMethod;
};

export class PayAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository
  ) {}

  async execute(
    id: string,
    dto: PayAppointmentDTO,
    userId?: string,
    userKind?: string
  ): Promise<{ message: string }> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new AppError('Turno no encontrado.', 404);
    }

    if (appointment.paymentStatus === 'Pagado') {
      return { message: 'El turno ya se encontraba pagado' };
    }

    if (appointment.status === 'Cancelado' || appointment.status === 'NoShow') {
      throw new AppError(`No se puede pagar un turno en estado ${appointment.status}.`, 400);
    }

    const actorMap: Record<string, string> = { Admin: 'admin', Empleado: 'empleado' };
    const actor = (userKind && actorMap[userKind]) || 'system';

    await this.appointmentRepository.updateStatus(id, {
      status: appointment.status,
      paymentStatus: 'Pagado',
    });

    await this.appointmentRepository.update(id, {
      paymentMethod: dto.paymentMethod,
    });

    return { message: 'Pago registrado exitosamente' };
  }
}
