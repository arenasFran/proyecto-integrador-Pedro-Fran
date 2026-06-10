import { GetBarberScheduleUseCase } from '../../../../src/application/use-cases/barber/GetBarberScheduleUseCase';
import { UpdateBarberScheduleUseCase } from '../../../../src/application/use-cases/barber/UpdateBarberScheduleUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { Barber, BarberProps, BarberSchedule } from '../../../../src/domain/entities/Barber';
import { IBarberRepository } from '../../../../src/domain/repositories/IBarberRepository';

describe('Barber schedule use cases', () => {
  const createScheduleDay = () => ({
    startTime: '09:00',
    endTime: '18:00',
    breaks: [],
  });

  const createSchedule = (): BarberSchedule => ({
    monday: createScheduleDay(),
    tuesday: createScheduleDay(),
    wednesday: createScheduleDay(),
    thursday: createScheduleDay(),
    friday: createScheduleDay(),
    saturday: createScheduleDay(),
    sunday: createScheduleDay(),
  });

  const makeBarber = (overrides?: Partial<BarberProps>) => {
    const base: BarberProps = {
      id: 'barber-1',
      email: 'barber@example.com',
      name: 'Juan',
      lastname: 'Perez',
      phone: '123456789',
      kind: 'Empleado',
      services: [],
      isActive: true,
      slotDuration: 30,
      schedule: createSchedule(),
      passwordHash: 'hash',
    };

    return Barber.create({ ...base, ...overrides });
  };

  let barberRepository: jest.Mocked<IBarberRepository>;

  beforeEach(() => {
    barberRepository = {
      findBarberById: jest.fn(),
      findAllBarbers: jest.fn(),
      createBarber: jest.fn(),
      updateBarber: jest.fn(),
      deactivateBarber: jest.fn(),
      deleteBarber: jest.fn(),
      updateSchedule: jest.fn(),
    };
  });

  it('debe obtener el horario del barbero', async () => {
    const barber = makeBarber();
    barberRepository.findBarberById.mockResolvedValue(barber);

    const useCase = new GetBarberScheduleUseCase(barberRepository);
    const schedule = await useCase.execute('barber-1');

    expect(schedule).toEqual(barber.schedule);
  });

  it('debe fallar si el barbero no existe al obtener horario', async () => {
    barberRepository.findBarberById.mockResolvedValue(null);

    const useCase = new GetBarberScheduleUseCase(barberRepository);

    await expect(useCase.execute('barber-1')).rejects.toBeInstanceOf(AppError);
  });

  it('debe actualizar el horario del barbero', async () => {
    const schedule = createSchedule();
    barberRepository.updateSchedule.mockResolvedValue(makeBarber({ schedule }));

    const useCase = new UpdateBarberScheduleUseCase(barberRepository);
    const result = await useCase.execute('barber-1', schedule);

    expect(barberRepository.updateSchedule).toHaveBeenCalledWith('barber-1', schedule);
    expect(result).toEqual(schedule);
  });

  it('debe fallar si el barbero no existe al actualizar horario', async () => {
    barberRepository.updateSchedule.mockResolvedValue(null);

    const useCase = new UpdateBarberScheduleUseCase(barberRepository);

    await expect(useCase.execute('barber-1', createSchedule())).rejects.toBeInstanceOf(
      AppError
    );
  });
});
