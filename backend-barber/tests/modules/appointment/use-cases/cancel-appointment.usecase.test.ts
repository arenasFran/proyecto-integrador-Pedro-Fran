import { CancelAppointmentUseCase } from '../../../../src/application/use-cases/appointment/CancelAppointmentUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IAppointmentRepository } from '../../../../src/domain/repositories/IAppointmentRepository';
import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';

describe('CancelAppointmentUseCase', () => {
  const makeAppointment = (overrides?: Partial<AppointmentProps>) => {
    const base: AppointmentProps = {
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
      status: 'Pendiente',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return Appointment.create({ ...base, ...overrides });
  };

  let appointmentRepository: jest.Mocked<IAppointmentRepository>;
  let useCase: CancelAppointmentUseCase;

  beforeEach(() => {
    appointmentRepository = {
      findById: jest.fn(),
      findMany: jest.fn(),
      findByBarberAndDate: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
    };

    useCase = new CancelAppointmentUseCase(appointmentRepository);
  });

  it('debe fallar si el turno no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('apt-1', 'client-1', 'Registrado')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el turno ya esta cancelado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Cancelado' }));

    await expect(
      useCase.execute('apt-1', 'client-1', 'Registrado')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el turno ya esta completado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Completado' }));

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

  it('debe cancelar el turno si es el dueno', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    appointmentRepository.updateStatus.mockResolvedValue(makeAppointment({ status: 'Cancelado' }));

    const result = await useCase.execute('apt-1', 'client-1', 'Registrado');

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'Cancelado',
      cancelReason: undefined,
      cancelledAt: expect.any(Date),
    });
    expect(result.message).toMatch(/Turno cancelado/);
  });

  it('debe cancelar el turno si es admin', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    appointmentRepository.updateStatus.mockResolvedValue(makeAppointment({ status: 'Cancelado' }));

    const result = await useCase.execute('apt-1', 'admin-1', 'Admin', 'Cliente no vino');

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'Cancelado',
      cancelReason: 'Cliente no vino',
      cancelledAt: expect.any(Date),
    });
    expect(result.message).toMatch(/Turno cancelado/);
  });
});
