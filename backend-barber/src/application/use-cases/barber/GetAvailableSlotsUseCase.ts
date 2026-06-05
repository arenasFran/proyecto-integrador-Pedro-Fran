import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { AppError } from '../../errors/AppError';
import { SlotService, SlotsResult } from '../../../domain/services/SlotService';

export { SlotsResult };

export class GetAvailableSlotsUseCase {
  constructor(
    private readonly barberRepository: IBarberRepository,
    private readonly slotService: SlotService
  ) {}

  async execute(barberId: string, date: string): Promise<SlotsResult> {
    if (!this.slotService.isValidDate(date)) {
      throw new AppError('Fecha inválida. Formato esperado: YYYY-MM-DD.', 400);
    }

    const barber = await this.barberRepository.findEmployeeById(barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    return this.slotService.execute(date, barber.schedule, barber.slotDuration);
  }
}
