import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { AppError } from '../../../domain/errors/AppError';
import { RevenueTracker } from '../../services/RevenueTracker';

export class UpdatePaymentStatusUseCase {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly revenueTracker?: RevenueTracker
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

    if (appointment.paymentMethod === 'memberPass') {
      throw new AppError('Este turno ya fue cubierto por un cupón de membresía.', 400);
    }

    if (appointment.paymentStatus === 'Pagado') {
      return { message: 'El turno ya se encontraba pagado' };
    }

    appointment.pay();

    await this.appointmentRepository.updateStatus(id, {
      paymentStatus: 'Pagado',
    });

    await this.revenueTracker?.trackAppointment(
      appointment.id,
      appointment.servicePrice,
      new Date(),
      { barberId: appointment.barberId, serviceId: appointment.serviceId },
    );

    return { message: 'Pago registrado con éxito' };
  }
}
