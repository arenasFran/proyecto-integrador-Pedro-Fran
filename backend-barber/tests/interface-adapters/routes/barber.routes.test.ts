jest.mock('../../../src/interface-adapters/middlewares/auth.middleware', () => ({
  authorize: () => (_req: any, _res: any, next: any) => next(),
  authorizeSelfOrKinds: () => (_req: any, _res: any, next: any) => next(),
}));

import request from 'supertest';
import express from 'express';
import { createBarberRouter } from '../../../src/interface-adapters/routes/barber.routes';
import { BarberController } from '../../../src/interface-adapters/controllers/barber/BarberController';
import { CreateEmployeeBarberUseCase } from '../../../src/application/use-cases/barber/CreateEmployeeBarberUseCase';
import { GetAllEmployeesUseCase } from '../../../src/application/use-cases/barber/GetAllEmployeesUseCase';
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
  specialties: [] as string[],
  isActive: true,
  slotDuration: 30,
  schedule: createSchedule(),
  photoUrl: null,
});

describe('Barber routes', () => {
  let app: express.Application;

  let createBarber: jest.Mocked<CreateEmployeeBarberUseCase>;
  let getAllBarbers: jest.Mocked<GetAllEmployeesUseCase>;
  let getBarberById: jest.Mocked<GetBarberByIdUseCase>;
  let updateBarber: jest.Mocked<UpdateBarberUseCase>;
  let deleteBarber: jest.Mocked<DeleteBarberUseCase>;
  let getBarberSchedule: jest.Mocked<GetBarberScheduleUseCase>;
  let updateBarberSchedule: jest.Mocked<UpdateBarberScheduleUseCase>;
  let getAvailableSlots: jest.Mocked<GetAvailableSlotsUseCase>;

  const authenticate: express.RequestHandler = (_req, _res, next) => next();

  beforeEach(() => {
    createBarber = { execute: jest.fn() } as unknown as jest.Mocked<CreateEmployeeBarberUseCase>;
    getAllBarbers = { execute: jest.fn() } as unknown as jest.Mocked<GetAllEmployeesUseCase>;
    getBarberById = { execute: jest.fn() } as unknown as jest.Mocked<GetBarberByIdUseCase>;
    updateBarber = { execute: jest.fn() } as unknown as jest.Mocked<UpdateBarberUseCase>;
    deleteBarber = { execute: jest.fn() } as unknown as jest.Mocked<DeleteBarberUseCase>;
    getBarberSchedule = { execute: jest.fn() } as unknown as jest.Mocked<GetBarberScheduleUseCase>;
    updateBarberSchedule = { execute: jest.fn() } as unknown as jest.Mocked<UpdateBarberScheduleUseCase>;
    getAvailableSlots = { execute: jest.fn() } as unknown as jest.Mocked<GetAvailableSlotsUseCase>;

    const controller = new BarberController(
      createBarber,
      getAllBarbers,
      getBarberById,
      updateBarber,
      deleteBarber,
      getBarberSchedule,
      updateBarberSchedule,
      getAvailableSlots
    );

    app = express();
    app.use(express.json());
    app.use('/api/barbers', createBarberRouter({ barberController: controller, authenticate }));
  });

  it('GET /api/barbers debe devolver la lista de barberos', async () => {
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
        specialties: ['corte'],
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
