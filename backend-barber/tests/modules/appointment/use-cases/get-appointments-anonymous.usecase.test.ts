import { GetAppointmentsAnonymousUseCase } from '../../../../src/application/use-cases/appointment/GetAppointmentsAnonymousUseCase';
import { IAppointmentRepository } from '../../../../src/domain/repositories/IAppointmentRepository';
import { AppError } from '../../../../src/application/errors/AppError';

const makeAppointment = (overrides?: Record<string, unknown>) => ({
  id: 'apt-1',
  barberId: 'barber-1',
  clientId: 'client-1',
  clientName: 'Juan',
  clientLastname: 'Perez',
  clientPhone: '123456789',
  clientEmail: 'juan@test.com',
  serviceId: 'svc-1',
  serviceName: 'Corte',
  servicePrice: 490,
  serviceDuration: 30,
  date: '2099-01-01',
  startTime: '10:00',
  endTime: '10:30',
  status: 'Confirmado',
  paymentStatus: 'Pendiente',
  paymentMethod: 'local',
  cancelReason: null,
  cancelledAt: null,
  cancelledBy: null,
  statusHistory: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  toPrimitives: function () {
    return { ...this };
  },
  ...overrides,
});

describe('GetAppointmentsAnonymousUseCase', () => {
  let appointmentRepository: jest.Mocked<IAppointmentRepository>;
  let useCase: GetAppointmentsAnonymousUseCase;

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
    useCase = new GetAppointmentsAnonymousUseCase(appointmentRepository);
  });

  it('debe devolver turnos por email', async () => {
    const apt = makeAppointment({ clientEmail: 'juan@test.com' });
    appointmentRepository.findMany.mockResolvedValue([apt] as any);

    const result = await useCase.execute({ clientEmail: 'juan@test.com' });

    expect(result.appointments).toHaveLength(1);
    expect(result.appointments[0].clientEmail).toBe('juan@test.com');
  });

  it('debe devolver turnos por telefono', async () => {
    const apt = makeAppointment({ clientPhone: '123456789' });
    appointmentRepository.findMany.mockResolvedValue([apt] as any);

    const result = await useCase.execute({ clientPhone: '123456789' });

    expect(result.appointments).toHaveLength(1);
  });

  it('debe filtrar por fecha si se proporciona', async () => {
    const apt = makeAppointment({ date: '2099-01-01' });
    appointmentRepository.findMany.mockResolvedValue([apt] as any);

    const result = await useCase.execute({
      clientEmail: 'juan@test.com',
      date: '2099-01-01',
    });

    expect(appointmentRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2099-01-01' })
    );
  });

  it('debe fallar si no se proporciona email ni telefono', async () => {
    await expect(useCase.execute({})).rejects.toBeInstanceOf(AppError);
  });

  it('debe devolver array vacio si no hay turnos', async () => {
    appointmentRepository.findMany.mockResolvedValue([]);

    const result = await useCase.execute({ clientEmail: 'nadie@test.com' });

    expect(result.appointments).toEqual([]);
  });
});

