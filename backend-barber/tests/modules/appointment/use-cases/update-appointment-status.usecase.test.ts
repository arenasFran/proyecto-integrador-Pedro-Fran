import { UpdateAppointmentStatusUseCase } from '../../../../src/application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IAppointmentRepository } from '../../../../src/domain/repositories/IAppointmentRepository';
import { Appointment, AppointmentProps } from '../../../../src/domain/entities/Appointment';

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
      create: jest.fn(),
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

  it('debe completar el turno', async () => {
    appointmentRepository.findById.mockResolvedValue(makeAppointment());
    appointmentRepository.updateStatus.mockResolvedValue(
      makeAppointment({ status: 'Completado' })
    );

    const result = await useCase.execute('apt-1', { status: 'Completado' });

    expect(appointmentRepository.updateStatus).toHaveBeenCalledWith('apt-1', {
      status: 'Completado',
    });
    expect(result.message).toMatch(/Completado/);
  });
});
