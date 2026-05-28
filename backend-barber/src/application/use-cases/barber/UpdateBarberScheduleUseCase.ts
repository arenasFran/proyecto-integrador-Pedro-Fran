import { BarberSchedule } from '../../../domain/entities/Barber';
import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { AppError } from '../../errors/AppError';

export class UpdateBarberScheduleUseCase {
  constructor(private readonly barberRepository: IBarberRepository) {}

  async execute(barberId: string, schedule: BarberSchedule): Promise<BarberSchedule> {
    const updated = await this.barberRepository.updateSchedule(barberId, schedule);
    if (!updated) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    return updated.schedule;
  }
}
