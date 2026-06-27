import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoTempLockRepository } from '../../../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { IEmailService } from '../../ports/IEmailService';
import { AppError } from '../../../domain/errors/AppError';

export class DeleteBarberUseCase {
  constructor(
    private readonly barberRepository: MongoBarberRepository,
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly tempLockRepository: MongoTempLockRepository,
    private readonly emailService: IEmailService,
  ) {}

  async execute(barberId: string): Promise<{ message: string }> {
    const barber = await this.barberRepository.findBarberById(barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    await this.barberRepository.deactivateBarber(barberId);
    await this.tempLockRepository.deleteMany({ barberId });

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

        const clientEmail = apt.clientEmail;
        if (clientEmail) {
          this.emailService
            .sendMail({
              to: clientEmail,
              subject: 'Cancelación por baja de barbero',
              html: `<p>Tu turno del ${apt.date} a las ${apt.startTime} fue cancelado porque el barbero ${barber.name} ${barber.lastname} ya no está disponible.</p>`,
            })
            .catch((error: unknown) => {
              console.error('Error enviando email de baja:', error);
            });
        }
      }
    }

    return { message: 'Barbero desactivado exitosamente' };
  }
}


