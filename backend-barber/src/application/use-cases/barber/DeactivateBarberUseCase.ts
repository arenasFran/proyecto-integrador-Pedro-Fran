import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { AppError } from '../../errors/AppError';

export class DeactivateBarberUseCase {
  constructor(private readonly barberRepository: IBarberRepository) {}

  async execute(barberId: string): Promise<{ message: string }> {
    const barber = await this.barberRepository.findBarberById(barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    await this.barberRepository.deactivateBarber(barberId);

    return { message: 'Barbero desactivado' };
  }
}
