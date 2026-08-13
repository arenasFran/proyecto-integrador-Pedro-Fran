import request from 'supertest';
import express from 'express';
import { createBarberRouter } from '../../../src/interface-adapters/routes/barber.routes';
import { profileUpdateLimiter } from '../../../src/interface-adapters/routes/user.routes';
import { BarberController } from '../../../src/interface-adapters/controllers/barber/BarberController';
import { Barber, BarberProps, BarberSchedule } from '../../../src/domain/entities/Barber';
import {
  makeMockBarberRepository,
  makeMockUserRepository,
  makeMockAppointmentRepository,
  makeMockPasswordHasher,
  makeMockEmailService,
} from '../../test-utils/mocks';

const createScheduleDay = () => ({ startTime: '09:00', endTime: '18:00', breaks: [] });

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

describe('Barber routes — PUT /api/barbers/me', () => {
  let app: express.Application;
  let barberRepository: ReturnType<typeof makeMockBarberRepository>;
  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let updateBarberMe: { execute: jest.Mock };
  let passwordHasher: ReturnType<typeof makeMockPasswordHasher>;

  const authenticate: express.RequestHandler = (req, _res, next) => {
    (req as any).user = { _id: 'barber-1', email: 'barber@example.com', kind: 'Empleado' };
    next();
  };

  beforeEach(() => {
    profileUpdateLimiter.resetKey('barber-1');
    barberRepository = makeMockBarberRepository();
    userRepository = makeMockUserRepository();
    const emailService = makeMockEmailService();
    updateBarberMe = { execute: jest.fn() };

    const controller = new BarberController(
      barberRepository,
      {} as any,
      {} as any,
      {} as any,
      emailService,
      {} as any,
      {} as any,
      updateBarberMe as any,
      {} as any,
      {} as any,
    );

    app = express();
    app.use(express.json());
    app.use('/api/barbers', createBarberRouter({ barberController: controller, authenticate }));
  });

  it('debe actualizar nombre sin pedir contraseña cuando no cambia el email', async () => {
    updateBarberMe.execute.mockResolvedValue({ barber: makeBarberEntity({ name: 'Carlos' }).toPrimitives() });

    const response = await request(app)
      .put('/api/barbers/me')
      .send({ name: 'Carlos' });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Carlos');
  });

  it('el campo password ya no está en el contrato: la validación lo rechaza', async () => {
    const response = await request(app)
      .put('/api/barbers/me')
      .send({ password: 'NuevaPass123' });

    expect(response.status).toBe(400);
  });

  it('debe rechazar el cambio de email sin currentPassword', async () => {
    const { AppError } = require('../../../src/domain/errors/AppError');
    updateBarberMe.execute.mockRejectedValue(new AppError('Se requiere la contraseña actual para cambiar el email.', 400));

    const response = await request(app)
      .put('/api/barbers/me')
      .send({ email: 'nuevo@example.com' });

    expect(response.status).toBe(400);
  });

  it('debe rechazar el cambio de email con currentPassword incorrecta', async () => {
    const { AppError } = require('../../../src/domain/errors/AppError');
    updateBarberMe.execute.mockRejectedValue(new AppError('Contraseña actual incorrecta.', 401));

    const response = await request(app)
      .put('/api/barbers/me')
      .send({ email: 'nuevo@example.com', currentPassword: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Contraseña actual incorrecta.' });
  });

  it('debe cambiar el email con currentPassword correcta', async () => {
    updateBarberMe.execute.mockResolvedValue({ barber: makeBarberEntity({ email: 'nuevo@example.com' }).toPrimitives(), oldEmail: 'barber@example.com' });

    const response = await request(app)
      .put('/api/barbers/me')
      .send({ email: 'nuevo@example.com', currentPassword: 'CurrentPass1' });

    expect(response.status).toBe(200);
    expect(response.body.email).toBe('nuevo@example.com');
  });

  it('debe aplicar el rate limit de actualización de perfil tras 30 intentos', async () => {
    const { AppError } = require('../../../src/domain/errors/AppError');
    updateBarberMe.execute.mockRejectedValue(new AppError('Contraseña actual incorrecta.', 401));

    for (let i = 0; i < 30; i++) {
      await request(app)
        .put('/api/barbers/me')
        .send({ email: 'nuevo@example.com', currentPassword: 'wrong' });
    }

    const response = await request(app)
      .put('/api/barbers/me')
      .send({ email: 'nuevo@example.com', currentPassword: 'wrong' });

    expect(response.status).toBe(429);
  });
});
