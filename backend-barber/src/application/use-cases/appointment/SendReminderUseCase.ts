import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { IEmailService } from '../../ports/IEmailService';
import { AppError } from '../../../domain/errors/AppError';

export class SendReminderUseCase {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly barberRepository: MongoBarberRepository,
    private readonly emailService: IEmailService
  ) {}

  async execute(
    id: string,
    userId: string,
    userKind: string
  ): Promise<{ message: string }> {
    if (userKind !== 'Admin' && userKind !== 'Empleado') {
      throw new AppError('No tenés permiso para enviar recordatorios.', 403);
    }

    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new AppError('Turno no encontrado.', 404);
    }

    const email = appointment.clientEmail;
    if (!email) {
      throw new AppError('El turno no tiene un email de contacto.', 400);
    }

    const barber = await this.barberRepository.findBarberById(appointment.barberId);
    const barberName = barber ? `${barber.name} ${barber.lastname}` : 'Barbero asignado';

    await this.emailService.sendMail({
      to: email,
      subject: 'Recordatorio de turno',
      html: `<p>Te recordamos que tenés un turno agendado:</p>
<p><strong>Barbero:</strong> ${barberName}</p>
<p><strong>Servicio:</strong> ${appointment.serviceName}</p>
<p><strong>Fecha:</strong> ${appointment.date}</p>
<p><strong>Horario:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
<p><strong>Precio:</strong> $${appointment.servicePrice}</p>
${appointment.paymentStatus === 'Pendiente' ? '<p>Recordá que el pago se realiza en el local.</p>' : '<p>El turno ya se encuentra pagado.</p>'}`,
    });

    return { message: 'Recordatorio enviado con éxito' };
  }
}
