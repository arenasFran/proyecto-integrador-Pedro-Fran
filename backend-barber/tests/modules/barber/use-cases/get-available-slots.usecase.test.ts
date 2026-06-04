import { GetAvailableSlotsUseCase } from '../../../../src/application/use-cases/barber/GetAvailableSlotsUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { Barber, BarberProps, BarberSchedule } from '../../../../src/domain/entities/Barber';
import { IBarberRepository } from '../../../../src/domain/repositories/IBarberRepository';
import { SlotService, SlotsResult } from '../../../../src/domain/services/SlotService';

describe('GetAvailableSlotsUseCase', () => {
  const createScheduleDay = (overrides?: Partial<BarberSchedule['monday']>) => ({
    startTime: '09:00',
    endTime: '11:00',
    breaks: [],
    ...overrides,
  });

  const createSchedule = (dayOverrides?: Partial<BarberSchedule['monday']>): BarberSchedule => ({
    monday: createScheduleDay(dayOverrides),
    tuesday: createScheduleDay(dayOverrides),
    wednesday: createScheduleDay(dayOverrides),
    thursday: createScheduleDay(dayOverrides),
    friday: createScheduleDay(dayOverrides),
    saturday: createScheduleDay(dayOverrides),
    sunday: createScheduleDay(dayOverrides),
  });

  const makeBarber = (overrides?: Partial<BarberProps>) => {
    const base: BarberProps = {
      id: 'barber-1',
      email: 'barber@example.com',
      name: 'Juan',
      lastname: 'Perez',
      phone: '123456789',
      kind: 'Empleado',
      specialties: [],
      isActive: true,
      slotDuration: 30,
      schedule: createSchedule(),
      passwordHash: 'hash',
    };

    return Barber.create({ ...base, ...overrides });
  };

  let barberRepository: jest.Mocked<IBarberRepository>;
  let slotService: jest.Mocked<SlotService>;

  beforeEach(() => {
    barberRepository = {
      findEmployeeById: jest.fn(),
      findAllEmployees: jest.fn(),
      createEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      deactivateEmployee: jest.fn(),
      deleteEmployee: jest.fn(),
      updateSchedule: jest.fn(),
    };

    slotService = {
      isValidDate: jest.fn(),
      execute: jest.fn(),
    } as unknown as jest.Mocked<SlotService>;
  });

  it('debe fallar con fecha invalida', async () => {
    slotService.isValidDate.mockReturnValue(false);

    const useCase = new GetAvailableSlotsUseCase(barberRepository, slotService);

    await expect(useCase.execute('barber-1', '2024/01/01')).rejects.toBeInstanceOf(AppError);
    expect(slotService.isValidDate).toHaveBeenCalledWith('2024/01/01');
  });

  it('debe devolver slots segun el horario y los breaks', async () => {
    const schedule = createSchedule({
      breaks: [{ startTime: '10:00', endTime: '10:30' }],
    });
    const expectedResult: SlotsResult = {
      date: '2099-01-01',
      slots: ['09:00', '09:30', '10:30'],
    };

    slotService.isValidDate.mockReturnValue(true);
    barberRepository.findEmployeeById.mockResolvedValue(makeBarber({ schedule }));
    slotService.execute.mockReturnValue(expectedResult);

    const useCase = new GetAvailableSlotsUseCase(barberRepository, slotService);
    const result = await useCase.execute('barber-1', '2099-01-01');

    expect(result).toEqual(expectedResult);
    expect(slotService.execute).toHaveBeenCalledWith('2099-01-01', schedule, 30);
  });

  it('debe respetar la duracion del slot del barbero', async () => {
    const schedule = createSchedule();
    const expectedResult: SlotsResult = {
      date: '2099-01-01',
      slots: ['09:00', '10:00'],
    };

    slotService.isValidDate.mockReturnValue(true);
    barberRepository.findEmployeeById.mockResolvedValue(makeBarber({ slotDuration: 60 }));
    slotService.execute.mockReturnValue(expectedResult);

    const useCase = new GetAvailableSlotsUseCase(barberRepository, slotService);
    const result = await useCase.execute('barber-1', '2099-01-01');

    expect(result).toEqual(expectedResult);
    expect(slotService.execute).toHaveBeenCalledWith('2099-01-01', schedule, 60);
  });
});
