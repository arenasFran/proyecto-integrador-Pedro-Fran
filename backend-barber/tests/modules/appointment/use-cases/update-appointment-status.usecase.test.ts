import mongoose from 'mongoose';
import { UpdateAppointmentStatusUseCase } from '../../../../src/application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { IEmailService } from '../../../../src/application/ports/IEmailService';
import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';
import { makeMockAppointmentRepository, makeMockMembershipRepository, makeMockEmailService } from '../../../test-utils/mocks';

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
  let membershipRepository: ReturnType<typeof makeMockMembershipRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let useCase: UpdateAppointmentStatusUseCase;
  let capturedSession: any;

  beforeEach(() => {
    appointmentRepository = makeMockAppointmentRepository();
    membershipRepository = makeMockMembershipRepository();
    membershipRepository.findActiveByUser.mockResolvedValue(null);
    emailService = makeMockEmailService();

    useCase = new UpdateAppointmentStatusUseCase(appointmentRepository, membershipRepository as any, emailService, 0);

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
      useCase.execute('apt-1', { status: 'Completado' }, 'admin-1', 'Admin')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe completar el turno y marcarlo como pagado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ barberId: 'empleado-1' }));
    appointmentRepository.updateStatus.mockResolvedValue(
      makeAppointment({ status: 'Completado', barberId: 'empleado-1' })
    );

    const result = await useCase.execute('apt-1', { status: 'Completado' }, 'empleado-1', 'Empleado');

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'Completado',
      paymentStatus: 'Pendiente',
      statusHistoryEntry: { status: 'Completado', timestamp: expect.any(Date), actor: 'empleado' },
    }, capturedSession);
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
      paymentStatus: 'Cancelado',
      statusHistoryEntry: { status: 'Cancelado', timestamp: expect.any(Date), actor: 'admin' },
    }, capturedSession);
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
      makeAppointment({ status: 'Confirmado', barberId: 'empleado-1', date: '2020-01-01', startTime: '10:00' })
    );
    appointmentRepository.updateStatus.mockResolvedValue(
      makeAppointment({ status: 'NoShow', barberId: 'empleado-1' })
    );

    const result = await useCase.execute('apt-1', { status: 'NoShow' }, 'empleado-1', 'Empleado');

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'NoShow',
      paymentStatus: 'Cancelado',
      statusHistoryEntry: { status: 'NoShow', timestamp: expect.any(Date), actor: 'empleado' },
    }, capturedSession);
    expect(result.message).toMatch(/NoShow/);
  });

  it('debe fallar NoShow si el turno aun no paso', async () => {
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ status: 'Confirmado', barberId: 'empleado-1', date: '2099-01-01', startTime: '10:00' })
    );

    await expect(
      useCase.execute('apt-1', { status: 'NoShow' }, 'empleado-1', 'Empleado')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar NoShow desde Completado (transicion invalida)', async () => {
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ status: 'Completado', barberId: 'empleado-1' })
    );

    await expect(
      useCase.execute('apt-1', { status: 'NoShow' }, 'empleado-1', 'Empleado')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe rechazar cancelacion con menos de 2h de anticipacion (fecha pasada)', async () => {
    const strictUseCase = new UpdateAppointmentStatusUseCase(appointmentRepository, membershipRepository as any, emailService, 2);
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ status: 'Confirmado', date: '2020-01-01', startTime: '10:00' })
    );

    await expect(
      strictUseCase.execute('apt-1', { status: 'Cancelado' }, 'admin-1', 'Admin')
    ).rejects.toThrow(/anticipación/);
  });

  it('debe permitir cancelacion con suficiente anticipacion (fecha futura)', async () => {
    const strictUseCase = new UpdateAppointmentStatusUseCase(appointmentRepository, membershipRepository as any, emailService, 2);
    appointmentRepository.findById.mockResolvedValue(
      makeAppointment({ status: 'Confirmado', date: '2099-01-01', startTime: '10:00' })
    );
    appointmentRepository.updateStatus.mockResolvedValue(
      makeAppointment({ status: 'Cancelado' })
    );

    const result = await strictUseCase.execute('apt-1', { status: 'Cancelado' }, 'admin-1', 'Admin');

    expect(result.message).toMatch(/Cancelado/);
  });

  describe('autorización', () => {
    it('debe rechazar si un cliente intenta modificar un turno ajeno', async () => {
      appointmentRepository.findById.mockResolvedValue(
        makeAppointment({ clientId: 'client-otro' })
      );

      await expect(
        useCase.execute('apt-1', { status: 'Completado' }, 'client-mio', 'Registrado')
      ).rejects.toThrow(AppError);
    });

    it('debe rechazar si un barbero intenta modificar turno de otro barbero', async () => {
      appointmentRepository.findById.mockResolvedValue(
        makeAppointment({ barberId: 'barber-otro' })
      );

      await expect(
        useCase.execute('apt-1', { status: 'Completado' }, 'barber-mio', 'Empleado')
      ).rejects.toThrow(AppError);
    });

    it('debe permitir si un admin modifica cualquier turno', async () => {
      appointmentRepository.findById.mockResolvedValue(makeAppointment());
      appointmentRepository.updateStatus.mockResolvedValue(makeAppointment({ status: 'Completado' }));

      const result = await useCase.execute('apt-1', { status: 'Completado' }, 'admin-1', 'Admin');

      expect(result.message).toMatch(/Completado/);
    });
  });

  describe('restauración de cupón de membresía', () => {
    it('debe restaurar cupón al cancelar turno con memberPass', async () => {
      const membership = {
        restoreCoupon: jest.fn(),
        remainingCoupons: 3,
        couponsUsed: 1,
        couponsTotal: 4,
      };
      membershipRepository.findActiveByUser.mockResolvedValue(membership);

      appointmentRepository.findById.mockResolvedValue(
        makeAppointment({ paymentMethod: 'memberPass', status: 'Confirmado', clientId: 'client-1' })
      );
      appointmentRepository.updateStatus.mockResolvedValue(
        makeAppointment({ status: 'Cancelado', paymentMethod: 'memberPass', clientId: 'client-1' })
      );

      const result = await useCase.execute('apt-1', { status: 'Cancelado' }, 'admin-1', 'Admin');

      expect(membershipRepository.findActiveByUser).toHaveBeenCalledWith('client-1', capturedSession);
      expect(membership.restoreCoupon).toHaveBeenCalledTimes(1);
      expect(membershipRepository.save).toHaveBeenCalledWith(membership, capturedSession);
      expect(result.message).toMatch(/Cancelado/);
    });

    it('NO debe restaurar cupón al marcar NoShow con memberPass', async () => {
      appointmentRepository.findById.mockResolvedValue(
        makeAppointment({ paymentMethod: 'memberPass', status: 'Confirmado', date: '2020-01-01', startTime: '10:00' })
      );
      appointmentRepository.updateStatus.mockResolvedValue(
        makeAppointment({ status: 'NoShow', paymentMethod: 'memberPass' })
      );

      await useCase.execute('apt-1', { status: 'NoShow' }, 'admin-1', 'Admin');

      expect(membershipRepository.findActiveByUser).not.toHaveBeenCalled();
      expect(membershipRepository.save).not.toHaveBeenCalled();
    });

    it('NO debe restaurar cupón al cancelar turno con método local', async () => {
      appointmentRepository.findById.mockResolvedValue(
        makeAppointment({ paymentMethod: 'local', status: 'Confirmado' })
      );
      appointmentRepository.updateStatus.mockResolvedValue(
        makeAppointment({ status: 'Cancelado', paymentMethod: 'local' })
      );

      await useCase.execute('apt-1', { status: 'Cancelado' }, 'admin-1', 'Admin');

      expect(membershipRepository.findActiveByUser).not.toHaveBeenCalled();
      expect(membershipRepository.save).not.toHaveBeenCalled();
    });

    it('NO debe restaurar cupón al completar turno con memberPass', async () => {
      appointmentRepository.findById.mockResolvedValue(
        makeAppointment({ paymentMethod: 'memberPass', status: 'Confirmado' })
      );
      appointmentRepository.updateStatus.mockResolvedValue(
        makeAppointment({ status: 'Completado', paymentMethod: 'memberPass' })
      );

      await useCase.execute('apt-1', { status: 'Completado' }, 'admin-1', 'Admin');

      expect(membershipRepository.findActiveByUser).not.toHaveBeenCalled();
      expect(membershipRepository.save).not.toHaveBeenCalled();
    });
  });
});

