import mongoose from 'mongoose';
import { DeleteBarberUseCase } from '../../../../src/application/use-cases/barber/DeleteBarberUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';
import {
  makeMockBarberRepository,
  makeMockAppointmentRepository,
  makeMockTempLockRepository,
  makeMockBarberBlockRepository,
  makeMockEmailService,
  makeMockMembershipRepository,
} from '../../../test-utils/mocks';

describe('DeleteBarberUseCase', () => {
  const makeAppointment = (overrides?: Partial<AppointmentProps>) => {
    const base: AppointmentProps = {
      id: 'apt-1',
      barberId: 'barber-1',
      clientId: 'client-1',
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientPhone: '123456789',
      clientEmail: 'juan@example.com',
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

  let barberRepository: ReturnType<typeof makeMockBarberRepository>;
  let appointmentRepository: ReturnType<typeof makeMockAppointmentRepository>;
  let tempLockRepository: ReturnType<typeof makeMockTempLockRepository>;
  let blockRepository: ReturnType<typeof makeMockBarberBlockRepository>;
  let emailService: ReturnType<typeof makeMockEmailService>;
  let membershipRepository: ReturnType<typeof makeMockMembershipRepository>;
  let useCase: DeleteBarberUseCase;
  let capturedSession: any;

  beforeEach(() => {
    barberRepository = makeMockBarberRepository();
    barberRepository.findBarberById.mockResolvedValue({ id: 'barber-1', name: 'Carlos', lastname: 'Gomez' });
    appointmentRepository = makeMockAppointmentRepository();
    tempLockRepository = makeMockTempLockRepository();
    blockRepository = makeMockBarberBlockRepository();
    emailService = makeMockEmailService();
    membershipRepository = makeMockMembershipRepository();
    membershipRepository.findActiveByUser.mockResolvedValue(null);

    useCase = new DeleteBarberUseCase(
      barberRepository as any,
      appointmentRepository as any,
      tempLockRepository as any,
      blockRepository as any,
      emailService,
      membershipRepository as any
    );

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

  it('debe fallar si el barbero no existe', async () => {
    barberRepository.findBarberById.mockResolvedValue(null);

    await expect(useCase.execute('barber-1')).rejects.toBeInstanceOf(AppError);
  });

  it('debe restaurar el cupón de membresía al cancelar un turno confirmado pagado con memberPass', async () => {
    const membership = {
      id: 'membership-1',
      restoreCoupon: jest.fn(),
    };
    membershipRepository.findActiveByUser.mockResolvedValue(membership);
    appointmentRepository.findMany.mockResolvedValue({
      data: [makeAppointment({ paymentMethod: 'memberPass', status: 'Confirmado' })],
      total: 1, page: 1, totalPages: 1, limit: 100,
    } as any);
    appointmentRepository.updateStatus.mockResolvedValue(makeAppointment({ status: 'Cancelado' }));

    await useCase.execute('barber-1');

    expect(membershipRepository.findActiveByUser).toHaveBeenCalledWith('client-1', capturedSession);
    expect(membership.restoreCoupon).toHaveBeenCalledTimes(1);
    expect(membershipRepository.incrementCouponsUsed).toHaveBeenCalledWith('membership-1', -1, capturedSession);
  });

  it('NO debe restaurar el cupón si el turno se pagó con método local', async () => {
    appointmentRepository.findMany.mockResolvedValue({
      data: [makeAppointment({ paymentMethod: 'local', status: 'Confirmado' })],
      total: 1, page: 1, totalPages: 1, limit: 100,
    } as any);
    appointmentRepository.updateStatus.mockResolvedValue(makeAppointment({ status: 'Cancelado' }));

    await useCase.execute('barber-1');

    expect(membershipRepository.findActiveByUser).not.toHaveBeenCalled();
    expect(membershipRepository.incrementCouponsUsed).not.toHaveBeenCalled();
  });

  it('NO debe tocar turnos que no están Confirmado', async () => {
    appointmentRepository.findMany.mockResolvedValue({
      data: [makeAppointment({ paymentMethod: 'memberPass', status: 'Completado' })],
      total: 1, page: 1, totalPages: 1, limit: 100,
    } as any);

    await useCase.execute('barber-1');

    expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    expect(membershipRepository.incrementCouponsUsed).not.toHaveBeenCalled();
  });
});
