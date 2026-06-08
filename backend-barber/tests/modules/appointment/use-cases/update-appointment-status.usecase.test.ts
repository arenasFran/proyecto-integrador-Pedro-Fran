import { UpdateAppointmentStatusUseCase } from '../../../../src/application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IAppointmentRepository } from '../../../../src/domain/repositories/IAppointmentRepository';
import { Appointment, AppointmentPrimitives } from '../../../../src/domain/entities/Appointment';

describe('UpdateAppointmentStatusUseCase', () => {
  const makeAppointment = (overrides?: Partial<AppointmentPrimitives>) => {
    const base: AppointmentPrimitives = {
      id: 'apt-1',
      barberId: 'barber-1',
      clientName: 'Juan',
      clientLastname: 'Perez',
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
  let useCase: UpdateAppointmentStatusUseCase;

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
    };

    useCase = new UpdateAppointmentStatusUseCase(appointmentRepository);
  });

  it('debe fallar si el turno no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('apt-1', { status: 'Confirmado' })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe confirmar el turno', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    appointmentRepository.updateStatus.mockResolvedValue(
      makeAppointment({ status: 'Confirmado' })
    );

    const result = await useCase.execute('apt-1', { status: 'Confirmado' });

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'Confirmado',
    });
    expect(result.message).toMatch(/Confirmado/);
  });

  it('debe cancelar el turno con razon', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    appointmentRepository.updateStatus.mockResolvedValue(
      makeAppointment({ status: 'Cancelado' })
    );

    const result = await useCase.execute('apt-1', {
      status: 'Cancelado',
      cancelReason: 'No asistio',
    });

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'Cancelado',
      cancelReason: 'No asistio',
      cancelledAt: expect.any(Date),
    });
    expect(result.message).toMatch(/Cancelado/);
  });

  it('debe completar el turno solo desde Confirmado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Confirmado' }));
    appointmentRepository.updateStatus.mockResolvedValue(
      makeAppointment({ status: 'Completado' })
    );

    const result = await useCase.execute('apt-1', { status: 'Completado' });

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'Completado',
    });
    expect(result.message).toMatch(/Completado/);
  });

  it('debe fallar si la transicion es invalida (Pendiente -> Completado)', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Pendiente' }));

    await expect(
      useCase.execute('apt-1', { status: 'Completado' })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si se intenta cambiar desde Cancelado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Cancelado' }));

    await expect(
      useCase.execute('apt-1', { status: 'Pendiente' })
    ).rejects.toBeInstanceOf(AppError);
  });
});
