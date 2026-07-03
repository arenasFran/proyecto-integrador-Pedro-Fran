import { UpdateAppointmentStatusUseCase } from '../../../../src/application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { IEmailService } from '../../../../src/application/ports/IEmailService';
import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';
import { makeMockAppointmentRepository, makeMockEmailService } from '../../../test-utils/mocks';

describe('UpdateAppointmentStatusUseCase', () => {
  const makeAppointment = (overrides?: Partial<AppointmentProps>) => {
    const base: AppointmentProps = {
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

  let appointmentRepository: ReturnType<typeof makeMockAppointmentRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let useCase: UpdateAppointmentStatusUseCase;

  beforeEach(() => {
    appointmentRepository = makeMockAppointmentRepository();
    emailService = makeMockEmailService();

    useCase = new UpdateAppointmentStatusUseCase(appointmentRepository, emailService, 0);
  });

  it('debe fallar si el turno no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('apt-1', { status: 'Completado' }, 'admin-1', 'Admin')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe completar el turno y marcarlo como pagado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    appointmentRepository.updateStatus.mockResolvedValue(
      makeAppointment({ status: 'Completado' })
    );

    const result = await useCase.execute('apt-1', { status: 'Completado' }, 'empleado-1', 'Empleado');

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'Completado',
      paymentStatus: 'Pagado',
      statusHistoryEntry: { status: 'Completado', timestamp: expect.any(Date), actor: 'empleado' },
    });
    expect(result.message).toMatch(/Completado/);
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

  it('debe fallar si la transicion es invalida (Confirmado -> Confirmado)', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Confirmado' }));

    await expect(
      useCase.execute('apt-1', { status: 'Confirmado' }, 'admin-1', 'Admin')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si se intenta cambiar desde Cancelado a otro estado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Cancelado' }));

    await expect(
      useCase.execute('apt-1', { status: 'Completado' }, 'admin-1', 'Admin')
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

  it('debe fallar NoShow desde Completado (transicion invalida)', async () => {
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ status: 'Completado' })
    );

    await expect(
      useCase.execute('apt-1', { status: 'NoShow' }, 'empleado-1', 'Empleado')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe rechazar cancelacion con menos de 2h de anticipacion (fecha pasada)', async () => {
    const strictUseCase = new UpdateAppointmentStatusUseCase(appointmentRepository, emailService, 2);
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ status: 'Confirmado', date: '2020-01-01', startTime: '10:00' })
    );

    await expect(
      strictUseCase.execute('apt-1', { status: 'Cancelado' }, 'admin-1', 'Admin')
    ).rejects.toThrow(/anticipación/);
  });

  it('debe permitir cancelacion con suficiente anticipacion (fecha futura)', async () => {
    const strictUseCase = new UpdateAppointmentStatusUseCase(appointmentRepository, emailService, 2);
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ status: 'Confirmado', date: '2099-01-01', startTime: '10:00' })
    );
    appointmentRepository.updateStatus.mockResolvedValue(
      makeAppointment({ status: 'Cancelado' })
    );

    const result = await strictUseCase.execute('apt-1', { status: 'Cancelado' }, 'admin-1', 'Admin');

    expect(result.message).toMatch(/Cancelado/);
  });
});

