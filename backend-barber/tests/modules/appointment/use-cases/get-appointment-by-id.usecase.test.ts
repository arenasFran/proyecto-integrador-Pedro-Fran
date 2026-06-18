import { GetAppointmentByIdUseCase } from '../../../../src/application/use-cases/appointment/GetAppointmentByIdUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IAppointmentRepository } from '../../../../src/domain/repositories/IAppointmentRepository';
import { Appointment, AppointmentPrimitives } from '../../../../src/domain/entities/Appointment';
import { makeMockAppointmentRepository } from '../../../test-utils/mocks';

describe('GetAppointmentByIdUseCase', () => {
  const makeAppointment = (overrides?: Partial<AppointmentPrimitives>) => {
    const base: AppointmentPrimitives = {
      id: 'apt-1',
      barberId: 'barber-1',
      clientId: 'client-1',
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
      status: 'Confirmado',
      paymentStatus: 'Pendiente',
      paymentMethod: 'local',
      statusHistory: [{ status: 'Confirmado', timestamp: new Date(), actor: 'system' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return Appointment.create({ ...base, ...overrides });
  };

  let appointmentRepository: jest.Mocked<IAppointmentRepository>;
  let useCase: GetAppointmentByIdUseCase;

  beforeEach(() => {
    appointmentRepository = makeMockAppointmentRepository();
    useCase = new GetAppointmentByIdUseCase(appointmentRepository);
  });

  it('debe fallar si el turno no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('apt-1', 'client-1', 'Registrado')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el usuario no es dueno ni admin', async () => {
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ clientId: 'otro-cliente' })
    );

    await expect(
      useCase.execute('apt-1', 'client-1', 'Registrado')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe devolver el turno si es el dueno', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());

    const result = await useCase.execute('apt-1', 'client-1', 'Registrado');

    expect(result.appointment.id).toBe('apt-1');
    expect(result.appointment.clientName).toBe('Juan');
  });

  it('debe devolver el turno si es admin', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());

    const result = await useCase.execute('apt-1', 'admin-1', 'Admin');

    expect(result.appointment.id).toBe('apt-1');
  });

  it('debe devolver el turno si es empleado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());

    const result = await useCase.execute('apt-1', 'empleado-1', 'Empleado');

    expect(result.appointment.id).toBe('apt-1');
  });
});

