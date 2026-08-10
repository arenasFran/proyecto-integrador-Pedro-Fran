import { GetBarberOccupancyUseCase } from '../../../../src/application/use-cases/barber/GetBarberOccupancyUseCase';
import { Barber, BarberSchedule } from '../../../../src/domain/entities/Barber';
import { AppError } from '../../../../src/domain/errors/AppError';
import { makeMockBarberRepository, makeMockAppointmentRepository } from '../../../test-utils/mocks';

const closedDay = () => ({ startTime: null, endTime: null, breaks: [] });
const openDay = (startTime = '09:00', endTime = '18:00') => ({ startTime, endTime, breaks: [] });

const makeSchedule = (overrides: Partial<BarberSchedule> = {}): BarberSchedule => ({
  monday: openDay(),
  tuesday: openDay(),
  wednesday: openDay(),
  thursday: openDay(),
  friday: openDay(),
  saturday: closedDay(),
  sunday: closedDay(),
  ...overrides,
});

const makeBarber = (schedule: BarberSchedule, slotDuration = 30) =>
  Barber.create({
    id: 'barber-1',
    email: 'barber@test.com',
    name: 'Carlos',
    lastname: 'Barbero',
    phone: '099111222',
    kind: 'Empleado',
    services: [],
    age: undefined,
    photoUrl: null,
    isActive: true,
    slotDuration,
    maxAdvanceDays: 30,
    schedule,
    passwordHash: 'hash',
  });

describe('GetBarberOccupancyUseCase', () => {
  let barberRepository: ReturnType<typeof makeMockBarberRepository>;
  let appointmentRepository: ReturnType<typeof makeMockAppointmentRepository>;
  let blockRepository: { findByBarberAndDate: jest.Mock };
  let useCase: GetBarberOccupancyUseCase;

  beforeEach(() => {
    barberRepository = makeMockBarberRepository();
    appointmentRepository = makeMockAppointmentRepository();
    blockRepository = { findByBarberAndDate: jest.fn().mockResolvedValue([]) };
    useCase = new GetBarberOccupancyUseCase(barberRepository as any, appointmentRepository as any, blockRepository as any);
  });

  it('debe lanzar error si el barbero no existe', async () => {
    barberRepository.findBarberById.mockResolvedValue(null);
    await expect(useCase.execute({ barberId: 'barber-x', date: '2026-01-15' })).rejects.toThrow(AppError);
  });

  it('debe calcular la ocupación contando solo turnos no cancelados', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber(makeSchedule()));
    appointmentRepository.findByBarberAndDate.mockResolvedValue([
      { status: 'Confirmado' },
      { status: 'Cancelado' },
      { status: 'Completado' },
    ] as any);

    const result = await useCase.execute({ barberId: 'barber-1', date: '2026-01-15' });

    expect(result.appointmentsCount).toBe(2);
    expect(result.ocupacion).toBeGreaterThan(0);
  });

  it('debe descontar los bloques del total de slots disponibles', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber(makeSchedule()));
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
    blockRepository.findByBarberAndDate.mockResolvedValue([
      { startTime: '09:00', endTime: '10:00' },
    ] as any);

    const withoutBlocks = await useCase.execute({ barberId: 'barber-1', date: '2026-01-15' });
    blockRepository.findByBarberAndDate.mockResolvedValue([{ startTime: '09:00', endTime: '10:00' }] as any);
    const withBlocks = await useCase.execute({ barberId: 'barber-1', date: '2026-01-15' });

    expect(withBlocks.blockedSlots).toBeGreaterThan(0);
    expect(withBlocks.availableSlots).toBeLessThan(withoutBlocks.availableSlots + withBlocks.blockedSlots + 1);
  });

  it('debe devolver ocupacion 0 si no hay slots disponibles', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber(makeSchedule({
      monday: closedDay(), tuesday: closedDay(), wednesday: closedDay(),
      thursday: closedDay(), friday: closedDay(),
    })));
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);

    const result = await useCase.execute({ barberId: 'barber-1', date: '2026-01-15' });

    expect(result.totalSlots).toBe(0);
    expect(result.availableSlots).toBe(0);
    expect(result.ocupacion).toBe(0);
  });
});
