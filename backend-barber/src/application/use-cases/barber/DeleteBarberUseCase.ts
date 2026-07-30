import mongoose from 'mongoose';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberBlockRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberBlockRepository';
import { MongoTempLockRepository } from '../../../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { IEmailService } from '../../ports/IEmailService';
import { AppError } from '../../../domain/errors/AppError';
import { sendMailWithRetry } from '../shared/sendMailWithRetry';

export class DeleteBarberUseCase {
  constructor(
    private readonly barberRepository: MongoBarberRepository,
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly tempLockRepository: MongoTempLockRepository,
    private readonly blockRepository: MongoBarberBlockRepository,
    private readonly emailService: IEmailService,
    private readonly membershipRepository: MongoMembershipRepository,
  ) {}

  async execute(barberId: string): Promise<{ message: string }> {
    const barber = await this.barberRepository.findBarberById(barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    await this.barberRepository.deactivateBarber(barberId);
    await this.tempLockRepository.deleteMany({ barberId });
    await this.blockRepository.deleteByBarberId(barberId);

    const { data: futureAppointments } = await this.appointmentRepository.findMany({
      barberId,
      dateFrom: new Date().toISOString().split('T')[0],
    });

    for (const apt of futureAppointments) {
      if (apt.status === 'Confirmado') {
        const session = await mongoose.startSession();
        try {
          session.startTransaction();

          await this.appointmentRepository.updateStatus(apt.id, {
            status: 'Cancelado',
            cancelReason: 'Barbero dado de baja',
            cancelledAt: new Date(),
          }, session);

          const current = await this.appointmentRepository.findById(apt.id, session);
          if (current && current.paymentMethod === 'memberPass' && current.couponRedeemed && !current.couponRestoredAt && current.membershipId) {
            const restored = await this.membershipRepository.atomicRestoreCoupon(current.membershipId, session);
            if (restored) {
              current.markCouponRestored();
            }
          }

          await session.commitTransaction();
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }

        const clientEmail = apt.clientEmail;
        if (clientEmail) {
          void sendMailWithRetry(
            this.emailService,
            {
              to: clientEmail,
              subject: 'Cancelación por baja de barbero',
              html: `<p>Tu turno del ${apt.date} a las ${apt.startTime} fue cancelado porque el barbero ${barber.name} ${barber.lastname} ya no está disponible.</p>`,
            },
            'Error enviando email de baja'
          );
        }
      }
    }

    return { message: 'Barbero desactivado exitosamente' };
  }
}


