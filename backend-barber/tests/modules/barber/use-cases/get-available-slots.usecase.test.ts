import { GetAvailableSlotsUseCase } from '../../../../src/application/use-cases/barber/GetAvailableSlotsUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { Barber, BarberProps, BarberSchedule } from '../../../../src/domain/entities/Barber';
import { IBarberRepository } from '../../../../src/domain/repositories/IBarberRepository';
import { IAppointmentRepository } from '../../../../src/domain/repositories/IAppointmentRepository';
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

  const makeAppointment = (overrides?: { startTime?: string; endTime?: string; status?: string }) => ({
    id: 'apt-1',
    barberId: 'barber-1',
    clientName: 'Juan',
    clientLastname: 'Perez',
    serviceId: 'svc-1',
    serviceName: 'Corte',
    servicePrice: 490,
    serviceDuration: 50,
    date: '2099-01-01',
    startTime: overrides?.startTime ?? '09:00',
    endTime: overrides?.endTime ?? '09:50',
    status: overrides?.status ?? 'Pendiente',
    cancelReason: undefined,
    cancelledAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  let barberRepository: jest.Mocked<IBarberRepository>;
  let appointmentRepository: jest.Mocked<IAppointmentRepository>;
  let slotService: SlotService;
  let useCase: GetAvailableSlotsUseCase;

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

    slotService = new SlotService();
    useCase = new GetAvailableSlotsUseCase(barberRepository, slotService, appointmentRepository);
  });

  it('debe fallar con fecha invalida', async () => {
    await expect(useCase.execute('barber-1', '2024/01/01')).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el barbero no existe', async () => {
    barberRepository.findEmployeeById.mockResolvedValue(null);
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);

    await expect(useCase.execute('barber-1', '2099-01-01')).rejects.toBeInstanceOf(AppError);
  });

  it('debe devolver slots segun el horario y los breaks sin turnos existentes', async () => {
    const schedule = createSchedule({
      breaks: [{ startTime: '10:00', endTime: '10:30' }],
    });

    barberRepository.findEmployeeById.mockResolvedValue(makeBarber({ schedule }));
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);

    const result = await useCase.execute('barber-1', '2099-01-05');

    expect(result.slots).toEqual(['09:00', '09:30', '10:30']);
  });

  it('debe excluir slots ocupados por turnos existentes', async () => {
    barberRepository.findEmployeeById.mockResolvedValue(makeBarber({ slotDuration: 30 }));
    appointmentRepository.findByBarberAndDate.mockResolvedValue([
      makeAppointment({ startTime: '09:00', endTime: '09:50' }) as any,
    ]);

    const result = await useCase.execute('barber-1', '2099-01-05');

    expect(result.slots).not.toContain('09:00');
    expect(result.slots).not.toContain('09:30');
    expect(result.slots).toContain('10:00');
  });

  it('debe ignorar turnos cancelados al calcular disponibilidad', async () => {
    barberRepository.findEmployeeById.mockResolvedValue(makeBarber({ slotDuration: 30 }));
    appointmentRepository.findByBarberAndDate.mockResolvedValue([
      makeAppointment({ startTime: '09:00', endTime: '09:50', status: 'Cancelado' }) as any,
    ]);

    const result = await useCase.execute('barber-1', '2099-01-05');

    expect(result.slots).toContain('09:00');
    expect(result.slots).toContain('09:30');
  });
});