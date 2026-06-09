import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { AppointmentResponseDTO } from '../../dto/appointment/AppointmentResponseDTO';

export type GetAppointmentsDTO = {
  barberId?: string;
  clientId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
};

export class GetAppointmentsUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository
  ) {}

  async execute(dto: GetAppointmentsDTO): Promise<{ appointments: AppointmentResponseDTO[] }> {
    const appointments = await this.appointmentRepository.findMany({
      barberId: dto.barberId,
      clientId: dto.clientId,
      date: dto.date,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
    });

    return {
      appointments: appointments.map((a) => {
        const p = a.toPrimitives();
        return {
          id: p.id,
          barberId: p.barberId,
          clientId: p.clientId,
          clientName: p.clientName,
          clientLastname: p.clientLastname,
          clientPhone: p.clientPhone,
          clientEmail: p.clientEmail,
          serviceId: p.serviceId,
          serviceName: p.serviceName,
          servicePrice: p.servicePrice,
          serviceDuration: p.serviceDuration,
          date: p.date,
          startTime: p.startTime,
          endTime: p.endTime,
          status: p.status,
          cancelReason: p.cancelReason,
          cancelledAt: p.cancelledAt,
          statusHistory: p.statusHistory,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      }),
    };
  }
}
