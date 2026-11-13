const verifyIdTokenMock = jest.fn();

jest.mock('express-rate-limit', () => {
  return jest.fn(() => (_req: any, _res: any, next: any) => next());
});

jest.mock('../../../src/infrastructure/config/mailer', () => ({
  __esModule: true,
  default: { sendMail: jest.fn().mockResolvedValue(undefined) },
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/infrastructure/services/GoogleAuthService', () => ({
  GoogleAuthService: jest.fn().mockImplementation(() => ({
    verifyIdToken: verifyIdTokenMock,
  })),
}));

import request from 'supertest';
import app from '../../../src/app';
import AppointmentModel from '../../../src/infrastructure/repositories/mongodb/models/appointment.model';
import { Employee } from '../../../src/infrastructure/repositories/mongodb/models/barber.model';
import {
  signToken,
  seedBarber,
  seedAdmin,
  seedAppointment,
  seedRegisteredClient,
} from '../../test-utils/factories';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

const RANGE = { dateFrom: '2026-11-09', dateTo: '2026-11-22' };

describeIfMongo('GET /api/appointments/calendar', () => {
  beforeEach(async () => {
    await Employee.deleteMany({});
    await AppointmentModel.deleteMany({});
  });

  it('rechaza la petición sin autenticación', async () => {
    const res = await request(app).get('/api/appointments/calendar').query(RANGE);

    expect(res.status).toBe(401);
  });

  it('Admin recibe todos los turnos del rango y la ruta no es capturada por /:id', async () => {
    const { adminId } = await seedAdmin();
    const barber1 = await seedBarber();
    const barber2 = await seedBarber({ email: 'barbero2@test.com', phone: '098765433' });
    const { token } = signToken({ id: adminId, kind: 'Admin' });

    await seedAppointment({ barberId: barber1.barberId, date: '2026-11-09', startTime: '10:00' });
    await seedAppointment({ barberId: barber2.barberId, date: '2026-11-12', startTime: '11:00' });
    await seedAppointment({ barberId: barber1.barberId, date: '2026-12-01', startTime: '12:00' });

    const res = await request(app)
      .get('/api/appointments/calendar')
      .set('Authorization', `Bearer ${token}`)
      .query(RANGE);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.appointments).toHaveLength(2);
    expect(res.body.appointments.map((a: any) => a.date)).toEqual(['2026-11-09', '2026-11-12']);
  });

  it('Admin puede filtrar por barberId', async () => {
    const { adminId } = await seedAdmin();
    const barber1 = await seedBarber();
    const barber2 = await seedBarber({ email: 'barbero2@test.com', phone: '098765433' });
    const { token } = signToken({ id: adminId, kind: 'Admin' });

    await seedAppointment({ barberId: barber1.barberId, date: '2026-11-09', startTime: '10:00' });
    await seedAppointment({ barberId: barber2.barberId, date: '2026-11-12', startTime: '11:00' });

    const res = await request(app)
      .get('/api/appointments/calendar')
      .set('Authorization', `Bearer ${token}`)
      .query({ ...RANGE, barberId: barber2.barberId });

    expect(res.status).toBe(200);
    expect(res.body.appointments).toHaveLength(1);
    expect(res.body.appointments[0].barberId).toBe(barber2.barberId);
  });

  it('Empleado solo recibe sus propios turnos aunque pida otro barberId', async () => {
    const barber1 = await seedBarber();
    const barber2 = await seedBarber({ email: 'barbero2@test.com', phone: '098765433' });
    const { token } = signToken({ id: barber1.barberId, kind: 'Empleado' });

    await seedAppointment({ barberId: barber1.barberId, date: '2026-11-09', startTime: '10:00' });
    await seedAppointment({ barberId: barber2.barberId, date: '2026-11-12', startTime: '11:00' });

    const res = await request(app)
      .get('/api/appointments/calendar')
      .set('Authorization', `Bearer ${token}`)
      .query({ ...RANGE, barberId: barber2.barberId });

    expect(res.status).toBe(200);
    expect(res.body.appointments).toHaveLength(1);
    expect(res.body.appointments[0].barberId).toBe(barber1.barberId);
  });

  it('rechaza con 403 a un cliente registrado', async () => {
    const { clientId, email } = await seedRegisteredClient();
    const { token } = signToken({ id: clientId, email, kind: 'Registrado' });

    const res = await request(app)
      .get('/api/appointments/calendar')
      .set('Authorization', `Bearer ${token}`)
      .query(RANGE);

    expect(res.status).toBe(403);
  });

  it('devuelve 400 si dateTo es anterior a dateFrom', async () => {
    const { adminId } = await seedAdmin();
    const { token } = signToken({ id: adminId, kind: 'Admin' });

    const res = await request(app)
      .get('/api/appointments/calendar')
      .set('Authorization', `Bearer ${token}`)
      .query({ dateFrom: '2026-11-22', dateTo: '2026-11-09' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/dateTo no puede ser anterior a dateFrom/);
  });

  it('devuelve 400 si el rango supera los 31 días', async () => {
    const { adminId } = await seedAdmin();
    const { token } = signToken({ id: adminId, kind: 'Admin' });

    const res = await request(app)
      .get('/api/appointments/calendar')
      .set('Authorization', `Bearer ${token}`)
      .query({ dateFrom: '2026-01-01', dateTo: '2026-03-01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no puede superar los 31 días/);
  });
});
