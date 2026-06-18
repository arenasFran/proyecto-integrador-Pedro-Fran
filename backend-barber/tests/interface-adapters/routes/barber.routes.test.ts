jest.mock('../../../src/interface-adapters/middlewares/auth.middleware', () => ({
  authorize: () => (_req: any, _res: any, next: any) => next(),
  authorizeSelfOrKinds: () => (_req: any, _res: any, next: any) => next(),
}));

import request from 'supertest';
import express from 'express';
import { createBarberRouter } from '../../../src/interface-adapters/routes/barber.routes';
import { BarberController } from '../../../src/interface-adapters/controllers/barber/BarberController';
import { GetAvailableSlotsUseCase } from '../../../src/application/use-cases/barber/GetAvailableSlotsUseCase';
import { Barber, BarberProps, BarberSchedule } from '../../../src/domain/entities/Barber';
import { makeMockBarberRepository, makeMockUserRepository, makeMockAppointmentRepository, makeMockTempLockRepository } from '../../test-utils/mocks';

const createScheduleDay = () => ({
  startTime: '09:00',
  endTime: '18:00',
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

const makeBarberEntity = (overrides?: Partial<BarberProps>) => {
  const base: BarberProps = {
    id: 'barber-1',
    email: 'barber@example.com',
    name: 'Juan',
    lastname: 'Perez',
    phone: '123456789',
    kind: 'Empleado' as const,
    services: [],
    age: undefined,
    photoUrl: null,
    isActive: true,
    slotDuration: 30,
    maxAdvanceDays: 30,
    schedule: createSchedule(),
    passwordHash: 'hash',
  };
  return Barber.create({ ...base, ...overrides });
};

const toResponse = (barber: Barber) => ({
  id: barber.id,
  name: barber.name,
  lastname: barber.lastname,
  email: barber.email,
  phone: barber.phone,
  kind: barber.kind,
  services: barber.services,
  age: barber.age,
  photoUrl: barber.photoUrl ?? null,
  isActive: barber.isActive,
  slotDuration: barber.slotDuration,
  maxAdvanceDays: barber.maxAdvanceDays,
  schedule: barber.schedule as BarberSchedule,
});

describe('Barber routes', () => {
  let app: express.Application;

  let barberRepository: ReturnType<typeof makeMockBarberRepository>;
  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let appointmentRepository: ReturnType<typeof makeMockAppointmentRepository>;
  let tempLockRepository: ReturnType<typeof makeMockTempLockRepository>;
  let passwordHasher: { hash: jest.Mock; compare: jest.Mock };
  let emailService: { sendMail: jest.Mock };
  let getAvailableSlots: jest.Mocked<GetAvailableSlotsUseCase>;

  let authUserKind: string;

  const authenticate: express.RequestHandler = (req, _res, next) => {
    (req as any).user = { _id: 'user-1', email: 'test@test.com', kind: authUserKind };
    next();
  };

  beforeEach(() => {
    authUserKind = 'Empleado';
    barberRepository = makeMockBarberRepository();
    userRepository = makeMockUserRepository();
    appointmentRepository = makeMockAppointmentRepository();
    tempLockRepository = makeMockTempLockRepository();
    passwordHasher = { hash: jest.fn(), compare: jest.fn() };
    emailService = { sendMail: jest.fn().mockResolvedValue(undefined) };
    getAvailableSlots = { execute: jest.fn() } as unknown as jest.Mocked<GetAvailableSlotsUseCase>;

    const controller = new BarberController(
      barberRepository,
      userRepository,
      appointmentRepository,
      tempLockRepository,
      passwordHasher as any,
      emailService as any,
      getAvailableSlots
    );

    app = express();
    app.use(express.json());
    app.use('/api/barbers', createBarberRouter({ barberController: controller, authenticate }));
  });

  it('GET /api/barbers como Admin debe devolver todos los barberos', async () => {
    authUserKind = 'Admin';

    const admin = makeBarberEntity({ id: 'admin-1', kind: 'Admin' as const, email: 'admin@test.com' });
    const inactive = makeBarberEntity({ id: 'inactive-1', isActive: false, email: 'inactive@test.com' });
    const active = makeBarberEntity();
    barberRepository.findAllBarbers.mockResolvedValue([admin, inactive, active]);

    const response = await request(app).get('/api/barbers');

    expect(response.status).toBe(200);
    expect(response.body.barbers).toHaveLength(3);
  });

  it('GET /api/barbers debe devolver 500 si falla el repositorio', async () => {
    barberRepository.findAllBarbers.mockRejectedValue(new Error('boom'));

    const response = await request(app).get('/api/barbers');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Error al obtener barberos' });
  });

  it('GET /api/barbers/:id debe devolver un barbero por id', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarberEntity());

    const response = await request(app).get('/api/barbers/barber-1');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 'barber-1', name: 'Juan' });
  });

  it('GET /api/barbers/:id debe devolver 404 si no existe', async () => {
    barberRepository.findBarberById.mockResolvedValue(null);

    const response = await request(app).get('/api/barbers/inexistente');

    expect(response.status).toBe(404);
  });

  it('GET /api/barbers/:id/slots debe devolver slots con fecha valida', async () => {
    const slotsResult = { date: '2026-06-15', slots: ['09:00', '09:30'] };
    getAvailableSlots.execute.mockResolvedValue(slotsResult);

    const response = await request(app).get('/api/barbers/barber-1/slots?date=2026-06-15');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(slotsResult);
  });

  it('GET /api/barbers/:id/slots debe devolver 400 con fecha invalida', async () => {
    getAvailableSlots.execute.mockRejectedValue({ message: 'Fecha inválida. Formato esperado: YYYY-MM-DD.', statusCode: 400 });

    const response = await request(app).get('/api/barbers/barber-1/slots?date=invalida');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('GET /api/barbers/:id/schedule debe devolver el horario', async () => {
    barberRepository.findBarberById.mockResolvedValue(makeBarberEntity());

    const response = await request(app).get('/api/barbers/barber-1/schedule');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('schedule');
  });
});
