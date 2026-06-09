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
      statusHistory: [{ status: 'Pendiente', timestamp: new Date(), actor: 'system' }],
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

    useCase = new UpdateAppointmentStatusUseCase(appointmentRepository, 0);
  });

  it('debe fallar si el turno no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('apt-1', { status: 'Confirmado' }, 'admin-1', 'Admin')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe confirmar el turno', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    appointmentRepository.updateStatus.mockResolvedValue(
      makeAppointment({ status: 'Confirmado' })
    );

    const result = await useCase.execute('apt-1', { status: 'Confirmado' }, 'admin-1', 'Admin');

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'Confirmado',
      statusHistoryEntry: { status: 'Confirmado', timestamp: expect.any(Date), actor: 'admin' },
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
    }, 'admin-1', 'Admin');

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'Cancelado',
      cancelReason: 'No asistio',
      cancelledAt: expect.any(Date),
      cancelledBy: 'admin',
      statusHistoryEntry: { status: 'Cancelado', timestamp: expect.any(Date), actor: 'admin' },
    });
    expect(result.message).toMatch(/Cancelado/);
  });

  it('debe completar el turno solo desde Confirmado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Confirmado' }));
    appointmentRepository.updateStatus.mockResolvedValue(
      makeAppointment({ status: 'Completado' })
    );

    const result = await useCase.execute('apt-1', { status: 'Completado' }, 'empleado-1', 'Empleado');

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'Completado',
      statusHistoryEntry: { status: 'Completado', timestamp: expect.any(Date), actor: 'empleado' },
    });
    expect(result.message).toMatch(/Completado/);
  });

  it('debe fallar si la transicion es invalida (Pendiente -> Completado)', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Pendiente' }));

    await expect(
      useCase.execute('apt-1', { status: 'Completado' }, 'admin-1', 'Admin')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si se intenta cambiar desde Cancelado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Cancelado' }));

    await expect(
      useCase.execute('apt-1', { status: 'Pendiente' }, 'admin-1', 'Admin')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe retornar exito si Cancelado -> Cancelado (idempotente)', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Cancelado' }));

    const result = await useCase.execute('apt-1', { status: 'Cancelado' }, 'admin-1', 'Admin');
    expect(result.message).toMatch(/ya se encontraba cancelado/);
  });

  it('debe marcar NoShow desde Confirmado si el turno ya paso', async () => {
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ status: 'Confirmado', date: '2020-01-01', startTime: '10:00' })
    );
    appointmentRepository.updateStatus.mockResolvedValue(
      makeAppointment({ status: 'NoShow' })
    );

    const result = await useCase.execute('apt-1', { status: 'NoShow' }, 'empleado-1', 'Empleado');

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'NoShow',
      statusHistoryEntry: { status: 'NoShow', timestamp: expect.any(Date), actor: 'empleado' },
    });
    expect(result.message).toMatch(/NoShow/);
  });

  it('debe fallar NoShow si el turno aun no paso', async () => {
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ status: 'Confirmado', date: '2099-01-01', startTime: '10:00' })
    );

    await expect(
      useCase.execute('apt-1', { status: 'NoShow' }, 'empleado-1', 'Empleado')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar NoShow desde Pendiente (transicion invalida)', async () => {
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ status: 'Pendiente' })
    );

    await expect(
      useCase.execute('apt-1', { status: 'NoShow' }, 'empleado-1', 'Empleado')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe rechazar cancelacion con menos de 2h de anticipacion (fecha pasada)', async () => {
    const strictUseCase = new UpdateAppointmentStatusUseCase(appointmentRepository, 2);
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ status: 'Pendiente', date: '2020-01-01', startTime: '10:00' })
    );

    await expect(
      strictUseCase.execute('apt-1', { status: 'Cancelado' }, 'admin-1', 'Admin')
    ).rejects.toThrow(/anticipación/);
  });

  it('debe permitir cancelacion con suficiente anticipacion (fecha futura)', async () => {
    const strictUseCase = new UpdateAppointmentStatusUseCase(appointmentRepository, 2);
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ status: 'Pendiente', date: '2099-01-01', startTime: '10:00' })
    );
    appointmentRepository.updateStatus.mockResolvedValue(
      makeAppointment({ status: 'Cancelado' })
    );

    const result = await strictUseCase.execute('apt-1', { status: 'Cancelado' }, 'admin-1', 'Admin');

    expect(result.message).toMatch(/Cancelado/);
  });
});
