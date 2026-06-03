import { GetAvailableSlotsUseCase } from '../../../../src/application/use-cases/barber/GetAvailableSlotsUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';
import { Barber, BarberProps, BarberSchedule } from '../../../../src/domain/entities/Barber';
import { IBarberRepository } from '../../../../src/domain/repositories/IBarberRepository';
import { IAppointmentRepository } from '../../../../src/domain/repositories/IAppointmentRepository';

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
  let appointmentRepository: jest.Mocked<IAppointmentRepository>;

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

    appointmentRepository = {
      findById: jest.fn(),
      findMany: jest.fn(),
      findByBarberAndDate: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };
  });

  it('debe fallar con fecha invalida', async () => {
    const useCase = new GetAvailableSlotsUseCase(barberRepository, appointmentRepository);

    await expect(useCase.execute('barber-1', '2024/01/01')).rejects.toBeInstanceOf(AppError);
  });

  it('debe devolver slots segun el horario y los breaks', async () => {
    const schedule = createSchedule({
      breaks: [{ startTime: '10:00', endTime: '10:30' }],
    });
    barberRepository.findEmployeeById.mockResolvedValue(makeBarber({ schedule }));
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);

    const useCase = new GetAvailableSlotsUseCase(barberRepository, appointmentRepository);
    const result = await useCase.execute('barber-1', '2099-01-01');

    expect(result.slots).toEqual(['09:00', '09:30', '10:30']);
  });

  it('debe respetar la duracion del slot del barbero', async () => {
    barberRepository.findEmployeeById.mockResolvedValue(makeBarber({ slotDuration: 60 }));
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);

    const useCase = new GetAvailableSlotsUseCase(barberRepository, appointmentRepository);
    const result = await useCase.execute('barber-1', '2099-01-01');

    expect(result.slots).toEqual(['09:00', '10:00']);
  });

  it('debe excluir slots ocupados por turnos existentes', async () => {
    const makeAppointment = (overrides?: Partial<AppointmentProps>) => {
      const base: AppointmentProps = {
        id: 'apt-1',
        barberId: 'barber-1',
        clientName: 'Juan',
        clientLastname: 'Perez',
        serviceId: 'svc-1',
        serviceName: 'Corte',
        servicePrice: 490,
        serviceDuration: 50,
        date: '2099-01-01',
        startTime: '09:00',
        endTime: '09:50',
        status: 'Pendiente',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return Appointment.create({ ...base, ...overrides });
    };

    barberRepository.findEmployeeById.mockResolvedValue(makeBarber({ slotDuration: 30 }));
    appointmentRepository.findByBarberAndDate.mockResolvedValue([makeAppointment()]);

    const useCase = new GetAvailableSlotsUseCase(barberRepository, appointmentRepository);
    const result = await useCase.execute('barber-1', '2099-01-01');

    expect(result.slots).not.toContain('09:00');
    expect(result.slots).not.toContain('09:30');
    expect(result.slots).toContain('10:00');
  });
});
