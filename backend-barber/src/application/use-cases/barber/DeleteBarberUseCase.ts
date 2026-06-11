import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { ITempLockRepository } from '../../../domain/repositories/ITempLockRepository';
import { IEmailService } from '../../ports/IEmailService';
import { AppError } from '../../errors/AppError';

export class DeleteBarberUseCase {
  constructor(
    private readonly barberRepository: IBarberRepository,
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly tempLockRepository: ITempLockRepository,
    private readonly emailService: IEmailService
  ) {}

  async execute(barberId: string): Promise<{ message: string }> {
    const barber = await this.barberRepository.findBarberById(barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    // RN12 — Soft-delete: desactivar barbero
    await this.barberRepository.deactivateBarber(barberId);

    // Eliminar TempLocks activos del barbero
    await this.tempLockRepository.deleteMany({ barberId });

    // Cancelar turnos futuros del barbero
    const futureAppointments = await this.appointmentRepository.findMany({
      barberId,
      dateFrom: new Date().toISOString().split('T')[0],
    });

    for (const apt of futureAppointments) {
      if (apt.status === 'Confirmado') {
        await this.appointmentRepository.updateStatus(apt.id, {
          status: 'Cancelado',
          cancelReason: 'Barbero dado de baja',
          cancelledAt: new Date(),
        });

        // Notificar por email (async)
        const clientEmail = apt.clientEmail;
        if (clientEmail) {
          this.emailService
            .sendMail({
              to: clientEmail,
              subject: 'Cancelación por baja de barbero',
              html: `<p>Tu turno del ${apt.date} a las ${apt.startTime} fue cancelado porque el barbero ${barber.name} ${barber.lastname} ya no está disponible.</p>`,
            })
            .catch((error) => {
              console.error('Error enviando email de baja:', error);
            });
        }
      }
    }

    return { message: 'Barbero desactivado exitosamente' };
  }
}
