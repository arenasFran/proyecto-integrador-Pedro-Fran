import { BarberSchedule } from '../../../domain/entities/Barber';
import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { AppError } from '../../errors/AppError';

export class GetBarberScheduleUseCase {
  constructor(private readonly barberRepository: IBarberRepository) {}

  async execute(barberId: string): Promise<BarberSchedule> {
    const barber = await this.barberRepository.findEmployeeById(barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    return barber.schedule;
  }
}
