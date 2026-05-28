import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { AppError } from '../../errors/AppError';

export class DeactivateBarberUseCase {
  constructor(private readonly barberRepository: IBarberRepository) {}

  async execute(barberId: string): Promise<{ message: string }> {
    const barber = await this.barberRepository.findEmployeeById(barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    await this.barberRepository.deactivateEmployee(barberId);

    return { message: 'Barbero desactivado' };
  }
}
