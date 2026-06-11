import { CreateAppointmentUseCase } from '../../../../src/application/use-cases/appointment/CreateAppointmentUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IBarberRepository } from '../../../../src/domain/repositories/IBarberRepository';
import { IAppointmentRepository } from '../../../../src/domain/repositories/IAppointmentRepository';
import { IServiceRepository } from '../../../../src/domain/repositories/IServiceRepository';
import { IClientRepository } from '../../../../src/domain/repositories/IClientRepository';
import { ITempLockRepository } from '../../../../src/domain/repositories/ITempLockRepository';
import { IEmailService } from '../../../../src/application/ports/IEmailService';
import {
  Barber,
  BarberProps,
  BarberSchedule,
} from '../../../../src/domain/entities/Barber';
import { Appointment, AppointmentPrimitives } from '../../../../src/domain/entities/Appointment';
import { Service } from '../../../../src/domain/entities/Service';
import { Client } from '../../../../src/domain/entities/Client';

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

  const makeAppointment = (overrides?: Partial<AppointmentPrimitives>) => {
    const base: AppointmentPrimitives = {
      id: 'apt-1',
      barberId: 'barber-1',
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientPhone: '123456789',
      serviceId: 'svc-1',
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return Appointment.create({ ...base, ...overrides });
  };

  const makeBarberWithSlot = (slotDuration: number) =>
    makeBarber({ slotDuration });

  const makeService = () =>
    Service.create({
      id: 'svc-1',
      name: 'Corte de pelo',
      description: 'Incluye barba/cejas/lavado/bebida a elección',
      price: 490,
      imageUrl: 'https://placehold.co/400x300?text=Corte+de+pelo',
    });

  const makeClient = () =>
    Client.create({
      id: 'client-1',
      name: 'Juan',
      lastname: 'Perez',
      phone: '+59899123456',
      kind: 'NoRegistrado',
    });

  let appointmentRepository: jest.Mocked<IAppointmentRepository>;
  let barberRepository: jest.Mocked<IBarberRepository>;
  let serviceRepository: jest.Mocked<IServiceRepository>;
  let clientRepository: jest.Mocked<IClientRepository>;
  let tempLockRepository: jest.Mocked<ITempLockRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let useCase: CreateAppointmentUseCase;

  beforeEach(() => {
    appointmentRepository = {
      findById: jest.fn(),
      findMany: jest.fn(),
      findByBarberAndDate: jest.fn(),
      findByClientAndDate: jest.fn(),
      findByContactAndDate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      findByClientId: jest.fn(),
      findByContact: jest.fn(),
      updateClientId: jest.fn(),
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

    serviceRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    clientRepository = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      createUnregistered: jest.fn(),
    };

    tempLockRepository = {
      create: jest.fn(),
      deleteMany: jest.fn(),
      deleteOne: jest.fn(),
      findByBarberAndDate: jest.fn(),
    };

    emailService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new CreateAppointmentUseCase(
      appointmentRepository,
      barberRepository,
      serviceRepository,
      clientRepository,
      emailService,
      tempLockRepository
    );
  });

  it('debe fallar si el barbero no existe', async () => {
    barberRepository.findBarberById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        barberId: 'barber-1',
        serviceId: 'svc-1',
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
        serviceId: 'svc-1',
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
        serviceId: 'svc-inventado',
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
        serviceId: 'svc-1',
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
      serviceId: 'svc-1',
      date: '2099-01-01',
      startTime: '10:00',
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientPhone: '123456789',
      clientEmail: 'juan@test.com',
    });

    expect(appointmentRepository.create).toHaveBeenCalled();
    expect(result.message).toMatch(/Turno creado/);
    expect(result.appointment).toBeDefined();
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
      serviceId: 'svc-1',
      date: '2099-01-01',
      startTime: '10:00',
      clientName: 'Juan',
      clientLastname: 'Perez',
    });

    expect(appointmentRepository.create).toHaveBeenCalled();
    expect(result.message).toMatch(/Turno creado/);
  });

  it('debe fallar si la fecha esta en el pasado', async () => {
    await expect(
      useCase.execute({
        barberId: 'barber-1',
        serviceId: 'svc-1',
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
        serviceId: 'svc-1',
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
        serviceId: 'svc-1',
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
      serviceId: 'svc-1',
      date: '2099-01-01',
      startTime: '10:00',
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientEmail: 'juan@test.com',
    });

    expect(appointmentRepository.create).toHaveBeenCalled();
    expect(result.message).toMatch(/Turno creado/);
  });

  it('debe rechazar si la fecha excede el maxAdvanceDays del barbero', async () => {
    const barber = makeBarber({ maxAdvanceDays: 1 });
    barberRepository.findBarberById.mockResolvedValue(barber);
    serviceRepository.findById.mockResolvedValue(makeService());

    await expect(
      useCase.execute({
        barberId: 'barber-1',
        serviceId: 'svc-1',
        date: '2099-01-01',
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
      })
    ).rejects.toThrow(/anticipación/);
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
      serviceId: 'svc-1',
      date: '2099-01-01',
      startTime: '10:00',
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientEmail: 'juan@test.com',
    });

    expect(result.message).toMatch(/Turno creado/);
  });
});

