import { IAppointmentRepository } from '../../../domain/repositories/IAppointmentRepository';
import { IBarberRepository } from '../../../domain/repositories/IBarberRepository';
import { ITempLockRepository } from '../../../domain/repositories/ITempLockRepository';
import { AppError } from '../../errors/AppError';
import { OccupiedSlot, SlotService, SlotsResult } from '../../../domain/services/SlotService';
import { toMinutes, toTimeString } from '../../../domain/utils/time';

export { SlotsResult };

export class GetAvailableSlotsUseCase {
  constructor(
    private readonly barberRepository: IBarberRepository,
    private readonly slotService: SlotService,
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly tempLockRepository: ITempLockRepository
  ) {}

  async execute(barberId: string, date: string): Promise<SlotsResult> {
    if (!this.slotService.isValidDate(date)) {
      throw new AppError('Fecha inválida. Formato esperado: YYYY-MM-DD.', 400);
    }

    const barber = await this.barberRepository.findBarberById(barberId);
    if (!barber) {
      throw new AppError('Barbero no encontrado.', 404);
    }
    if (!barber.isActive) {
      throw new AppError('El barbero no está disponible.', 400);
    }

    const appointments = await this.appointmentRepository.findByBarberAndDate(barberId, date);
    const tempLocks = await this.tempLockRepository.findByBarberAndDate(barberId, date);

    const occupiedSlots: OccupiedSlot[] = [
      ...appointments.map((apt) => ({
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status,
      })),
      ...tempLocks.map((tl) => {
        const startMin = toMinutes(tl.startTime);
        const endMin = startMin !== null ? startMin + barber.slotDuration : 0;
        return {
          startTime: tl.startTime,
          endTime: endMin !== 0 ? toTimeString(endMin) : tl.startTime,
          status: 'TempLock' as const,
        };
      }),
    ];

    return this.slotService.execute(date, barber.schedule, barber.slotDuration, occupiedSlots);
  }
}
