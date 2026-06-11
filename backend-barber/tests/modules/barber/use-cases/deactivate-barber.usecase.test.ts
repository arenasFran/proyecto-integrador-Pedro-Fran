import { DeactivateBarberUseCase } from '../../../../src/application/use-cases/barber/DeactivateBarberUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { Barber, BarberProps, BarberSchedule } from '../../../../src/domain/entities/Barber';
import { IBarberRepository } from '../../../../src/domain/repositories/IBarberRepository';

describe('DeactivateBarberUseCase', () => {
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
      maxAdvanceDays: 30,
      schedule: createSchedule(),
      passwordHash: 'hash',
    };
 
    return Barber.create({ ...base, ...overrides });
  };

  let barberRepository: jest.Mocked<IBarberRepository>;
  let useCase: DeactivateBarberUseCase;

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

    useCase = new DeactivateBarberUseCase(barberRepository);
  });

  it('debe desactivar un barbero existente', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber());

    const result = await useCase.execute('barber-1');

    expect(barberRepository.deactivateBarber).toHaveBeenCalledWith('barber-1');
    expect(result).toEqual({ message: 'Barbero desactivado' });
  });

  it('debe fallar si el barbero no existe', async () => {
    barberRepository.findBarberById.mockResolvedValue(null);

    await expect(useCase.execute('barber-1')).rejects.toBeInstanceOf(AppError);
  });
});
