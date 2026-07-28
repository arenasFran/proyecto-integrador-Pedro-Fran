import { AppError } from '../../../domain/errors/AppError';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberBlockRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberBlockRepository';

export interface GetBarberOccupancyDTO {
  barberId: string;
  date: string;
}

export interface GetBarberOccupancyResult {
  barberId: string;
  date: string;
  totalSlots: number;
  blockedSlots: number;
  availableSlots: number;
  appointmentsCount: number;
  ocupacion: number;
}

export class GetBarberOccupancyUseCase {
  constructor(
    private readonly barberRepository: MongoBarberRepository,
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly blockRepository: MongoBarberBlockRepository
  ) {}

  async execute(dto: GetBarberOccupancyDTO): Promise<GetBarberOccupancyResult> {
    const barber = await this.barberRepository.findBarberById(dto.barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    const appointments = await this.appointmentRepository.findByBarberAndDate(dto.barberId, dto.date);
    const activeAppointments = appointments.filter((a) => a.status !== 'Cancelado');

    const totalSlots = barber.schedule
      ? Object.values(barber.schedule).reduce((sum, day) => {
          if (!day || !day.startTime || !day.endTime) return sum;
          const [sh, sm] = day.startTime.split(':').map(Number);
          const [eh, em] = day.endTime.split(':').map(Number);
          return sum + Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) / barber.slotDuration);
        }, 0)
      : 0;

    const blocks = await this.blockRepository.findByBarberAndDate(dto.barberId, dto.date);
    const blockedSlots = blocks.reduce((sum, b) => {
      const [sh, sm] = b.startTime.split(':').map(Number);
      const [eh, em] = b.endTime.split(':').map(Number);
      return sum + Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) / barber.slotDuration);
    }, 0);

    const availableSlots = Math.max(0, totalSlots - blockedSlots);
    const ocupacion = availableSlots > 0
      ? Math.round((activeAppointments.length / availableSlots) * 100)
      : 0;

    return {
      barberId: dto.barberId,
      date: dto.date,
      totalSlots,
      blockedSlots,
      availableSlots,
      appointmentsCount: activeAppointments.length,
      ocupacion,
    };
  }
}
