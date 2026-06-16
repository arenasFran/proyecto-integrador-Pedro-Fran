import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { AppError } from '../../errors/AppError';
import { AppointmentResponseDTO } from '../../dto/appointment/AppointmentResponseDTO';

export type GetAppointmentsAnonymousDTO = {
  clientEmail?: string;
  clientPhone?: string;
  date?: string;
};

export class GetAppointmentsAnonymousUseCase {
  constructor(
    private readonly appointmentRepository: IAppointmentRepository
  ) {}

  async execute(dto: GetAppointmentsAnonymousDTO): Promise<{ appointments: AppointmentResponseDTO[] }> {
    if (!dto.clientEmail && !dto.clientPhone) {
      throw new AppError('Debe proporcionar email o teléfono.', 400);
    }

    const appointments = await this.appointmentRepository.findMany({
      clientEmail: dto.clientEmail,
      clientPhone: dto.clientPhone,
      date: dto.date,
    });

    return {
      appointments: appointments.map((a) => a.toPrimitives()),
    };
  }
}
