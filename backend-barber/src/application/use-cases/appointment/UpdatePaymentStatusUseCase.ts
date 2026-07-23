import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { AppError } from '../../../domain/errors/AppError';

export class UpdatePaymentStatusUseCase {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository
  ) {}

  async execute(
    id: string,
    userId: string,
    userKind: string
  ): Promise<{ message: string }> {
    if (userKind !== 'Admin' && userKind !== 'Empleado') {
      throw new AppError('No tenés permiso para actualizar el pago.', 403);
    }

    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new AppError('Turno no encontrado.', 404);
    }

    if (appointment.paymentStatus === 'Pagado') {
      return { message: 'El turno ya se encontraba pagado' };
    }

    appointment.pay();

    await this.appointmentRepository.updateStatus(id, {
      paymentStatus: 'Pagado',
    });

    return { message: 'Pago registrado con éxito' };
  }
}
