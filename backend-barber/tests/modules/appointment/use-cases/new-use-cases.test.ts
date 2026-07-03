import { UpdatePaymentStatusUseCase } from '../../../../src/application/use-cases/appointment/UpdatePaymentStatusUseCase';
import { SendReminderUseCase } from '../../../../src/application/use-cases/appointment/SendReminderUseCase';
import { ChangeBarberUseCase } from '../../../../src/application/use-cases/appointment/ChangeBarberUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';
import {
  makeMockAppointmentRepository,
  makeMockBarberRepository,
  makeMockEmailService,
} from '../../../test-utils/mocks';

const makeAppointment = (overrides?: Partial<AppointmentProps>) => {
  const base: AppointmentProps = {
    id: 'apt-1',
    barberId: 'barber-1',
    clientName: 'Juan',
    clientLastname: 'Perez',
    clientEmail: 'juan@test.com',
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

describe('UpdatePaymentStatusUseCase', () => {
  let appointmentRepository: ReturnType<typeof makeMockAppointmentRepository>;
  let useCase: UpdatePaymentStatusUseCase;

  beforeEach(() => {
    appointmentRepository = makeMockAppointmentRepository();
    useCase = new UpdatePaymentStatusUseCase(appointmentRepository);
  });

  it('debe marcar como pagado un turno confirmado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    appointmentRepository.updateStatus.mockResolvedValue(makeAppointment({ paymentStatus: 'Pagado' }));

    const result = await useCase.execute('apt-1', 'admin-1', 'Admin');

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      paymentStatus: 'Pagado',
    });
    expect(result.message).toMatch(/Pago registrado/);
  });

  it('debe ser idempotente si ya estaba pagado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ paymentStatus: 'Pagado' }));

    const result = await useCase.execute('apt-1', 'admin-1', 'Admin');

    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    expect(result.message).toMatch(/ya se encontraba pagado/);
  });

  it('debe fallar si el turno no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('apt-1', 'admin-1', 'Admin')).rejects.toBeInstanceOf(AppError);
  });

  it('debe rechazar si el usuario no es admin ni empleado', async () => {
    await expect(useCase.execute('apt-1', 'user-1', 'Registrado')).rejects.toBeInstanceOf(AppError);
  });

  it('debe rechazar marcar pagado si el turno está cancelado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Cancelado' }));

    await expect(useCase.execute('apt-1', 'admin-1', 'Admin')).rejects.toBeInstanceOf(AppError);
  });

  it('debe rechazar marcar pagado si el turno es NoShow', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'NoShow' }));

    await expect(useCase.execute('apt-1', 'admin-1', 'Admin')).rejects.toBeInstanceOf(AppError);
  });
});

describe('SendReminderUseCase', () => {
  let appointmentRepository: ReturnType<typeof makeMockAppointmentRepository>;
  let barberRepository: ReturnType<typeof makeMockBarberRepository>;
  let emailService: ReturnType<typeof makeMockEmailService>;
  let useCase: SendReminderUseCase;

  beforeEach(() => {
    appointmentRepository = makeMockAppointmentRepository();
    barberRepository = makeMockBarberRepository();
    emailService = makeMockEmailService();
    useCase = new SendReminderUseCase(appointmentRepository, barberRepository, emailService);
  });

  it('debe enviar recordatorio por email exitosamente', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    barberRepository.findBarberById.mockResolvedValue({
      id: 'barber-1', name: 'Carlos', lastname: 'Lopez', isActive: true,
    } as any);

    const result = await useCase.execute('apt-1', 'admin-1', 'Admin');

    expect(emailService.sendMail).toHaveBeenCalledWith({
      to: 'juan@test.com',
      subject: 'Recordatorio de turno',
      html: expect.stringContaining('Carlos Lopez'),
    });
    expect(result.message).toMatch(/Recordatorio enviado/);
  });

  it('debe fallar si el turno no tiene email', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ clientEmail: undefined }));

    await expect(useCase.execute('apt-1', 'admin-1', 'Admin')).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el turno no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('apt-1', 'admin-1', 'Admin')).rejects.toBeInstanceOf(AppError);
  });

  it('debe rechazar si el usuario no es admin ni empleado', async () => {
    await expect(useCase.execute('apt-1', 'user-1', 'Registrado')).rejects.toBeInstanceOf(AppError);
  });
});

describe('ChangeBarberUseCase', () => {
  let appointmentRepository: ReturnType<typeof makeMockAppointmentRepository>;
  let barberRepository: ReturnType<typeof makeMockBarberRepository>;
  let useCase: ChangeBarberUseCase;

  beforeEach(() => {
    appointmentRepository = makeMockAppointmentRepository();
    barberRepository = makeMockBarberRepository();
    useCase = new ChangeBarberUseCase(appointmentRepository, barberRepository);
  });

  it('debe cambiar barbero exitosamente', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    barberRepository.findBarberById.mockImplementation((id: string) => {
      if (id === 'barber-2') return Promise.resolve({ id: 'barber-2', name: 'Pedro', lastname: 'Garcia', isActive: true } as any);
      return Promise.resolve({ id: 'barber-1', name: 'Carlos', lastname: 'Lopez', isActive: true } as any);
    });
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
    appointmentRepository.update.mockResolvedValue(makeAppointment({ barberId: 'barber-2' }));

    const result = await useCase.execute('apt-1', 'barber-2', 'admin-1', 'Admin');

    expect(appointmentRepository.update).toHaveBeenCalledWith('apt-1', { barberId: 'barber-2', version: 0 });
    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      statusHistoryEntry: expect.objectContaining({
        actor: expect.stringContaining('Carlos Lopez'),
      }),
    });
    expect(result.message).toMatch(/Carlos Lopez/);
  });

  it('debe fallar si el turno no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('apt-1', 'barber-2', 'admin-1', 'Admin')).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el turno no está confirmado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Completado' }));

    await expect(useCase.execute('apt-1', 'barber-2', 'admin-1', 'Admin')).rejects.toBeInstanceOf(AppError);
  });

  it('debe ser idempotente si ya tiene ese barbero', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ barberId: 'barber-2' }));

    const result = await useCase.execute('apt-1', 'barber-2', 'admin-1', 'Admin');

    expect(appointmentRepository.update).not.toHaveBeenCalled();
    expect(result.message).toMatch(/ya tiene ese barbero/);
  });

  it('debe fallar si el nuevo barbero no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    barberRepository.findBarberById.mockResolvedValue(null);

    await expect(useCase.execute('apt-1', 'inexistente', 'admin-1', 'Admin')).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el nuevo barbero está inactivo', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    barberRepository.findBarberById.mockResolvedValue({ id: 'barber-2', isActive: false } as any);

    await expect(useCase.execute('apt-1', 'barber-2', 'admin-1', 'Admin')).rejects.toBeInstanceOf(AppError);
  });

  it('debe rechazar si hay conflicto de horario con el nuevo barbero', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    barberRepository.findBarberById.mockResolvedValue({ id: 'barber-2', name: 'Pedro', lastname: 'Garcia', isActive: true } as any);
    appointmentRepository.findByBarberAndDate.mockResolvedValue([
      makeAppointment({ id: 'conflict-apt', barberId: 'barber-2', startTime: '10:00', endTime: '11:00' }),
    ]);

    await expect(useCase.execute('apt-1', 'barber-2', 'admin-1', 'Admin')).rejects.toBeInstanceOf(AppError);
  });

  it('debe rechazar si el usuario no es admin ni empleado', async () => {
    await expect(useCase.execute('apt-1', 'barber-2', 'user-1', 'Registrado')).rejects.toBeInstanceOf(AppError);
  });
});
