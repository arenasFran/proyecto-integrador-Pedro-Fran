import mongoose from 'mongoose';
import { CreateAppointmentUseCase } from '../../../../src/application/use-cases/appointment/CreateAppointmentUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { Membership } from '../../../../src/domain/entities/Membership';
import { MEMBERSHIP_DEFAULTS } from '../../../../src/domain/types/membership';
import { IEmailService } from '../../../../src/application/ports/IEmailService';
import { Barber, BarberProps, BarberSchedule } from '../../../../src/domain/entities/Barber';
import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';
import { Service } from '../../../../src/domain/entities/Service';
import { Client } from '../../../../src/domain/entities/Client';
import { makeMockAppointmentRepository, makeMockBarberRepository, makeMockServiceRepository, makeMockClientRepository, makeMockMembershipRepository, makeMockTempLockRepository, makeMockEmailService, makeMockBarberBlockRepository } from '../../../test-utils/mocks';

describe('CreateAppointmentUseCase', () => {
  const createScheduleDay = () => ({
    startTime: '09:00',
    endTime: '17:00',
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

  const TEST_SERVICE_ID = new mongoose.Types.ObjectId().toString();
  const TEST_BARBER_ID = new mongoose.Types.ObjectId().toString();

  const makeBarber = (overrides?: Partial<BarberProps>) => {
    const base: BarberProps = {
      id: 'barber-1',
      email: 'barber@example.com',
      name: 'Carlos',
      lastname: 'Lopez',
      phone: '098765432',
      kind: 'Empleado',
      services: [],
      isActive: true,
      slotDuration: 30,
      maxAdvanceDays: 99999,
      schedule: createSchedule(),
      passwordHash: 'hash',
    };
    return Barber.create({ ...base, ...overrides });
  };

  const makeAppointment = (overrides?: Partial<AppointmentProps>) => {
    const base: AppointmentProps = {
      id: 'apt-1',
      barberId: 'barber-1',
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientPhone: '123456789',
      serviceId: TEST_SERVICE_ID,
      serviceName: 'Corte de pelo',
      servicePrice: 490,
      serviceDuration: 60,
      date: '2099-01-01',
      startTime: '10:00',
      endTime: '11:00',
      status: 'Confirmado',
      paymentStatus: 'Pendiente',
      paymentMethod: 'local',
      statusHistory: [{ status: 'Confirmado', timestamp: new Date(), actor: 'system' }],
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return Appointment.create({ ...base, ...overrides });
  };

  const makeBarberWithSlot = (slotDuration: number) =>
    makeBarber({ slotDuration });

  const makeService = () =>
    Service.create({
      id: TEST_SERVICE_ID,
      name: 'Corte de pelo',
      description: 'Incluye barba/cejas/lavado/bebida a elección',
      price: 490,
      imageUrl: 'https://placehold.co/400x300?text=Corte+de+pelo',
      status: 'active',
    });

  const makeClient = () =>
    Client.create({
      id: 'client-1',
      name: 'Juan',
      lastname: 'Perez',
      phone: '+59899123456',
      kind: 'NoRegistrado',
    });

  let appointmentRepository: ReturnType<typeof makeMockAppointmentRepository>;
  let barberRepository: ReturnType<typeof makeMockBarberRepository>;
  let serviceRepository: ReturnType<typeof makeMockServiceRepository>;
  let clientRepository: ReturnType<typeof makeMockClientRepository>;
  let membershipRepository: ReturnType<typeof makeMockMembershipRepository>;
  let tempLockRepository: ReturnType<typeof makeMockTempLockRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let blockRepository: ReturnType<typeof makeMockBarberBlockRepository>;
  let useCase: CreateAppointmentUseCase;
  let capturedSession: any;

  const TEST_TEMP_LOCK_ID = new mongoose.Types.ObjectId().toString();
  let mockTempLockData: { barberId: string; date: string; startTime: string; createdAt: Date } = {
    barberId: 'barber-1',
    date: '2099-01-01',
    startTime: '10:00',
    createdAt: new Date(),
  };

  beforeEach(() => {
    appointmentRepository = makeMockAppointmentRepository();
    appointmentRepository.findByClientId.mockResolvedValue([]);
    appointmentRepository.findByContact.mockResolvedValue([]);

    barberRepository = makeMockBarberRepository();
    serviceRepository = makeMockServiceRepository();
    clientRepository = makeMockClientRepository();
    clientRepository.createUnregistered.mockResolvedValue({ id: 'client-1' } as any);
    membershipRepository = makeMockMembershipRepository();
    membershipRepository.findActiveByUser.mockResolvedValue(null);
    tempLockRepository = makeMockTempLockRepository();
    mockTempLockData = {
      barberId: 'barber-1',
      date: '2099-01-01',
      startTime: '10:00',
      createdAt: new Date(),
    };
    tempLockRepository.findById.mockImplementation((_id: string, _session?: any) =>
      Promise.resolve({
        id: _id,
        ...mockTempLockData,
      })
    );
    tempLockRepository.deleteOne.mockResolvedValue(undefined);
    emailService = makeMockEmailService();
    blockRepository = makeMockBarberBlockRepository();
    blockRepository.findByBarberAndDate.mockResolvedValue([]);

    useCase = new CreateAppointmentUseCase(
      appointmentRepository,
      barberRepository,
      serviceRepository,
      clientRepository,
      emailService,
      tempLockRepository,
      blockRepository as any,
      membershipRepository as any,
    );

    capturedSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn(),
    };
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(capturedSession);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe fallar si el barbero no existe', async () => {
    barberRepository.findBarberById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        tempLockId: TEST_TEMP_LOCK_ID,
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el barbero esta inactivo', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber({ isActive: false }));

    await expect(
      useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        tempLockId: TEST_TEMP_LOCK_ID,
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el servicio no existe', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber());
    serviceRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        barberId: 'barber-1',
        serviceId: new mongoose.Types.ObjectId().toString(),
        date: '2099-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        tempLockId: TEST_TEMP_LOCK_ID,
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el horario ya esta ocupado', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber());
    serviceRepository.findById.mockResolvedValue(makeService());
    appointmentRepository.findByBarberAndDate.mockResolvedValue([
      makeAppointment({ startTime: '10:00', endTime: '10:50' }),
    ]);

    await expect(
      useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        tempLockId: TEST_TEMP_LOCK_ID,
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe crear un turno exitosamente', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber());
    serviceRepository.findById.mockResolvedValue(makeService());
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
    appointmentRepository.findByClientId.mockResolvedValue([]);
    clientRepository.findByEmail.mockResolvedValue(makeClient());
    appointmentRepository.create.mockResolvedValue(makeAppointment());

    const result = await useCase.execute({
      barberId: 'barber-1',
      serviceId: TEST_SERVICE_ID,
      date: '2099-01-01',
      startTime: '10:00',
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientPhone: '123456789',
      clientEmail: 'juan@test.com',
      tempLockId: TEST_TEMP_LOCK_ID,
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-01',
        startTime: '10:00',
        endTime: '10:30',
      }),
      capturedSession
    );
    expect(result.message).toMatch(/Turno creado/);
    expect(result.appointment).toEqual(
      expect.objectContaining({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-01',
        startTime: '10:00',
        status: 'Confirmado',
      })
    );
  });

  it('debe crear turno correctamente con cualquier slot del barbero', async () => {
    const barber45 = makeBarber({ slotDuration: 45 });
    barberRepository.findBarberById.mockResolvedValue(barber45);
    serviceRepository.findById.mockResolvedValue(makeService());
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
    appointmentRepository.findByClientId.mockResolvedValue([]);
    clientRepository.createUnregistered.mockResolvedValue(makeClient());
    appointmentRepository.create.mockResolvedValue(makeAppointment());
    mockTempLockData = { ...mockTempLockData, startTime: '09:45' };

    const result = await useCase.execute({
      barberId: 'barber-1',
      serviceId: TEST_SERVICE_ID,
      date: '2099-01-01',
      startTime: '09:45',
      clientName: 'Juan',
      clientLastname: 'Perez',
      tempLockId: TEST_TEMP_LOCK_ID,
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        barberId: 'barber-1',
        date: '2099-01-01',
        startTime: '09:45',
        endTime: '10:30',
      }),
      capturedSession
    );
  });

  it('debe fallar si la fecha esta en el pasado', async () => {
    await expect(
      useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2020-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        tempLockId: TEST_TEMP_LOCK_ID,
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el turno esta fuera del horario laboral', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber());
    serviceRepository.findById.mockResolvedValue(makeService());
    mockTempLockData = { ...mockTempLockData, startTime: '20:00' };

    await expect(
      useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-01',
        startTime: '20:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        tempLockId: TEST_TEMP_LOCK_ID,
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el turno se superpone con un break', async () => {
    const schedule = createSchedule();
    schedule.monday.breaks = [{ startTime: '12:00', endTime: '14:00' }];
    const barberWithBreak = makeBarber({ schedule });
    barberRepository.findBarberById.mockResolvedValue(barberWithBreak);
    serviceRepository.findById.mockResolvedValue(makeService());
    mockTempLockData = { ...mockTempLockData, date: '2099-01-05', startTime: '13:00' };

    await expect(
      useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-05',
        startTime: '13:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        tempLockId: TEST_TEMP_LOCK_ID,
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe ignorar turnos cancelados al verificar solapamiento', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber());
    serviceRepository.findById.mockResolvedValue(makeService());
    appointmentRepository.findByBarberAndDate.mockResolvedValue([
      makeAppointment({ status: 'Cancelado', startTime: '10:00', endTime: '10:50' }),
    ]);
    appointmentRepository.findByClientId.mockResolvedValue([]);
    clientRepository.findByEmail.mockResolvedValue(makeClient());
    appointmentRepository.create.mockResolvedValue(makeAppointment());

    const result = await useCase.execute({
      barberId: 'barber-1',
      serviceId: TEST_SERVICE_ID,
      date: '2099-01-01',
      startTime: '10:00',
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientEmail: 'juan@test.com',
      tempLockId: TEST_TEMP_LOCK_ID,
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        barberId: 'barber-1',
        date: '2099-01-01',
        startTime: '10:00',
        endTime: '10:30',
      }),
      capturedSession
    );
    expect(result.message).toMatch(/Turno creado/);
  });

  it('debe rechazar si la fecha excede el maxAdvanceDays del barbero', async () => {
    const barber = makeBarber({ maxAdvanceDays: 1 });
    barberRepository.findBarberById.mockResolvedValue(barber);
    serviceRepository.findById.mockResolvedValue(makeService());

    await expect(
      useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        tempLockId: TEST_TEMP_LOCK_ID,
      })
    ).rejects.toThrow(/anticipación/);
  });

  it('debe respetar clientId y createdBy ya asignados en el DTO (Registrado)', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber());
    serviceRepository.findById.mockResolvedValue(makeService());
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
    appointmentRepository.findByClientId.mockResolvedValue([]);
    clientRepository.findByEmail.mockResolvedValue(makeClient());
    appointmentRepository.create.mockResolvedValue(makeAppointment());

    await useCase.execute({
      barberId: 'barber-1',
      serviceId: TEST_SERVICE_ID,
      date: '2099-01-01',
      startTime: '10:00',
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientEmail: 'juan@test.com',
      clientId: 'user-1',
      createdBy: { type: 'registered', userId: 'user-1' },
      tempLockId: TEST_TEMP_LOCK_ID,
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'user-1',
        createdBy: { type: 'registered', userId: 'user-1' },
      }),
      capturedSession
    );
  });

  it('debe respetar createdBy como staff sin modificar clientId', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber());
    serviceRepository.findById.mockResolvedValue(makeService());
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
    appointmentRepository.findByClientId.mockResolvedValue([]);
    clientRepository.createUnregistered.mockResolvedValue(makeClient());
    appointmentRepository.create.mockResolvedValue(makeAppointment());

    await useCase.execute({
      barberId: 'barber-1',
      serviceId: TEST_SERVICE_ID,
      date: '2099-01-01',
      startTime: '10:00',
      clientName: 'Juan',
      clientLastname: 'Perez',
      createdBy: { type: 'staff', userId: 'emp-1' },
      tempLockId: TEST_TEMP_LOCK_ID,
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ clientId: 'emp-1' }),
      capturedSession
    );

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: { type: 'staff', userId: 'emp-1' },
      }),
      capturedSession
    );
  });

  it('debe respetar createdBy como anonymous', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber());
    serviceRepository.findById.mockResolvedValue(makeService());
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
    appointmentRepository.findByClientId.mockResolvedValue([]);
    clientRepository.createUnregistered.mockResolvedValue(makeClient());
    appointmentRepository.create.mockResolvedValue(makeAppointment());

    await useCase.execute({
      barberId: 'barber-1',
      serviceId: TEST_SERVICE_ID,
      date: '2099-01-01',
      startTime: '10:00',
      clientName: 'Juan',
      clientLastname: 'Perez',
      createdBy: { type: 'anonymous' },
      tempLockId: TEST_TEMP_LOCK_ID,
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: { type: 'anonymous' },
      }),
      capturedSession
    );
  });

  it('debe usar el nombre del cliente como actor cuando el turno lo crea el cliente', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber());
    serviceRepository.findById.mockResolvedValue(makeService());
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
    appointmentRepository.findByClientId.mockResolvedValue([]);
    clientRepository.findByEmail.mockResolvedValue(makeClient());
    appointmentRepository.create.mockResolvedValue(makeAppointment());

    await useCase.execute({
      barberId: 'barber-1',
      serviceId: TEST_SERVICE_ID,
      date: '2099-01-01',
      startTime: '10:00',
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientEmail: 'juan@test.com',
      createdBy: { type: 'registered', userId: 'user-1' },
      tempLockId: TEST_TEMP_LOCK_ID,
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        statusHistory: [{ status: 'Confirmado', timestamp: expect.any(Date), actor: 'Juan Perez' }],
      }),
      capturedSession
    );
  });

  it('debe usar el nombre del staff como actor cuando el turno lo crea el staff', async () => {
    barberRepository.findBarberById.mockImplementation((id: string) =>
      Promise.resolve(id === 'emp-1' ? makeBarber({ id: 'emp-1', name: 'Marta', lastname: 'Diaz' }) : makeBarber())
    );
    serviceRepository.findById.mockResolvedValue(makeService());
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
    appointmentRepository.findByClientId.mockResolvedValue([]);
    clientRepository.createUnregistered.mockResolvedValue(makeClient());
    appointmentRepository.create.mockResolvedValue(makeAppointment());

    await useCase.execute({
      barberId: 'barber-1',
      serviceId: TEST_SERVICE_ID,
      date: '2099-01-01',
      startTime: '10:00',
      clientName: 'Juan',
      clientLastname: 'Perez',
      createdBy: { type: 'staff', userId: 'emp-1' },
      tempLockId: TEST_TEMP_LOCK_ID,
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        statusHistory: [{ status: 'Confirmado', timestamp: expect.any(Date), actor: 'Marta Diaz' }],
      }),
      capturedSession
    );
  });

  it('debe aceptar si la fecha esta dentro del maxAdvanceDays del barbero', async () => {
    const barber = makeBarber({ maxAdvanceDays: 99999 });
    barberRepository.findBarberById.mockResolvedValue(barber);
    serviceRepository.findById.mockResolvedValue(makeService());
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
    appointmentRepository.findByClientId.mockResolvedValue([]);
    clientRepository.findByEmail.mockResolvedValue(makeClient());
    appointmentRepository.create.mockResolvedValue(makeAppointment());

    const result = await useCase.execute({
      barberId: 'barber-1',
      serviceId: TEST_SERVICE_ID,
      date: '2099-01-01',
      startTime: '10:00',
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientEmail: 'juan@test.com',
      tempLockId: TEST_TEMP_LOCK_ID,
    });

    expect(result.message).toMatch(/Turno creado/);
  });

  describe('membresía (memberPass)', () => {
    const makeActiveMembership = () => {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      return Membership.restore({
        id: 'mem-1',
        userId: 'client-1',
        status: 'active',
        price: 500,
        startDate: new Date(),
        endDate: future,
        couponsTotal: MEMBERSHIP_DEFAULTS.couponsTotal,
        couponsUsed: 0,
        productDiscount: MEMBERSHIP_DEFAULTS.productDiscount,
        durationDays: MEMBERSHIP_DEFAULTS.durationDays,
        billingCycle: 'onetime',
        paymentMethod: 'mercadopago',
        createdBy: 'client',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    };

    const setupBaseMocks = () => {
      barberRepository.findBarberById.mockResolvedValue(makeBarber());
      serviceRepository.findById.mockResolvedValue(makeService());
      appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
      appointmentRepository.findByClientId.mockResolvedValue([]);
      clientRepository.findByEmail.mockResolvedValue(makeClient());
      appointmentRepository.create.mockResolvedValue(makeAppointment());
    };

    it('debe canjear cupón de membresía cuando paymentMethod es memberPass', async () => {
      const membership = makeActiveMembership();
      membershipRepository.findActiveByUser.mockResolvedValue(membership);
      membershipRepository.atomicConsumeCoupon.mockResolvedValue(membership);
      setupBaseMocks();

      await useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        clientId: 'client-1',
        paymentMethod: 'memberPass',
        tempLockId: TEST_TEMP_LOCK_ID,
      });

      expect(membershipRepository.atomicConsumeCoupon).toHaveBeenCalledWith('mem-1', capturedSession);
    });

    it('debe establecer paymentStatus como Pagado cuando es memberPass', async () => {
      const membership = makeActiveMembership();
      membershipRepository.findActiveByUser.mockResolvedValue(membership);
      membershipRepository.atomicConsumeCoupon.mockResolvedValue(membership);
      setupBaseMocks();

      await useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        clientId: 'client-1',
        paymentMethod: 'memberPass',
        tempLockId: TEST_TEMP_LOCK_ID,
      });

      expect(appointmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'memberPass',
          paymentStatus: 'Pagado',
        }),
        capturedSession
      );
    });

    it('debe rechazar memberPass si no hay membresía activa', async () => {
      membershipRepository.findActiveByUser.mockResolvedValue(null);
      setupBaseMocks();

      await expect(
        useCase.execute({
          barberId: 'barber-1',
          serviceId: TEST_SERVICE_ID,
          date: '2099-01-01',
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientId: 'client-1',
          paymentMethod: 'memberPass',
          tempLockId: TEST_TEMP_LOCK_ID,
        })
      ).rejects.toBeInstanceOf(AppError);
    });

    it('debe rechazar memberPass si no hay clientId', async () => {
      setupBaseMocks();

      await expect(
        useCase.execute({
          barberId: 'barber-1',
          serviceId: TEST_SERVICE_ID,
          date: '2099-01-01',
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          paymentMethod: 'memberPass',
          tempLockId: TEST_TEMP_LOCK_ID,
        })
      ).rejects.toBeInstanceOf(AppError);
    });

    it('NO debe canjear cupón cuando paymentMethod es local', async () => {
      setupBaseMocks();

      await useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        clientEmail: 'juan@test.com',
        paymentMethod: 'local',
        tempLockId: TEST_TEMP_LOCK_ID,
      });

      expect(membershipRepository.atomicConsumeCoupon).not.toHaveBeenCalled();
    });
  });

  describe('RN15 — límite de turnos activos', () => {
    const setupBaseMocks = () => {
      barberRepository.findBarberById.mockResolvedValue(makeBarber());
      serviceRepository.findById.mockResolvedValue(makeService());
      appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
      appointmentRepository.create.mockResolvedValue(makeAppointment());
    };

    const makeActiveAppointments = (count: number, status: AppointmentProps['status'] = 'Confirmado') =>
      Array.from({ length: count }, (_, i) =>
        makeAppointment({ id: `apt-active-${i}`, status, date: '2099-12-31', startTime: '10:00', endTime: '11:00' })
      );

    it('debe permitir crear turno si tiene menos de 10 turnos activos', async () => {
      appointmentRepository.findByClientId.mockResolvedValue(makeActiveAppointments(9));
      setupBaseMocks();
      mockTempLockData = { ...mockTempLockData, date: '2099-06-15' };

      const result = await useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-06-15',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        clientId: 'client-1',
        tempLockId: TEST_TEMP_LOCK_ID,
      });

      expect(result.message).toMatch(/Turno creado/);
    });

    it('debe bloquear si el cliente ya tiene 10 turnos activos', async () => {
      appointmentRepository.findByClientId.mockResolvedValue(makeActiveAppointments(10));
      setupBaseMocks();
      mockTempLockData = { ...mockTempLockData, date: '2099-06-15', startTime: '14:00' };

      await expect(
        useCase.execute({
          barberId: 'barber-1',
          serviceId: TEST_SERVICE_ID,
          date: '2099-06-15',
          startTime: '14:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientId: 'client-1',
          tempLockId: TEST_TEMP_LOCK_ID,
        })
      ).rejects.toThrow(AppError);
    });

    it('no cuenta turnos Cancelado para el límite de activos', async () => {
      appointmentRepository.findByClientId.mockResolvedValue(makeActiveAppointments(10, 'Cancelado'));
      setupBaseMocks();
      mockTempLockData = { ...mockTempLockData, date: '2099-06-15' };

      const result = await useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-06-15',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        clientId: 'client-1',
        tempLockId: TEST_TEMP_LOCK_ID,
      });

      expect(result.message).toMatch(/Turno creado/);
    });
  });

  describe('No-Show — bloqueo de clientes sancionados', () => {
    const setupBaseMocks = () => {
      barberRepository.findBarberById.mockResolvedValue(makeBarber());
      serviceRepository.findById.mockResolvedValue(makeService());
      appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
      appointmentRepository.findByClientId.mockResolvedValue([]);
      appointmentRepository.create.mockResolvedValue(makeAppointment());
    };

    const makeSanctionedClient = () =>
      Client.create({ ...makeClient().toPrimitives(), noShowCount: 3, sancionado: true, fechaSancion: new Date(), motivoSancion: '3 inasistencias', sancionadoPor: 'admin@test.com' });

    it('debe bloquear la reserva de un cliente registrado sancionado', async () => {
      setupBaseMocks();
      clientRepository.findById.mockResolvedValue(makeSanctionedClient());

      await expect(
        useCase.execute({
          barberId: 'barber-1',
          serviceId: TEST_SERVICE_ID,
          date: '2099-01-01',
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientId: 'client-1',
          tempLockId: TEST_TEMP_LOCK_ID,
        })
      ).rejects.toThrow(AppError);

      expect(appointmentRepository.create).not.toHaveBeenCalled();
    });

    it('debe bloquear la reserva de un cliente anónimo sancionado encontrado por teléfono', async () => {
      setupBaseMocks();
      clientRepository.findByPhone.mockResolvedValue(makeSanctionedClient());
      clientRepository.findById.mockResolvedValue(makeSanctionedClient());

      await expect(
        useCase.execute({
          barberId: 'barber-1',
          serviceId: TEST_SERVICE_ID,
          date: '2099-01-01',
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientPhone: '+59899123456',
          clientEmail: 'juan@test.com',
          tempLockId: TEST_TEMP_LOCK_ID,
        })
      ).rejects.toThrow(AppError);

      expect(appointmentRepository.create).not.toHaveBeenCalled();
    });

    it('debe permitir la reserva de un cliente no sancionado', async () => {
      setupBaseMocks();
      clientRepository.findById.mockResolvedValue(makeClient());

      const result = await useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        clientId: 'client-1',
        tempLockId: TEST_TEMP_LOCK_ID,
      });

      expect(result.message).toMatch(/Turno creado/);
    });
  });

  describe('TempLock — validación obligatoria', () => {
    const setupBaseMocks = () => {
      barberRepository.findBarberById.mockResolvedValue(makeBarber());
      serviceRepository.findById.mockResolvedValue(makeService());
      appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
      appointmentRepository.findByClientId.mockResolvedValue([]);
      clientRepository.findByEmail.mockResolvedValue(makeClient());
      appointmentRepository.create.mockResolvedValue(makeAppointment());
    };

    it('debe rechazar si el tempLock no existe', async () => {
      setupBaseMocks();
      tempLockRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          barberId: 'barber-1',
          serviceId: TEST_SERVICE_ID,
          date: '2099-01-01',
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientEmail: 'juan@test.com',
          tempLockId: TEST_TEMP_LOCK_ID,
        })
      ).rejects.toThrow(/ya fue reservado/);
    });

    it('debe rechazar si el tempLock no coincide con barberId/date/startTime', async () => {
      setupBaseMocks();
      tempLockRepository.findById.mockResolvedValue({
        id: TEST_TEMP_LOCK_ID,
        barberId: 'other-barber',
        date: '2099-01-01',
        startTime: '10:00',
        createdAt: new Date(),
      });

      await expect(
        useCase.execute({
          barberId: 'barber-1',
          serviceId: TEST_SERVICE_ID,
          date: '2099-01-01',
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientEmail: 'juan@test.com',
          tempLockId: TEST_TEMP_LOCK_ID,
        })
      ).rejects.toThrow(/ya fue reservado/);
    });

    it('debe rechazar si el tempLock esta expirado (>300s)', async () => {
      setupBaseMocks();
      const expiredDate = new Date(Date.now() - 301_000);
      tempLockRepository.findById.mockResolvedValue({
        id: TEST_TEMP_LOCK_ID,
        barberId: 'barber-1',
        date: '2099-01-01',
        startTime: '10:00',
        createdAt: expiredDate,
      });

      await expect(
        useCase.execute({
          barberId: 'barber-1',
          serviceId: TEST_SERVICE_ID,
          date: '2099-01-01',
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientEmail: 'juan@test.com',
          tempLockId: TEST_TEMP_LOCK_ID,
        })
      ).rejects.toThrow(/expiró/);
    });
  });
});

