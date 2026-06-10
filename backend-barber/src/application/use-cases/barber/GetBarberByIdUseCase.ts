import { BarberResponseDTO, toBarberResponse } from '../../dto/barber/BarberResponseDTO';
import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { AppError } from '../../errors/AppError';

export class GetBarberByIdUseCase {
  constructor(private readonly barberRepository: IBarberRepository) {}

  async execute(barberId: string): Promise<BarberResponseDTO> {
    const barber = await this.barberRepository.findBarberById(barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    return toBarberResponse(barber);
  }
}
