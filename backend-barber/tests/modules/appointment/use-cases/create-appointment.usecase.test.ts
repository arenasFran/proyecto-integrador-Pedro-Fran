import mongoose from 'mongoose';
import { CreateAppointmentUseCase } from '../../../../src/application/use-cases/appointment/CreateAppointmentUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { IEmailService } from '../../../../src/application/ports/IEmailService';
import { Barber, BarberProps, BarberSchedule } from '../../../../src/domain/entities/Barber';
import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';
import { Service } from '../../../../src/domain/entities/Service';
import { Client } from '../../../../src/domain/entities/Client';
import { makeMockAppointmentRepository, makeMockBarberRepository, makeMockServiceRepository, makeMockClientRepository, makeMockTempLockRepository, makeMockEmailService, makeMockBarberBlockRepository } from '../../../test-utils/mocks';

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
  let tempLockRepository: ReturnType<typeof makeMockTempLockRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let blockRepository: ReturnType<typeof makeMockBarberBlockRepository>;
  let useCase: CreateAppointmentUseCase;

  beforeEach(() => {
    appointmentRepository = makeMockAppointmentRepository();
    appointmentRepository.findByClientId.mockResolvedValue([]);
    appointmentRepository.findByContact.mockResolvedValue([]);

    barberRepository = makeMockBarberRepository();
    serviceRepository = makeMockServiceRepository();
    clientRepository = makeMockClientRepository();
    clientRepository.createUnregistered.mockResolvedValue({ id: 'client-1' } as any);
    tempLockRepository = makeMockTempLockRepository();
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
      blockRepository as any
    );
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
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-01',
        startTime: '10:00',
        endTime: '10:30',
        clientName: 'Juan',
      })
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

    const result = await useCase.execute({
      barberId: 'barber-1',
      serviceId: TEST_SERVICE_ID,
      date: '2099-01-01',
      startTime: '09:45',
      clientName: 'Juan',
      clientLastname: 'Perez',
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        barberId: 'barber-1',
        date: '2099-01-01',
        startTime: '09:45',
        endTime: '10:30',
      })
    );
    expect(result.message).toMatch(/Turno creado/);
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
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el turno esta fuera del horario laboral', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarber());
    serviceRepository.findById.mockResolvedValue(makeService());

    await expect(
      useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-01',
        startTime: '20:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el turno se superpone con un break', async () => {
    const schedule = createSchedule();
    schedule.monday.breaks = [{ startTime: '12:00', endTime: '14:00' }];
    const barberWithBreak = makeBarber({ schedule });
    barberRepository.findBarberById.mockResolvedValue(barberWithBreak);
    serviceRepository.findById.mockResolvedValue(makeService());

    await expect(
      useCase.execute({
        barberId: 'barber-1',
        serviceId: TEST_SERVICE_ID,
        date: '2099-01-05',
        startTime: '13:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
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
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        barberId: 'barber-1',
        date: '2099-01-01',
        startTime: '10:00',
        endTime: '10:30',
      })
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
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'user-1',
        createdBy: { type: 'registered', userId: 'user-1' },
      })
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
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ clientId: 'emp-1' })
    );

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: { type: 'staff', userId: 'emp-1' },
      })
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
    });

    expect(appointmentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: { type: 'anonymous' },
      })
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
    });

    expect(result.message).toMatch(/Turno creado/);
  });
});

