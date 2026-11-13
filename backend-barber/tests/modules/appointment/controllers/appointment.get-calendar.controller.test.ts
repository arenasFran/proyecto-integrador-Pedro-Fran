import { AppointmentController } from '../../../../src/interface-adapters/controllers/appointment/AppointmentController';
import {
  makeMockAppointmentRepository,
  makeMockBarberRepository,
  makeMockClientRepository,
} from '../../../test-utils/mocks';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';

describe('AppointmentController.getCalendar', () => {
  let appointmentRepository: ReturnType<typeof makeMockAppointmentRepository>;
  let barberRepository: ReturnType<typeof makeMockBarberRepository>;
  let clientRepository: ReturnType<typeof makeMockClientRepository>;
  let controller: AppointmentController;

  const makePrimitive = (overrides: Record<string, unknown> = {}) => ({
    id: 'apt-1',
    barberId: 'barber-1',
    clientId: 'client-1',
    date: '2026-01-10',
    startTime: '10:00',
    ...overrides,
  });

  beforeEach(() => {
    appointmentRepository = makeMockAppointmentRepository();
    barberRepository = makeMockBarberRepository();
    clientRepository = makeMockClientRepository();
    controller = new AppointmentController(
      appointmentRepository as any,
      barberRepository as any,
      clientRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
  });

  it('Admin ve todos los turnos del rango y no envía barberId si no lo pide', async () => {
    appointmentRepository.findAllByDateRange.mockResolvedValue([
      { toPrimitives: () => makePrimitive() },
    ]);
    const req = createMockReq();
    (req as any).user = { _id: 'admin-1', kind: 'Admin' };
    (req as any).query = { dateFrom: '2026-01-10', dateTo: '2026-01-24' };
    const res = createMockRes();

    await controller.getCalendar(req, res);

    expect(appointmentRepository.findAllByDateRange).toHaveBeenCalledWith({
      dateFrom: '2026-01-10',
      dateTo: '2026-01-24',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ appointments: [expect.objectContaining({ id: 'apt-1' })], total: 1 })
    );
  });

  it('Admin puede filtrar por barberId', async () => {
    appointmentRepository.findAllByDateRange.mockResolvedValue([]);
    const req = createMockReq();
    (req as any).user = { _id: 'admin-1', kind: 'Admin' };
    (req as any).query = { dateFrom: '2026-01-10', dateTo: '2026-01-24', barberId: 'barber-2' };
    const res = createMockRes();

    await controller.getCalendar(req, res);

    expect(appointmentRepository.findAllByDateRange).toHaveBeenCalledWith({
      dateFrom: '2026-01-10',
      dateTo: '2026-01-24',
      barberId: 'barber-2',
    });
  });

  it('Empleado queda forzado a su propio barberId aunque mande otro', async () => {
    appointmentRepository.findAllByDateRange.mockResolvedValue([]);
    const req = createMockReq();
    (req as any).user = { _id: 'barber-propio', kind: 'Empleado' };
    (req as any).query = { dateFrom: '2026-01-10', dateTo: '2026-01-24', barberId: 'barber-ajeno' };
    const res = createMockRes();

    await controller.getCalendar(req, res);

    expect(appointmentRepository.findAllByDateRange).toHaveBeenCalledWith({
      dateFrom: '2026-01-10',
      dateTo: '2026-01-24',
      barberId: 'barber-propio',
    });
  });

  it('rechaza con 403 a usuarios que no son staff', async () => {
    const req = createMockReq();
    (req as any).user = { _id: 'client-1', kind: 'Registrado' };
    (req as any).query = { dateFrom: '2026-01-10', dateTo: '2026-01-24' };
    const res = createMockRes();

    await controller.getCalendar(req, res);

    expect(appointmentRepository.findAllByDateRange).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('enriquece con datos de barbero y cliente cuando se piden', async () => {
    appointmentRepository.findAllByDateRange.mockResolvedValue([
      { toPrimitives: () => makePrimitive() },
    ]);
    barberRepository.findAllBarbers.mockResolvedValue([
      { id: 'barber-1', name: 'Carlos', lastname: 'Barbero', photoUrl: 'barber.jpg' } as any,
    ]);
    clientRepository.findByIds.mockResolvedValue([
      { id: 'client-1', photoUrl: 'client.jpg', registeredAt: new Date('2026-01-01') } as any,
    ]);
    const req = createMockReq();
    (req as any).user = { _id: 'admin-1', kind: 'Admin' };
    (req as any).query = {
      dateFrom: '2026-01-10',
      dateTo: '2026-01-24',
      includeBarber: 'true',
      includeClient: 'true',
    };
    const res = createMockRes();

    await controller.getCalendar(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        appointments: [
          expect.objectContaining({
            barberName: 'Carlos Barbero',
            barberPhotoUrl: 'barber.jpg',
            clientPhotoUrl: 'client.jpg',
          }),
        ],
      })
    );
  });

  it('devuelve 500 si el repositorio falla', async () => {
    appointmentRepository.findAllByDateRange.mockRejectedValue(new Error('boom'));
    const req = createMockReq();
    (req as any).user = { _id: 'admin-1', kind: 'Admin' };
    (req as any).query = { dateFrom: '2026-01-10', dateTo: '2026-01-24' };
    const res = createMockRes();

    await controller.getCalendar(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener el calendario de turnos' });
  });
});
