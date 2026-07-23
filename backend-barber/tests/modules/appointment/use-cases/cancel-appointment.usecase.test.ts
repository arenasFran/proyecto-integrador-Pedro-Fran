import mongoose from 'mongoose';
import { CancelAppointmentUseCase } from '../../../../src/application/use-cases/appointment/CancelAppointmentUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { IEmailService } from '../../../../src/application/ports/IEmailService';
import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';
import { makeMockAppointmentRepository, makeMockMembershipRepository, makeMockEmailService, makeMockBarberRepository } from '../../../test-utils/mocks';

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
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return Appointment.create({ ...base, ...overrides });
  };

  let appointmentRepository: ReturnType<typeof makeMockAppointmentRepository>;
  let membershipRepository: ReturnType<typeof makeMockMembershipRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let barberRepository: ReturnType<typeof makeMockBarberRepository>;
  let useCase: CancelAppointmentUseCase;
  let capturedSession: any;

  beforeEach(() => {
    appointmentRepository = makeMockAppointmentRepository();
    membershipRepository = makeMockMembershipRepository();
    membershipRepository.findActiveByUser.mockResolvedValue(null);
    emailService = makeMockEmailService();
    barberRepository = makeMockBarberRepository();
    barberRepository.findBarberById.mockResolvedValue({ name: 'Ana', lastname: 'Gomez' });

    useCase = new CancelAppointmentUseCase(appointmentRepository, membershipRepository as any, emailService, 0, barberRepository as any);

    capturedSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn(),
    };
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(capturedSession);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      appointmentRepository, membershipRepository as any, emailService, 2, barberRepository as any
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
      appointmentRepository, membershipRepository as any, emailService, 2, barberRepository as any
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
      paymentStatus: 'Cancelado',
      cancelReason: undefined,
      cancelledAt: expect.any(Date),
      cancelledBy: 'Juan Perez',
      statusHistoryEntry: { status: 'Cancelado', timestamp: expect.any(Date), actor: 'Juan Perez' },
    }, capturedSession);
    expect(result.message).toMatch(/Turno cancelado/);
  });

  it('debe cancelar el turno si es admin', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    appointmentRepository.updateStatus.mockResolvedValue(makeAppointment({ status: 'Cancelado' }));

    const result = await useCase.execute('apt-1', 'admin-1', 'Admin', 'Cliente no vino');

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'Cancelado',
      paymentStatus: 'Cancelado',
      cancelReason: 'Cliente no vino',
      cancelledAt: expect.any(Date),
      cancelledBy: 'Ana Gomez',
      statusHistoryEntry: { status: 'Cancelado', timestamp: expect.any(Date), actor: 'Ana Gomez' },
    }, capturedSession);
    expect(result.message).toMatch(/Turno cancelado/);
  });

  describe('restauración de cupón de membresía', () => {
    it('debe restaurar cupón al cancelar turno con memberPass', async () => {
      const membership = {
        id: 'membership-1',
        restoreCoupon: jest.fn(),
        remainingCoupons: 3,
        couponsUsed: 1,
        couponsTotal: 4,
      };
      membershipRepository.findActiveByUser.mockResolvedValue(membership);

      appointmentRepository.findById.mockResolvedValue(
        makeAppointment({ paymentMethod: 'memberPass', status: 'Confirmado' })
      );
      appointmentRepository.updateStatus.mockResolvedValue(
        makeAppointment({ status: 'Cancelado', paymentMethod: 'memberPass' })
      );

      const result = await useCase.execute('apt-1', 'client-1', 'Registrado');

      expect(membershipRepository.findActiveByUser).toHaveBeenCalledWith('client-1', capturedSession);
      expect(membership.restoreCoupon).toHaveBeenCalledTimes(1);
      expect(membershipRepository.incrementCouponsUsed).toHaveBeenCalledWith('membership-1', -1, capturedSession);
      expect(result.message).toMatch(/Turno cancelado/);
    });

    it('NO debe restaurar cupón al cancelar turno con método local', async () => {
      appointmentRepository.findById.mockResolvedValue(
        makeAppointment({ paymentMethod: 'local', status: 'Confirmado' })
      );
      appointmentRepository.updateStatus.mockResolvedValue(
        makeAppointment({ status: 'Cancelado', paymentMethod: 'local' })
      );

      await useCase.execute('apt-1', 'client-1', 'Registrado');

      expect(membershipRepository.findActiveByUser).not.toHaveBeenCalled();
      expect(membershipRepository.incrementCouponsUsed).not.toHaveBeenCalled();
    });
  });
});

