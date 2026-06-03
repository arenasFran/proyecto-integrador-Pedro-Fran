import { CreateAppointmentUseCase } from '../../../../src/application/use-cases/appointment/CreateAppointmentUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IBarberRepository } from '../../../../src/domain/repositories/IBarberRepository';
import { IAppointmentRepository } from '../../../../src/domain/repositories/IAppointmentRepository';
import {
  Barber,
  BarberProps,
  BarberSchedule,
} from '../../../../src/domain/entities/Barber';
import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';

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
      specialties: [],
      isActive: true,
      slotDuration: 30,
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
      serviceId: 'svc-1',
      serviceName: 'Corte de pelo',
      servicePrice: 490,
      serviceDuration: 50,
      date: '2099-01-01',
      startTime: '10:00',
      endTime: '10:50',
      status: 'Pendiente',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return Appointment.create({ ...base, ...overrides });
  };

  let appointmentRepository: jest.Mocked<IAppointmentRepository>;
  let barberRepository: jest.Mocked<IBarberRepository>;
  let useCase: CreateAppointmentUseCase;

  beforeEach(() => {
    appointmentRepository = {
      findById: jest.fn(),
      findMany: jest.fn(),
      findByBarberAndDate: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };

    barberRepository = {
      findEmployeeById: jest.fn(),
      findAllEmployees: jest.fn(),
      createEmployee: jest.fn(),
      updateEmployee: jest.fn(),
      deactivateEmployee: jest.fn(),
      deleteEmployee: jest.fn(),
      updateSchedule: jest.fn(),
    };

    useCase = new CreateAppointmentUseCase(appointmentRepository, barberRepository);
  });

  it('debe fallar si el barbero no existe', async () => {
    barberRepository.findEmployeeById.mockResolvedValue(null);

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
    barberRepository.findEmployeeById.mockResolvedValue(makeBarber({ isActive: false }));

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
    barberRepository.findEmployeeById.mockResolvedValue(makeBarber());

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
    barberRepository.findEmployeeById.mockResolvedValue(makeBarber());
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
    barberRepository.findEmployeeById.mockResolvedValue(makeBarber());
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
    appointmentRepository.create.mockResolvedValue(makeAppointment());

    const result = await useCase.execute({
      barberId: 'barber-1',
      serviceId: 'svc-1',
      date: '2099-01-01',
      startTime: '10:00',
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientPhone: '123456789',
    });

    expect(appointmentRepository.create).toHaveBeenCalled();
    expect(result.message).toMatch(/Turno creado/);
    expect(result.appointment).toBeDefined();
  });

  it('debe ignorar turnos cancelados al verificar solapamiento', async () => {
    barberRepository.findEmployeeById.mockResolvedValue(makeBarber());
    appointmentRepository.findByBarberAndDate.mockResolvedValue([
      makeAppointment({ status: 'Cancelado', startTime: '10:00', endTime: '10:50' }),
    ]);
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
});
