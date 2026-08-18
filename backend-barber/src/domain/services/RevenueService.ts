import { Appointment } from '../entities/Appointment';
import { appointmentCountsAsRevenue } from '../types/appointment';

export class RevenueService {
  isAppointmentRevenue(appointment: Appointment): boolean {
    return appointmentCountsAsRevenue(
      appointment.status,
      appointment.paymentStatus,
      appointment.paymentMethod
    );
  }

  isOrderRevenue(status: string): boolean {
    return status === 'paid' || status === 'delivered';
  }

  isMembershipRevenue(status: string): boolean {
    return status === 'active' || status === 'expired';
  }
}
