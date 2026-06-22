const verifyIdTokenMock = jest.fn();

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

import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../src/app';
import { Barber } from '../../../src/infrastructure/repositories/mongodb/models/barber.model';
import {
  signToken,
  seedBarber,
  seedAdmin,
  getFutureDate,
} from '../../test-utils/factories';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

const createSchedule = () => ({
  monday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  tuesday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  wednesday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  thursday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  friday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  saturday: { startTime: '09:00', endTime: '18:00', breaks: [] },
  sunday: { startTime: '09:00', endTime: '18:00', breaks: [] },
});

describeIfMongo('Barber routes — integración real', () => {
  describe('GET /api/barbers/public', () => {
    it('devuelve solo barberos activos', async () => {
      await seedBarber({ email: 'activo@test.com', phone: '100000001', name: 'Activo' });
      await seedBarber({ email: 'inactivo@test.com', phone: '100000002', isActive: false, name: 'Inactivo' });

      const res = await request(app).get('/api/barbers/public');

      expect(res.status).toBe(200);
      expect(res.body.barbers).toHaveLength(1);
      expect(res.body.barbers[0].name).toBe('Activo');
    });
  });

  describe('GET /api/barbers — listado autenticado', () => {
    it('Admin ve todos los barberos', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      await seedBarber({ email: 'b1@test.com', phone: '200000001' });
      await seedBarber({ email: 'b2@test.com', phone: '200000002' });

      const res = await request(app)
        .get('/api/barbers')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.barbers.length).toBeGreaterThanOrEqual(2);
    });

    it('Empleado no recibe admins en la lista', async () => {
      await seedAdmin({ email: 'admin-oculto@test.com', phone: '300000001' });
      const { barberId } = await seedBarber({ email: 'empleado@test.com', phone: '300000002' });
      const { token } = signToken({ id: barberId, email: 'empleado@test.com', kind: 'Empleado' });

      const res = await request(app)
        .get('/api/barbers')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.barbers.every((b: any) => b.kind !== 'Admin')).toBe(true);
    });
  });

  describe('POST /api/barbers — creación (Admin)', () => {
    it('Admin crea un empleado', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      const schedule = createSchedule();

      const res = await request(app)
        .post('/api/barbers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'nuevo@barbero.com',
          password: 'Pass1234!',
          name: 'Pedro',
          lastname: 'Ramirez',
          phone: '400000001',
          schedule,
        });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('nuevo@barbero.com');
      expect(res.body.kind).toBe('Empleado');

      const inDb = await Barber.findById(res.body.id);
      expect(inDb).not.toBeNull();
    });

    it('rechaza si no es Admin (403)', async () => {
      const { barberId } = await seedBarber();
      const { token } = signToken({ id: barberId, email: 'empleado@test.com', kind: 'Empleado' });

      const res = await request(app)
        .post('/api/barbers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'nuevo@barbero.com',
          password: 'Pass1234!',
          name: 'Pedro',
          lastname: 'Ramirez',
          phone: '500000001',
          schedule: createSchedule(),
        });

      expect(res.status).toBe(403);
    });

    it('rechaza sin auth (401)', async () => {
      const res = await request(app)
        .post('/api/barbers')
        .send({
          email: 'nuevo@barbero.com',
          password: 'Pass1234!',
          name: 'Pedro',
          lastname: 'Ramirez',
          phone: '600000001',
          schedule: createSchedule(),
        });

      expect(res.status).toBe(401);
    });

    it('rechaza email duplicado', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      await seedBarber({ email: 'duplicado@test.com', phone: '700000001' });

      const res = await request(app)
        .post('/api/barbers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'duplicado@test.com',
          password: 'Pass1234!',
          name: 'Pedro',
          lastname: 'Ramirez',
          phone: '700000002',
          schedule: createSchedule(),
        });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/barbers/:id', () => {
    it('obtiene barbero por id (Admin)', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      const { barberId } = await seedBarber({ email: 'bget@test.com', phone: '800000001' });

      const res = await request(app)
        .get(`/api/barbers/${barberId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('bget@test.com');
    });

    it('devuelve 404 si no existe', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });

      const res = await request(app)
        .get(`/api/barbers/${new mongoose.Types.ObjectId().toString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/barbers/:id — actualización (Admin)', () => {
    it('Admin actualiza nombre y slotDuration', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      const { barberId } = await seedBarber({ email: 'bupd@test.com', phone: '900000001' });

      const res = await request(app)
        .put(`/api/barbers/${barberId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated', slotDuration: 45 });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated');
      expect(res.body.slotDuration).toBe(45);
    });

    it('404 si no existe', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });

      const res = await request(app)
        .put(`/api/barbers/${new mongoose.Types.ObjectId().toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nadie' });

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/barbers/:id/deactivate', () => {
    it('Admin desactiva barbero', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      const { barberId } = await seedBarber({ email: 'bdeact@test.com', phone: '10000001' });

      await request(app)
        .patch(`/api/barbers/${barberId}/deactivate`)
        .set('Authorization', `Bearer ${token}`);

      const barber = await Barber.findById(barberId) as any;
      expect(barber!.isActive).toBe(false);
    });
  });

  describe('DELETE /api/barbers/:id', () => {
    it('Admin elimina barbero (desactiva)', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      const { barberId } = await seedBarber({ email: 'bdel@test.com', phone: '11000001' });

      await request(app)
        .delete(`/api/barbers/${barberId}`)
        .set('Authorization', `Bearer ${token}`);

      const deleted = await Barber.findById(barberId) as any;
      expect(deleted).not.toBeNull();
      expect(deleted.isActive).toBe(false);
    });
  });

  describe('GET /api/barbers/:id/slots', () => {
    it('devuelve slots disponibles para una fecha', async () => {
      const { barberId } = await seedBarber({ slotDuration: 60 });
      const date = getFutureDate(15);
      const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'America/Montevideo' })
        .format(new Date(`${date}T12:00:00Z`))
        .toLowerCase();
      if (dayName === 'sunday' || dayName === 'saturday') return;

      const res = await request(app)
        .get(`/api/barbers/${barberId}/slots`)
        .query({ date });

      expect(res.status).toBe(200);
      expect(res.body.date).toBe(date);
      expect(Array.isArray(res.body.slots)).toBe(true);
      expect(res.body.slots.length).toBeGreaterThan(0);
    });

    it('rechaza fecha inválida', async () => {
      const { barberId } = await seedBarber();

      const res = await request(app)
        .get(`/api/barbers/${barberId}/slots`)
        .query({ date: 'invalida' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/barbers/:id/schedule', () => {
    it('devuelve el horario del barbero', async () => {
      const { barberId } = await seedBarber({ email: 'bsched@test.com', phone: '12000001' });
      const { token } = signToken({ id: barberId, email: 'bsched@test.com', kind: 'Empleado' });

      const res = await request(app)
        .get(`/api/barbers/${barberId}/schedule`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('schedule');
      expect(res.body.schedule.monday.startTime).toBe('09:00');
    });
  });
});
