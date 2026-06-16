import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { AppError } from '../../errors/AppError';
import { AppointmentResponseDTO } from '../../dto/appointment/AppointmentResponseDTO';

export class GetAppointmentByIdUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository
  ) {}

  async execute(id: string, userId: string, userKind: string): Promise<{ appointment: AppointmentResponseDTO }> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new AppError('Turno no encontrado.', 404);
    }

    const isOwner = appointment.clientId === userId;
    const isAdminOrBarber = userKind === 'Admin' || userKind === 'Empleado';
    if (!isOwner && !isAdminOrBarber) {
      throw new AppError('No tenés permiso para ver este turno.', 403);
    }

    const primitives = appointment.toPrimitives();
    return {
      appointment: {
        id: primitives.id,
        barberId: primitives.barberId,
        clientId: primitives.clientId,
        clientName: primitives.clientName,
        clientLastname: primitives.clientLastname,
        clientPhone: primitives.clientPhone,
        clientEmail: primitives.clientEmail,
        serviceId: primitives.serviceId,
        serviceName: primitives.serviceName,
        servicePrice: primitives.servicePrice,
        serviceDuration: primitives.serviceDuration,
        date: primitives.date,
        startTime: primitives.startTime,
        endTime: primitives.endTime,
        status: primitives.status,
        paymentStatus: primitives.paymentStatus,
        paymentMethod: primitives.paymentMethod,
        cancelReason: primitives.cancelReason,
        cancelledAt: primitives.cancelledAt,
        statusHistory: primitives.statusHistory,
        createdAt: primitives.createdAt,
        updatedAt: primitives.updatedAt,
      },
    };
  }
}
