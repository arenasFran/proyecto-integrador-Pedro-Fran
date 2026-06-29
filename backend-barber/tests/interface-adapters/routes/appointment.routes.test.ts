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
import AppointmentModel from '../../../src/infrastructure/repositories/mongodb/models/appointment.model';
import ServiceModel from '../../../src/infrastructure/repositories/mongodb/models/service.model';
import {
  signToken,
  seedBarber,
  seedAdmin,
  seedRegisteredClient,
  seedAppointment,
  seedService,
  seedTempLock,
  getFutureDate,
} from '../../test-utils/factories';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('Appointment routes — integración real', () => {
  beforeEach(async () => {
    await ServiceModel.deleteMany({});
  });

  describe('POST /api/appointments — booking completo', () => {
    it('crea turno como cliente anónimo', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const date = getFutureDate(15);

      const res = await request(app)
        .post('/api/appointments')
        .send({
          barberId,
          serviceId,
          date,
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientEmail: 'anon@test.com',
          clientPhone: '099123456',
        });

      expect(res.status).toBe(201);
      expect(res.body.appointment).toMatchObject({
        barberId,
        date,
        startTime: '10:00',
        status: 'Confirmado',
        clientEmail: 'anon@test.com',
      });

      const inDb = await AppointmentModel.findById(res.body.appointment.id);
      expect(inDb).not.toBeNull();
    });

    it('crea turno como cliente registrado (con auth)', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });
      const date = getFutureDate(15);

      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          barberId,
          serviceId,
          date,
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientEmail: email,
        });

      expect(res.status).toBe(201);
      expect(res.body.appointment.clientId).toBe(clientId);
    });

    it('crea turno con tempLockId válido', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const date = getFutureDate(15);
      const { tempLockId } = await seedTempLock({ barberId, date, startTime: '10:00' });

      const res = await request(app)
        .post('/api/appointments')
        .send({
          barberId,
          serviceId,
          date,
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientEmail: 'con-templock@test.com',
          tempLockId,
        });

      expect(res.status).toBe(201);

      const lockStillExists = await mongoose.model('TempLock').findById(tempLockId);
      expect(lockStillExists).toBeNull();
    });

    it('rechaza tempLockId inválido', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const date = getFutureDate(15);

      const res = await request(app)
        .post('/api/appointments')
        .send({
          barberId,
          serviceId,
          date,
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientEmail: 'bad-lock@test.com',
          tempLockId: new mongoose.Types.ObjectId().toString(),
        });

      expect(res.status).toBe(409);
    });

    it('rechaza horario duplicado (unique index)', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const date = getFutureDate(15);
      const payload = {
        barberId,
        serviceId,
        date,
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        clientEmail: 'dup@test.com',
      };

      await request(app).post('/api/appointments').send(payload);
      const res = await request(app).post('/api/appointments').send(payload);

      expect(res.status).toBe(409);
    });

    it('rechaza barbero inactivo', async () => {
      const { barberId } = await seedBarber({ isActive: false });
      const { serviceId } = await seedService();

      const res = await request(app)
        .post('/api/appointments')
        .send({
          barberId,
          serviceId,
          date: getFutureDate(15),
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientEmail: 'inactive@test.com',
        });

      expect(res.status).toBe(400);
    });

    it('rechaza turno fuera del horario laboral', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();

      const res = await request(app)
        .post('/api/appointments')
        .send({
          barberId,
          serviceId,
          date: getFutureDate(15),
          startTime: '20:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientEmail: 'fuera-horario@test.com',
        });

      expect(res.status).toBe(400);
    });

    it('rechaza campos requeridos faltantes', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .send({ barberId: 'xxx' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('rechaza barbero inexistente', async () => {
      const { serviceId } = await seedService();

      const res = await request(app)
        .post('/api/appointments')
        .send({
          barberId: new mongoose.Types.ObjectId().toString(),
          serviceId,
          date: getFutureDate(15),
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientEmail: 'no-barber@test.com',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/appointments/anonymous — consulta anónima', () => {
    it('devuelve turnos por email', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const date = getFutureDate(15);
      await seedAppointment({ barberId, serviceId, clientEmail: 'consulta@test.com', date, startTime: '10:00' });
      await seedAppointment({ barberId, serviceId, clientEmail: 'otro@test.com', date, startTime: '11:00' });

      const res = await request(app)
        .get('/api/appointments/anonymous')
        .query({ email: 'consulta@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.appointments).toHaveLength(1);
      expect(res.body.appointments[0].clientEmail).toBe('consulta@test.com');
    });

    it('falla si no se envía email ni phone', async () => {
      const res = await request(app)
        .get('/api/appointments/anonymous')
        .query({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/appointments — listado autenticado', () => {
    it('cliente ve solo sus turnos', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });
      const date = getFutureDate(15);

      await seedAppointment({ barberId, serviceId, clientId, date, startTime: '10:00' });
      await seedAppointment({ barberId, serviceId, clientId: new mongoose.Types.ObjectId().toString(), date, startTime: '11:00' });

      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.appointments).toHaveLength(1);
    });

    it('admin ve turnos filtrados por barberId', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const date = getFutureDate(15);

      await seedAppointment({ barberId, serviceId, date, startTime: '10:00' });

      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .query({ barberId });

      expect(res.status).toBe(200);
      expect(res.body.appointments).toHaveLength(1);
    });
  });

  describe('GET /api/appointments/:id — obtener por ID', () => {
    it('dueño ve su turno', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });
      const { appointmentId } = await seedAppointment({ barberId, serviceId, clientId });

      const res = await request(app)
        .get(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.appointment.id).toBe(appointmentId);
    });

    it('no dueño recibe 403', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { clientId } = await seedRegisteredClient({ email: 'dueno@test.com' });
      const otherToken = signToken({ kind: 'Registrado' });
      const { appointmentId } = await seedAppointment({ barberId, serviceId, clientId });

      const res = await request(app)
        .get(`/api/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${otherToken.token}`);

      expect(res.status).toBe(403);
    });

    it('ID inexistente da 404', async () => {
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });

      const res = await request(app)
        .get(`/api/appointments/${new mongoose.Types.ObjectId().toString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/appointments/:id/cancel — cancelación', () => {
    it('dueño cancela su turno', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });
      const { appointmentId } = await seedAppointment({ barberId, serviceId, clientId });

      const res = await request(app)
        .patch(`/api/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Cambio de planes' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/cancelado/);

      const updated = await AppointmentModel.findById(appointmentId);
      expect(updated!.status).toBe('Cancelado');
    });

    it('admin cancela cualquier turno', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { appointmentId } = await seedAppointment({ barberId, serviceId });

      const res = await request(app)
        .patch(`/api/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Admin cancela' });

      expect(res.status).toBe(200);
    });

    it('es idempotente si ya estaba cancelado', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });
      const { appointmentId } = await seedAppointment({ barberId, serviceId, clientId, status: 'Cancelado' });

      const res = await request(app)
        .patch(`/api/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/ya se encontraba cancelado/);
    });

    it('no dueño recibe 403', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const other = signToken({ kind: 'Registrado' });
      const { clientId } = await seedRegisteredClient({ email: 'dueno@test.com' });
      const { appointmentId } = await seedAppointment({ barberId, serviceId, clientId });

      const res = await request(app)
        .patch(`/api/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${other.token}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('ID inexistente da 404', async () => {
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });

      const res = await request(app)
        .patch(`/api/appointments/${new mongoose.Types.ObjectId().toString()}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/appointments/:id/reschedule — reprogramación', () => {
    it('dueño reagenda turno', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });
      const oldDate = getFutureDate(15);
      const { appointmentId } = await seedAppointment({ barberId, serviceId, clientId, date: oldDate, startTime: '10:00' });
      const newDate = getFutureDate(20);

      const res = await request(app)
        .patch(`/api/appointments/${appointmentId}/reschedule`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: newDate, startTime: '14:00', barberId });

      expect(res.status).toBe(200);
      expect(res.body.appointment.date).toBe(newDate);
      expect(res.body.appointment.startTime).toBe('14:00');
    });
  });

  describe('PATCH /api/appointments/:id/status — actualización de estado (Admin/Empleado)', () => {
    it('admin marca turno como Completado', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { appointmentId } = await seedAppointment({ barberId, serviceId, status: 'Confirmado' });

      const res = await request(app)
        .patch(`/api/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'Completado' });

      expect(res.status).toBe(200);

      const updated = await AppointmentModel.findById(appointmentId);
      expect(updated!.status).toBe('Completado');
      expect(updated!.paymentStatus).toBe('Pagado');
    });

    it('admin cancela con razón', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { appointmentId } = await seedAppointment({ barberId, serviceId, status: 'Confirmado' });

      const res = await request(app)
        .patch(`/api/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'Cancelado', cancelReason: 'No asistió' });

      expect(res.status).toBe(200);

      const updated = await AppointmentModel.findById(appointmentId);
      expect(updated!.status).toBe('Cancelado');
      expect(updated!.cancelReason).toBe('No asistió');
    });
  });
});
