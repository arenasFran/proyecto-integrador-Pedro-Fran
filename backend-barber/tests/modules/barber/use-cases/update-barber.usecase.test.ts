import { UpdateBarberUseCase } from '../../../../src/application/use-cases/barber/UpdateBarberUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IPasswordHasher } from '../../../../src/application/ports/IPasswordHasher';
import { Barber, BarberProps, BarberSchedule } from '../../../../src/domain/entities/Barber';
import { IBarberRepository } from '../../../../src/domain/repositories/IBarberRepository';
import { IUserRepository } from '../../../../src/domain/repositories/IUserRepository';
import { User } from '../../../../src/domain/entities/User';

describe('UpdateBarberUseCase', () => {
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

  const makeUser = (id: string) => {
    return User.create({
      id,
      email: 'used@example.com',
      name: 'Maria',
      lastname: 'Lopez',
      phone: '999999999',
      kind: 'Registrado',
      authProvider: 'local',
      passwordHash: 'hash',
    });
  };

  let userRepository: jest.Mocked<IUserRepository>;
  let barberRepository: jest.Mocked<IBarberRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;
  let useCase: UpdateBarberUseCase;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByPhone: jest.fn(),
      createRegisteredClient: jest.fn(),
      update: jest.fn(),
    updatePassword: jest.fn(),
      updateTwoFactor: jest.fn(),
      updateLastLogin: jest.fn(),
      updateUserSecurity: jest.fn(),
    };

    barberRepository = {
      findBarberById: jest.fn(),
      findAllBarbers: jest.fn(),
      createBarber: jest.fn(),
      updateBarber: jest.fn(),
      deactivateBarber: jest.fn(),
      deleteBarber: jest.fn(),
      updateSchedule: jest.fn(),
    };

    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    useCase = new UpdateBarberUseCase(userRepository, barberRepository, passwordHasher);
  });

  it('debe fallar si el barbero no existe', async () => {
    barberRepository.findBarberById.mockResolvedValue(null);

    await expect(useCase.execute('barber-1', { name: 'Pedro' })).rejects.toBeInstanceOf(
      AppError
    );
  });

  it('debe fallar si el email ya esta en uso por otro usuario', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber());
    userRepository.findByEmail.mockResolvedValue(makeUser('user-1'));

    await expect(useCase.execute('barber-1', { email: 'used@example.com' })).rejects.toBeInstanceOf(
      AppError
    );
  });

  it('debe actualizar slotDuration y devolver el barbero actualizado', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber());
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByPhone.mockResolvedValue(null);
    barberRepository.updateBarber.mockResolvedValue(makeBarber({ slotDuration: 45 }));

    const result = await useCase.execute('barber-1', { slotDuration: 45 });

    expect(barberRepository.updateBarber).toHaveBeenCalledWith(
      'barber-1',
      expect.objectContaining({ slotDuration: 45 })
    );
    expect(result.slotDuration).toBe(45);
  });

  it('debe fallar si no se puede actualizar el barbero', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber());
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByPhone.mockResolvedValue(null);
    barberRepository.updateBarber.mockResolvedValue(null);

    await expect(useCase.execute('barber-1', { name: 'Pedro' })).rejects.toBeInstanceOf(
      AppError
    );
  });
});
