import { CreateBarberUseCase } from '../../../../src/application/use-cases/barber/CreateBarberUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IPasswordHasher } from '../../../../src/application/ports/IPasswordHasher';
import { Barber, BarberProps, BarberSchedule } from '../../../../src/domain/entities/Barber';
import { IBarberRepository } from '../../../../src/domain/repositories/IBarberRepository';
import { IUserRepository } from '../../../../src/domain/repositories/IUserRepository';
import { User } from '../../../../src/domain/entities/User';

describe('CreateBarberUseCase', () => {
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
  let useCase: CreateBarberUseCase;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      createRegisteredClient: jest.fn(),
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

    useCase = new CreateBarberUseCase(
      userRepository,
      barberRepository,
      passwordHasher
    );
  });

  it('debe fallar si el email ya esta en uso', async () => {
    userRepository.findByEmail.mockResolvedValue(makeUser('user-1'));

    await expect(
      useCase.execute({
        email: 'used@example.com',
        password: 'Abcd1234',
        name: 'Juan',
        lastname: 'Perez',
        phone: '123456789',
        services: [],
        schedule: createSchedule(),
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el telefono ya esta en uso', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByPhone.mockResolvedValue(makeUser('user-1'));

    await expect(
      useCase.execute({
        email: 'new@example.com',
        password: 'Abcd1234',
        name: 'Juan',
        lastname: 'Perez',
        phone: '123456789',
        services: [],
        schedule: createSchedule(),
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe crear un barbero con slotDuration por defecto', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByPhone.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue('hashed');
    barberRepository.createBarber.mockResolvedValue(makeBarber());

    await useCase.execute({
      email: 'new@example.com',
      password: 'Abcd1234',
      name: 'Juan',
      lastname: 'Perez',
      phone: '123456789',
      services: ['corte'],
      schedule: createSchedule(),
    });

    const [createdBarber] = barberRepository.createBarber.mock.calls[0];

    expect(passwordHasher.hash).toHaveBeenCalledWith('Abcd1234');
    expect(createdBarber.slotDuration).toBe(30);
  });

  it('debe respetar slotDuration del payload', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByPhone.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue('hashed');
    barberRepository.createBarber.mockResolvedValue(makeBarber({ slotDuration: 45 }));

    await useCase.execute({
      email: 'new@example.com',
      password: 'Abcd1234',
      name: 'Juan',
      lastname: 'Perez',
      phone: '123456789',
      services: ['corte'],
      slotDuration: 45,
      schedule: createSchedule(),
    });

    const [createdBarber] = barberRepository.createBarber.mock.calls[0];

    expect(createdBarber.slotDuration).toBe(45);
  });
});
