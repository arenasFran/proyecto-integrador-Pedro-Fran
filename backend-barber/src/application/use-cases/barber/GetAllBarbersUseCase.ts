import { BarberResponseDTO, toBarberResponse } from '../../dto/barber/BarberResponseDTO';
import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';

export class GetAllBarbersUseCase {
  constructor(private readonly barberRepository: IBarberRepository) {}

  async execute(): Promise<BarberResponseDTO[]> {
    const barbers = await this.barberRepository.findAllBarbers();
    return barbers.map((barber) => toBarberResponse(barber));
  }
}
