import { CancelAppointmentUseCase } from '../../../../src/application/use-cases/appointment/CancelAppointmentUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { IEmailService } from '../../../../src/application/ports/IEmailService';
import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';
import { makeMockAppointmentRepository, makeMockEmailService } from '../../../test-utils/mocks';

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

  let appointmentRepository: ReturnType<typeof makeMockAppointmentRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let useCase: CancelAppointmentUseCase;

  beforeEach(() => {
    appointmentRepository = makeMockAppointmentRepository();
    emailService = makeMockEmailService();

    useCase = new CancelAppointmentUseCase(appointmentRepository, emailService, 0);
  });

  it('debe fallar si el turno no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('apt-1', 'client-1', 'Registrado')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe retornar exito si el turno ya esta cancelado (idempotente)', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Cancelado' }));

    const result = await useCase.execute('apt-1', 'client-1', 'Registrado');
    expect(result.message).toMatch(/ya se encontraba cancelado/);
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

  it('debe rechazar cancelacion con menos de 2h de anticipacion (fecha pasada)', async () => {
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ date: '2020-01-01', startTime: '10:00' })
    );

    const strictUseCase = new CancelAppointmentUseCase(
      appointmentRepository, emailService, 2
    );

    await expect(
      strictUseCase.execute('apt-1', 'client-1', 'Registrado')
    ).rejects.toThrow(/anticipación/);
  });

  it('debe permitir cancelacion con suficiente anticipacion (fecha futura)', async () => {
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ status: 'Confirmado' })
    );
    appointmentRepository.updateStatus.mockResolvedValue(
      makeAppointment({ status: 'Cancelado' })
    );

    const strictUseCase = new CancelAppointmentUseCase(
      appointmentRepository, emailService, 2
    );

    const result = await strictUseCase.execute('apt-1', 'client-1', 'Registrado');
    expect(result.message).toMatch(/Turno cancelado/);
  });

  it('debe cancelar el turno si es el dueno', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    appointmentRepository.updateStatus.mockResolvedValue(makeAppointment({ status: 'Cancelado' }));

    const result = await useCase.execute('apt-1', 'client-1', 'Registrado');

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'Cancelado',
      cancelReason: undefined,
      cancelledAt: expect.any(Date),
      cancelledBy: 'cliente',
      statusHistoryEntry: { status: 'Cancelado', timestamp: expect.any(Date), actor: 'cliente' },
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
      cancelledBy: 'admin',
      statusHistoryEntry: { status: 'Cancelado', timestamp: expect.any(Date), actor: 'admin' },
    });
    expect(result.message).toMatch(/Turno cancelado/);
  });
});

