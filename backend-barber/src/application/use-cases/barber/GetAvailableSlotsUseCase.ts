import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { AppError } from '../../errors/AppError';
import { OccupiedSlot, SlotService, SlotsResult } from '../../../domain/services/SlotService';

export { SlotsResult };

export class GetAvailableSlotsUseCase {
  constructor(
    private readonly barberRepository: IBarberRepository,
    private readonly slotService: SlotService,
    private readonly appointmentRepository: IAppointmentRepository
  ) {}

  async execute(barberId: string, date: string): Promise<SlotsResult> {
    if (!this.slotService.isValidDate(date)) {
      throw new AppError('Fecha inválida. Formato esperado: YYYY-MM-DD.', 400);
    }

    const barber = await this.barberRepository.findEmployeeById(barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }

    const appointments = await this.appointmentRepository.findByBarberAndDate(barberId, date);
    const occupiedSlots: OccupiedSlot[] = appointments.map((apt) => ({
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
    }));

    return this.slotService.execute(date, barber.schedule, barber.slotDuration, occupiedSlots);
  }
}
