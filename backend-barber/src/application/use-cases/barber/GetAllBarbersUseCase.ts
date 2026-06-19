import { BarberResponseDTO, toBarberResponse } from '../../dto/barber/BarberResponseDTO';
import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { AuthKind } from '../../../domain/types/auth';

export class GetAllBarbersUseCase {
  constructor(private readonly barberRepository: IBarberRepository) {}

  async execute(actorKind?: AuthKind): Promise<BarberResponseDTO[]> {
    const barbers = await this.barberRepository.findAllBarbers();
    const dtos = barbers.map((barber) => toBarberResponse(barber));

    if (actorKind === 'Admin') return dtos;

    return dtos.filter((b) => b.isActive);
  }
}
