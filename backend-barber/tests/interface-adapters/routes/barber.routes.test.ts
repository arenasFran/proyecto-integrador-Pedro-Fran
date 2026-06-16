jest.mock('../../../src/interface-adapters/middlewares/auth.middleware', () => ({
  authorize: () => (_req: any, _res: any, next: any) => next(),
  authorizeSelfOrKinds: () => (_req: any, _res: any, next: any) => next(),
}));

import request from 'supertest';
import express from 'express';
import { createBarberRouter } from '../../../src/interface-adapters/routes/barber.routes';
import { BarberController } from '../../../src/interface-adapters/controllers/barber/BarberController';
import { CreateBarberUseCase } from '../../../src/application/use-cases/barber/CreateBarberUseCase';
import { DeactivateBarberUseCase } from '../../../src/application/use-cases/barber/DeactivateBarberUseCase';
import { GetAllBarbersUseCase } from '../../../src/application/use-cases/barber/GetAllBarbersUseCase';
import { GetBarberByIdUseCase } from '../../../src/application/use-cases/barber/GetBarberByIdUseCase';
import { UpdateBarberUseCase } from '../../../src/application/use-cases/barber/UpdateBarberUseCase';
import { DeleteBarberUseCase } from '../../../src/application/use-cases/barber/DeleteBarberUseCase';
import { GetBarberScheduleUseCase } from '../../../src/application/use-cases/barber/GetBarberScheduleUseCase';
import { UpdateBarberScheduleUseCase } from '../../../src/application/use-cases/barber/UpdateBarberScheduleUseCase';
import { GetAvailableSlotsUseCase } from '../../../src/application/use-cases/barber/GetAvailableSlotsUseCase';

const createScheduleDay = () => ({
  startTime: '09:00',
  endTime: '18:00',
  breaks: [],
});

const createSchedule = () => ({
  monday: createScheduleDay(),
  tuesday: createScheduleDay(),
  wednesday: createScheduleDay(),
  thursday: createScheduleDay(),
  friday: createScheduleDay(),
  saturday: createScheduleDay(),
  sunday: createScheduleDay(),
});

const makeBarberResponse = () => ({
  id: 'barber-1',
  name: 'Juan',
  lastname: 'Perez',
  email: 'barber@example.com',
  phone: '123456789',
  kind: 'Empleado' as const,
  services: [] as string[],
  isActive: true,
  slotDuration: 30,
  maxAdvanceDays: 30,
  schedule: createSchedule(),
  photoUrl: null,
});

describe('Barber routes', () => {
  let app: express.Application;

  let createBarber: jest.Mocked<CreateBarberUseCase>;
  let getAllBarbers: jest.Mocked<GetAllBarbersUseCase>;
  let getBarberById: jest.Mocked<GetBarberByIdUseCase>;
  let updateBarber: jest.Mocked<UpdateBarberUseCase>;
  let deleteBarber: jest.Mocked<DeleteBarberUseCase>;
  let deactivateBarber: jest.Mocked<DeactivateBarberUseCase>;
  let getBarberSchedule: jest.Mocked<GetBarberScheduleUseCase>;
  let updateBarberSchedule: jest.Mocked<UpdateBarberScheduleUseCase>;
  let getAvailableSlots: jest.Mocked<GetAvailableSlotsUseCase>;

  let authUserKind: string;

  const authenticate: express.RequestHandler = (req, _res, next) => {
    (req as any).user = { _id: 'user-1', email: 'test@test.com', kind: authUserKind };
    next();
  };

  beforeEach(() => {
    authUserKind = 'Empleado';
    createBarber = { execute: jest.fn() } as unknown as jest.Mocked<CreateBarberUseCase>;
    getAllBarbers = { execute: jest.fn() } as unknown as jest.Mocked<GetAllBarbersUseCase>;
    getBarberById = { execute: jest.fn() } as unknown as jest.Mocked<GetBarberByIdUseCase>;
    updateBarber = { execute: jest.fn() } as unknown as jest.Mocked<UpdateBarberUseCase>;
    deleteBarber = { execute: jest.fn() } as unknown as jest.Mocked<DeleteBarberUseCase>;
    deactivateBarber = { execute: jest.fn() } as unknown as jest.Mocked<DeactivateBarberUseCase>;
    getBarberSchedule = { execute: jest.fn() } as unknown as jest.Mocked<GetBarberScheduleUseCase>;
    updateBarberSchedule = { execute: jest.fn() } as unknown as jest.Mocked<UpdateBarberScheduleUseCase>;
    getAvailableSlots = { execute: jest.fn() } as unknown as jest.Mocked<GetAvailableSlotsUseCase>;

    const controller = new BarberController(
      createBarber,
      getAllBarbers,
      getBarberById,
      updateBarber,
      deleteBarber,
      deactivateBarber,
      getBarberSchedule,
      updateBarberSchedule,
      getAvailableSlots
    );

    app = express();
    app.use(express.json());
    app.use('/api/barbers', createBarberRouter({ barberController: controller, authenticate }));
  });

  it('GET /api/barbers como Admin debe devolver todos los barberos', async () => {
    authUserKind = 'Admin';

    const admin = { ...makeBarberResponse(), id: 'admin-1', kind: 'Admin' as const };
    const inactive = { ...makeBarberResponse(), id: 'inactive-1', isActive: false };
    const active = makeBarberResponse();
    getAllBarbers.execute.mockResolvedValue([admin, inactive, active]);

    const response = await request(app).get('/api/barbers');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ barbers: [admin, inactive, active] });
  });

  it('GET /api/barbers como Empleado debe filtrar Admins e inactivos', async () => {
    const admin = { ...makeBarberResponse(), id: 'admin-1', kind: 'Admin' as const };
    const inactive = { ...makeBarberResponse(), id: 'inactive-1', isActive: false };
    const active = makeBarberResponse();
    getAllBarbers.execute.mockResolvedValue([admin, inactive, active]);

    const response = await request(app).get('/api/barbers');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ barbers: [active] });
  });

  it('GET /api/barbers debe devolver la lista de barberos (default Empleado)', async () => {
    getAllBarbers.execute.mockResolvedValue([makeBarberResponse()]);

    const response = await request(app).get('/api/barbers');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ barbers: [makeBarberResponse()] });
  });

  it('GET /api/barbers debe devolver 500 si falla el caso de uso', async () => {
    getAllBarbers.execute.mockRejectedValue(new Error('boom'));

    const response = await request(app).get('/api/barbers');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Error al obtener barberos' });
  });

  it('POST /api/barbers debe crear un barbero con datos validos', async () => {
    createBarber.execute.mockResolvedValue(makeBarberResponse());

    const response = await request(app)
      .post('/api/barbers')
      .send({
        email: 'new@example.com',
        password: '123456',
        name: 'Juan',
        lastname: 'Perez',
        phone: '123456789',
        services: ['corte'],
        schedule: createSchedule(),
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(makeBarberResponse());
  });

  it('POST /api/barbers debe devolver 400 si faltan campos requeridos', async () => {
    const response = await request(app)
      .post('/api/barbers')
      .send({ email: 'incomplete' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('GET /api/barbers/:id debe devolver un barbero por id', async () => {
    getBarberById.execute.mockResolvedValue(makeBarberResponse());

    const response = await request(app).get('/api/barbers/barber-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(makeBarberResponse());
  });

  it('GET /api/barbers/:id debe devolver 404 si no existe', async () => {
    getBarberById.execute.mockRejectedValue({ message: 'Barbero no encontrado.', statusCode: 404 });

    const response = await request(app).get('/api/barbers/inexistente');

    expect(response.status).toBe(500);
  });

  it('PUT /api/barbers/:id debe actualizar un barbero', async () => {
    const updated = { ...makeBarberResponse(), name: 'Pedro' };
    updateBarber.execute.mockResolvedValue(updated);

    const response = await request(app)
      .put('/api/barbers/barber-1')
      .send({ name: 'Pedro' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(updated);
  });

  it('DELETE /api/barbers/:id debe eliminar un barbero', async () => {
    deleteBarber.execute.mockResolvedValue({ message: 'Barbero eliminado' });

    const response = await request(app).delete('/api/barbers/barber-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Barbero eliminado' });
  });

  it('GET /api/barbers/:id/slots debe devolver slots con fecha valida', async () => {
    const slotsResult = { date: '2026-06-15', slots: ['09:00', '09:30'] };
    getAvailableSlots.execute.mockResolvedValue(slotsResult);

    const response = await request(app).get('/api/barbers/barber-1/slots?date=2026-06-15');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(slotsResult);
  });

  it('GET /api/barbers/:id/slots debe devolver 400 con fecha invalida', async () => {
    const response = await request(app).get('/api/barbers/barber-1/slots?date=invalida');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('GET /api/barbers/:id/schedule debe devolver el horario', async () => {
    const schedule = createSchedule();
    getBarberSchedule.execute.mockResolvedValue(schedule);

    const response = await request(app).get('/api/barbers/barber-1/schedule');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ schedule });
  });

  it('PATCH /api/barbers/:id/deactivate debe desactivar un barbero', async () => {
    deactivateBarber.execute.mockResolvedValue({ message: 'Barbero desactivado' });

    const response = await request(app).patch('/api/barbers/barber-1/deactivate');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Barbero desactivado' });
  });

  it('PUT /api/barbers/:id/schedule debe actualizar el horario', async () => {
    const schedule = createSchedule();
    updateBarberSchedule.execute.mockResolvedValue(schedule);

    const response = await request(app)
      .put('/api/barbers/barber-1/schedule')
      .send(schedule);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ schedule });
  });
});
