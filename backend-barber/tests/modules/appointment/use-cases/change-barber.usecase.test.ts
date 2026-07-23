import mongoose from 'mongoose';
import { ChangeBarberUseCase } from '../../../../src/application/use-cases/appointment/ChangeBarberUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';
import { makeMockAppointmentRepository, makeMockBarberRepository } from '../../../test-utils/mocks';

describe('ChangeBarberUseCase', () => {
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

  const barberDirectory: Record<string, { id: string; name: string; lastname: string; isActive: boolean }> = {
    'barber-1': { id: 'barber-1', name: 'Carlos', lastname: 'Ruiz', isActive: true },
    'barber-2': { id: 'barber-2', name: 'Marta', lastname: 'Diaz', isActive: true },
    'barber-inactivo': { id: 'barber-inactivo', name: 'Luis', lastname: 'Paz', isActive: false },
    'admin-1': { id: 'admin-1', name: 'Ana', lastname: 'Gomez', isActive: true },
  };

  let appointmentRepository: ReturnType<typeof makeMockAppointmentRepository>;
  let barberRepository: ReturnType<typeof makeMockBarberRepository>;
  let useCase: ChangeBarberUseCase;
  let capturedSession: any;

  beforeEach(() => {
    appointmentRepository = makeMockAppointmentRepository();
    barberRepository = makeMockBarberRepository();
    barberRepository.findBarberById.mockImplementation((id: string) =>
      Promise.resolve(barberDirectory[id] ?? null)
    );
    appointmentRepository.findByBarberAndDate.mockResolvedValue([]);
    appointmentRepository.update.mockResolvedValue(makeAppointment({ barberId: 'barber-2' }));
    appointmentRepository.updateStatus.mockResolvedValue(makeAppointment({ barberId: 'barber-2' }));

    useCase = new ChangeBarberUseCase(appointmentRepository as any, barberRepository as any);

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

  it('debe rechazar si quien pide el cambio no es Admin ni Empleado', async () => {
    await expect(
      useCase.execute('apt-1', 'barber-2', 'client-1', 'Registrado')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el turno no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('apt-1', 'barber-2', 'admin-1', 'Admin')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el turno no está Confirmado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ status: 'Cancelado' }));

    await expect(
      useCase.execute('apt-1', 'barber-2', 'admin-1', 'Admin')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el nuevo barbero no existe', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());

    await expect(
      useCase.execute('apt-1', 'barber-inexistente', 'admin-1', 'Admin')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el nuevo barbero no está activo', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());

    await expect(
      useCase.execute('apt-1', 'barber-inactivo', 'admin-1', 'Admin')
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el nuevo barbero ya tiene un turno superpuesto', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    appointmentRepository.findByBarberAndDate.mockResolvedValue([
      makeAppointment({ id: 'apt-otro', startTime: '10:30', endTime: '11:20' }),
    ]);

    await expect(
      useCase.execute('apt-1', 'barber-2', 'admin-1', 'Admin')
    ).rejects.toThrow(/ya tiene un turno/);
  });

  it('debe cambiar el barbero dentro de una transacción y confirmarla', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());

    const result = await useCase.execute('apt-1', 'barber-2', 'admin-1', 'Admin');

    expect(capturedSession.startTransaction).toHaveBeenCalledTimes(1);
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      'apt-1',
      { barberId: 'barber-2', version: 0 },
      capturedSession
    );
    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(
      'apt-1',
      {
        statusHistoryEntry: {
          status: 'Confirmado',
          timestamp: expect.any(Date),
          actor: 'Ana Gomez (barbero: Carlos Ruiz → Marta Diaz)',
        },
      },
      capturedSession
    );
    expect(capturedSession.commitTransaction).toHaveBeenCalledTimes(1);
    expect(capturedSession.abortTransaction).not.toHaveBeenCalled();
    expect(capturedSession.endSession).toHaveBeenCalledTimes(1);
    expect(result.message).toMatch(/Carlos Ruiz a Marta Diaz/);
  });

  it('debe abortar la transacción si falla la segunda escritura', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    appointmentRepository.updateStatus.mockRejectedValue(new Error('fallo de red'));

    await expect(
      useCase.execute('apt-1', 'barber-2', 'admin-1', 'Admin')
    ).rejects.toThrow('fallo de red');

    expect(capturedSession.abortTransaction).toHaveBeenCalledTimes(1);
    expect(capturedSession.commitTransaction).not.toHaveBeenCalled();
    expect(capturedSession.endSession).toHaveBeenCalledTimes(1);
  });

  it('no debe hacer nada si el turno ya tiene ese barbero asignado', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment({ barberId: 'barber-1' }));

    const result = await useCase.execute('apt-1', 'barber-1', 'admin-1', 'Admin');

    expect(result.message).toMatch(/ya tiene ese barbero/);
    expect(mongoose.startSession).not.toHaveBeenCalled();
  });
});
