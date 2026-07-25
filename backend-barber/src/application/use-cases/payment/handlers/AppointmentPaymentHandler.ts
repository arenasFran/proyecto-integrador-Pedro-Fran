import { Payment } from '../../../../domain/entities/Payment';
import { MongoAppointmentRepository } from '../../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { RevenueTracker } from '../../../services/RevenueTracker';

export class AppointmentPaymentHandler {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly revenueTracker?: RevenueTracker,
  ) {}

  async handleApproved(payment: Payment): Promise<void> {
    const appointment = await this.appointmentRepository.findById(payment.referenceId);
    if (appointment && appointment.paymentStatus !== 'Pagado') {
      appointment.pay();
      await this.appointmentRepository.updateStatus(payment.referenceId, {
        paymentStatus: 'Pagado',
        statusHistoryEntry: { status: appointment.status, timestamp: new Date(), actor: 'system' },
      });
      await this.revenueTracker?.trackAppointment(
        appointment.id,
        appointment.servicePrice,
        new Date(),
        { paymentId: payment.id, barberId: appointment.barberId, serviceId: appointment.serviceId },
      );
    }
  }

  async handleRejected(payment: Payment): Promise<void> {
    const appointment = await this.appointmentRepository.findById(payment.referenceId);
    if (appointment && appointment.status !== 'Cancelado') {
      await this.appointmentRepository.updateStatus(payment.referenceId, {
        status: 'Cancelado',
        paymentStatus: 'Cancelado',
        cancelReason: 'Pago rechazado',
        cancelledAt: new Date(),
        cancelledBy: 'system',
        statusHistoryEntry: { status: 'Cancelado', timestamp: new Date(), actor: 'system' },
      });
    }
  }

  async handleCancelled(payment: Payment): Promise<void> {
    const appointment = await this.appointmentRepository.findById(payment.referenceId);
    if (appointment && appointment.status !== 'Cancelado') {
      await this.appointmentRepository.updateStatus(payment.referenceId, {
        status: 'Cancelado',
        paymentStatus: 'Cancelado',
        cancelReason: 'Pago cancelado',
        cancelledAt: new Date(),
        cancelledBy: 'system',
        statusHistoryEntry: { status: 'Cancelado', timestamp: new Date(), actor: 'system' },
      });
    }
  }

  async handleRefunded(payment: Payment): Promise<void> {
    const appointment = await this.appointmentRepository.findById(payment.referenceId);
    if (appointment && appointment.status !== 'Cancelado') {
      await this.appointmentRepository.updateStatus(payment.referenceId, {
        status: 'Cancelado',
        paymentStatus: 'Cancelado',
        cancelReason: 'Pago reembolsado',
        cancelledAt: new Date(),
        cancelledBy: 'system',
        statusHistoryEntry: { status: 'Cancelado', timestamp: new Date(), actor: 'system' },
      });
    }
  }

  async handleChargeBack(payment: Payment): Promise<void> {
    const appointment = await this.appointmentRepository.findById(payment.referenceId);
    if (appointment && appointment.status !== 'Cancelado') {
      await this.appointmentRepository.updateStatus(payment.referenceId, {
        status: 'Cancelado',
        paymentStatus: 'Cancelado',
        cancelReason: 'Contracargo',
        cancelledAt: new Date(),
        cancelledBy: 'system',
        statusHistoryEntry: { status: 'Cancelado', timestamp: new Date(), actor: 'system' },
      });
    }
  }

  async handleInMediation(_payment: Payment): Promise<void> {
    // No se modifica el appointment en mediación
  }
}
