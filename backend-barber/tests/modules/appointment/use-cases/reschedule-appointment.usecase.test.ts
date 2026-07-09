import mongoose from 'mongoose';
import { RescheduleAppointmentUseCase } from '../../../../src/application/use-cases/appointment/RescheduleAppointmentUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { IEmailService } from '../../../../src/application/ports/IEmailService';
import { Barber, BarberProps, BarberSchedule } from '../../../../src/domain/entities/Barber';
import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';
import { Service } from '../../../../src/domain/entities/Service';
import {
  makeMockAppointmentRepository,
  makeMockBarberRepository,
  makeMockServiceRepository,
  makeMockEmailService,
  makeMockBarberBlockRepository,
} from '../../../test-utils/mocks';

describe('RescheduleAppointmentUseCase', () => {
  const createScheduleDay = () => ({
    startTime: '09:00',
    endTime: '17:00',
    breaks: [],
  });

  const createSchedule = (): BarberSchedule => ({
    monday: createScheduleDay(),
    tuesday: createScheduleDay(),
    wednesday: createScheduleDay(),
    thursday: createScheduleDay(),
    friday: createScheduleDay(),
    saturday: createScheduleDay(),
    sunday: createScheduleDay(),
  });

  const TEST_SERVICE_ID = new mongoose.Types.ObjectId().toString();

  const makeBarber = (overrides?: Partial<BarberProps>) => {
    const base: BarberProps = {
      id: 'barber-1',
      email: 'barber@example.com',
      name: 'Carlos',
      lastname: 'Lopez',
      phone: '098765432',
      kind: 'Empleado',
      services: [],
      isActive: true,
      slotDuration: 30,
      maxAdvanceDays: 99999,
      schedule: createSchedule(),
      passwordHash: 'hash',
    };
    return Barber.create({ ...base, ...overrides });
  };

  const makeService = () =>
    Service.create({
      id: TEST_SERVICE_ID,
      name: 'Corte de pelo',
      description: 'Incluye barba/cejas/lavado/bebida a elección',
      price: 490,
      imageUrl: 'https://placehold.co/400x300?text=Corte+de+pelo',
      status: 'active',
    });

  const makeAppointment = (overrides?: Partial<AppointmentProps>) => {
    const base: AppointmentProps = {
      id: 'apt-1',
      barberId: 'barber-1',
      clientId: 'client-1',
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientPhone: '123456789',
      serviceId: TEST_SERVICE_ID,
      serviceName: 'Corte de pelo',
      servicePrice: 490,
      serviceDuration: 30,
      date: '2099-01-01',
      startTime: '10:00',
      endTime: '10:30',
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
  let barberRepository: ReturnType<typeof makeMockBarberRepository>;
  let serviceRepository: ReturnType<typeof makeMockServiceRepository>;
  let blockRepository: ReturnType<typeof makeMockBarberBlockRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let useCase: RescheduleAppointmentUseCase;
  let capturedSession: any;

  const dto = { date: '2099-06-15', startTime: '11:00', barberId: 'barber-1' };

  const setupHappyPathMocks = () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    barberRepository.findBarberById.mockResolvedValue(makeBarber());
    serviceRepository.findByIdIncludingInactive.mockResolvedValue(makeService());
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
    blockRepository.findByBarberAndDate.mockResolvedValue([]);
    appointmentRepository.update.mockResolvedValue(
      makeAppointment({ date: dto.date, startTime: dto.startTime, endTime: '11:30', version: 1 })
    );
    appointmentRepository.updateStatus.mockResolvedValue(makeAppointment());
  };

  beforeEach(() => {
    appointmentRepository = makeMockAppointmentRepository();
    barberRepository = makeMockBarberRepository();
    serviceRepository = makeMockServiceRepository();
    blockRepository = makeMockBarberBlockRepository();
    emailService = makeMockEmailService();

    useCase = new RescheduleAppointmentUseCase(
      appointmentRepository as any,
      barberRepository as any,
      serviceRepository as any,
      emailService,
      blockRepository as any
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

  it('debe reagendar exitosamente y confirmar la transacción', async () => {
    setupHappyPathMocks();

    const result = await useCase.execute('apt-1', dto, 'client-1', 'Cliente');

    expect(capturedSession.startTransaction).toHaveBeenCalled();
    expect(capturedSession.commitTransaction).toHaveBeenCalled();
    expect(capturedSession.abortTransaction).not.toHaveBeenCalled();
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      'apt-1',
      expect.objectContaining({ date: dto.date, startTime: dto.startTime }),
      capturedSession
    );
    expect(result.message).toMatch(/reagendado/);
  });

  it('debe fallar si el turno no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('apt-1', dto, 'client-1', 'Cliente')).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el turno está en un estado terminal (RN09)', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Completado' }));

    await expect(useCase.execute('apt-1', dto, 'client-1', 'Cliente')).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el usuario no es dueño, admin ni el barbero asignado (RN20)', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ clientId: 'client-1' }));

    await expect(
      useCase.execute('apt-1', dto, 'otro-cliente', 'Cliente')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar por colisión de horario (RN04) y abortar la transacción', async () => {
    setupHappyPathMocks();
    appointmentRepository.findByBarberAndDate.mockResolvedValue([
      makeAppointment({
        id: 'apt-2',
        date: dto.date,
        startTime: '11:00',
        endTime: '11:30',
        status: 'Confirmado',
      }),
    ]);

    await expect(useCase.execute('apt-1', dto, 'client-1', 'Cliente')).rejects.toBeInstanceOf(AppError);
    expect(capturedSession.abortTransaction).toHaveBeenCalled();
    expect(capturedSession.commitTransaction).not.toHaveBeenCalled();
  });

  it('debe fallar por colisión con un bloqueo del barbero (RN04b) y abortar la transacción', async () => {
    setupHappyPathMocks();
    blockRepository.findByBarberAndDate.mockResolvedValue([
      { id: 'block-1', barberId: 'barber-1', date: dto.date, startTime: '11:00', endTime: '11:30' },
    ]);

    await expect(useCase.execute('apt-1', dto, 'client-1', 'Cliente')).rejects.toBeInstanceOf(AppError);
    expect(capturedSession.abortTransaction).toHaveBeenCalled();
    expect(capturedSession.commitTransaction).not.toHaveBeenCalled();
  });

  it('debe traducir el conflicto de índice único del repositorio en un 409 amigable y abortar', async () => {
    setupHappyPathMocks();
    appointmentRepository.update.mockRejectedValue(
      new AppError('El horario seleccionado ya está ocupado.', 409)
    );

    await expect(useCase.execute('apt-1', dto, 'client-1', 'Cliente')).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(capturedSession.abortTransaction).toHaveBeenCalled();
    expect(capturedSession.commitTransaction).not.toHaveBeenCalled();
  });

  it('debe fallar si el turno fue modificado por otro usuario (conflicto de versión) y abortar', async () => {
    setupHappyPathMocks();
    appointmentRepository.update.mockResolvedValue(null);

    await expect(useCase.execute('apt-1', dto, 'client-1', 'Cliente')).rejects.toBeInstanceOf(AppError);
    expect(capturedSession.abortTransaction).toHaveBeenCalled();
    expect(capturedSession.commitTransaction).not.toHaveBeenCalled();
  });
});
