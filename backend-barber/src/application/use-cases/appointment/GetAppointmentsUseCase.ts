import { Appointment } from '../../../domain/entities/Appointment';
import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';

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

  async execute(dto: GetAppointmentsDTO): Promise<{ appointments: Appointment[] }> {
    const appointments = await this.appointmentRepository.findMany({
      barberId: dto.barberId,
      clientId: dto.clientId,
      date: dto.date,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
    });

    return { appointments };
  }
}
