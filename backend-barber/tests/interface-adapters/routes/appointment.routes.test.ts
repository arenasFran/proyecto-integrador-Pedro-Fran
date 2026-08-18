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

import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../src/app';
import AppointmentModel from '../../../src/infrastructure/repositories/mongodb/models/appointment.model';
import ServiceModel from '../../../src/infrastructure/repositories/mongodb/models/service.model';
import { Employee } from '../../../src/infrastructure/repositories/mongodb/models/barber.model';
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
    await Employee.deleteMany({});
    await AppointmentModel.deleteMany({});
  });

  describe('POST /api/appointments — booking completo', () => {
    it('crea turno como cliente anónimo', async () => {
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
          clientEmail: 'anon@test.com',
          clientPhone: '099123456',
          tempLockId,
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

    it('rechaza reserva anónima si el email pertenece a una cuenta registrada', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { email } = await seedRegisteredClient({ email: 'ya-registrado@test.com' });
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
          clientEmail: email,
          clientPhone: '099123456',
          tempLockId,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Este email ya está registrado. Iniciá sesión para reservar tu turno.');
      expect(res.body.code).toBe('EMAIL_ALREADY_REGISTERED');

      const inDb = await AppointmentModel.findOne({ clientEmail: email });
      expect(inDb).toBeNull();
    });

    it('crea turno como cliente registrado (con auth)', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });
      const date = getFutureDate(15);
      const { tempLockId: lockId } = await seedTempLock({ barberId, date, startTime: '10:00' });

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
          clientPhone: '099123456',
          tempLockId: lockId,
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
          clientPhone: '099123456',
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
          clientPhone: '099123456',
          tempLockId: new mongoose.Types.ObjectId().toString(),
        });

      expect(res.status).toBe(409);
    });

    it('rechaza horario duplicado (unique index)', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const date = getFutureDate(15);
      const { tempLockId: lockId1 } = await seedTempLock({ barberId, date, startTime: '10:00' });
      const payload = {
        barberId,
        serviceId,
        date,
        startTime: '10:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        clientEmail: 'dup@test.com',
        clientPhone: '099123456',
        tempLockId: lockId1,
      };

      await request(app).post('/api/appointments').send(payload);

      const { tempLockId: lockId2 } = await seedTempLock({ barberId, date, startTime: '10:00' });
      const res = await request(app).post('/api/appointments').send({ ...payload, tempLockId: lockId2 });

      expect(res.status).toBe(409);
    });

    it('rechaza barbero inactivo', async () => {
      const { barberId } = await seedBarber({ isActive: false });
      const { serviceId } = await seedService();
      const date = getFutureDate(15);
      const { tempLockId: lockId } = await seedTempLock({ barberId, date, startTime: '10:00' });

      const res = await request(app)
        .post('/api/appointments')
        .send({
          barberId,
          serviceId,
          date,
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientEmail: 'inactive@test.com',
          clientPhone: '099123456',
          tempLockId: lockId,
        });

      expect(res.status).toBe(400);
    });

    it('rechaza turno fuera del horario laboral', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const date = getFutureDate(15);
      const { tempLockId: lockId } = await seedTempLock({ barberId, date, startTime: '20:00' });

      const res = await request(app)
        .post('/api/appointments')
        .send({
          barberId,
          serviceId,
          date,
          startTime: '20:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientEmail: 'fuera-horario@test.com',
          clientPhone: '099123456',
          tempLockId: lockId,
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
      const fakeBarberId = new mongoose.Types.ObjectId().toString();
      const date = getFutureDate(15);
      const { tempLockId: lockId } = await seedTempLock({ barberId: fakeBarberId, date, startTime: '10:00' });

      const res = await request(app)
        .post('/api/appointments')
        .send({
          barberId: fakeBarberId,
          serviceId,
          date,
          startTime: '10:00',
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientEmail: 'no-barber@test.com',
          clientPhone: '099123456',
          tempLockId: lockId,
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/appointments/anonymous — consulta anónima', () => {
    it('devuelve turnos por email Y teléfono coincidentes', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const date = getFutureDate(15);
      await seedAppointment({
        barberId, serviceId, date, startTime: '10:00',
        clientEmail: 'consulta@test.com', clientPhone: '099111111',
      });
      await seedAppointment({
        barberId, serviceId, date, startTime: '11:00',
        clientEmail: 'otro@test.com', clientPhone: '099222222',
      });

      const res = await request(app)
        .get('/api/appointments/anonymous')
        .query({ email: 'consulta@test.com', phone: '099111111' });

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

    it('falla si solo se envía email (ownership real: no alcanza con un solo dato)', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      await seedAppointment({
        barberId, serviceId,
        clientEmail: 'consulta@test.com', clientPhone: '099111111',
      });

      const res = await request(app)
        .get('/api/appointments/anonymous')
        .query({ email: 'consulta@test.com' });

      expect(res.status).toBe(400);
    });

    it('falla si solo se envía phone', async () => {
      const res = await request(app)
        .get('/api/appointments/anonymous')
        .query({ phone: '099111111' });

      expect(res.status).toBe(400);
    });

    it('no devuelve turnos ajenos si el email coincide pero el teléfono no', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      await seedAppointment({
        barberId, serviceId,
        clientEmail: 'consulta@test.com', clientPhone: '099111111',
      });

      const res = await request(app)
        .get('/api/appointments/anonymous')
        .query({ email: 'consulta@test.com', phone: '099999999' });

      expect(res.status).toBe(200);
      expect(res.body.appointments).toHaveLength(0);
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

  describe('GET /api/appointments/clients/search — búsqueda de clientes registrados', () => {
    it('admin encuentra un cliente registrado por nombre', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      await seedRegisteredClient({ name: 'Ana', lastname: 'Gómez', email: 'ana@test.com' });

      const res = await request(app)
        .get('/api/appointments/clients/search')
        .set('Authorization', `Bearer ${token}`)
        .query({ q: 'ana' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ name: 'Ana', lastname: 'Gómez', contactEmail: 'ana@test.com' });
    });

    it('cliente registrado (no staff) recibe 403', async () => {
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });

      const res = await request(app)
        .get('/api/appointments/clients/search')
        .set('Authorization', `Bearer ${token}`)
        .query({ q: 'ana' });

      expect(res.status).toBe(403);
    });

    it('rechaza búsquedas de menos de 2 caracteres', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });

      const res = await request(app)
        .get('/api/appointments/clients/search')
        .set('Authorization', `Bearer ${token}`)
        .query({ q: 'a' });

      expect(res.status).toBe(400);
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

    it('reprogramar no cuenta contra el límite de 10 turnos activos (RN15) — un cliente en el límite puede reagendar uno de los suyos', async () => {
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });

      // Deja al cliente exactamente en MAX_ACTIVE_APPOINTMENTS (10, ver CreateAppointmentUseCase.ts)
      // turnos "Confirmado" activos, cada uno en una fecha distinta para no chocar con el índice único
      // { barberId, date, startTime, status: 'Confirmado' }.
      const appointmentIds: string[] = [];
      for (let i = 1; i <= 10; i++) {
        const { appointmentId } = await seedAppointment({
          barberId, serviceId, clientId, date: getFutureDate(i), startTime: '10:00',
        });
        appointmentIds.push(appointmentId);
      }

      // Prueba de contraste: a esta altura, crear un turno NUEVO sí debe estar bloqueado por RN15 —
      // confirma que el límite realmente estaba activo (si esto diera 201, el test de abajo no probaría nada).
      const { tempLockId: contrastLockId } = await seedTempLock({ barberId, date: getFutureDate(20), startTime: '16:00' });
      const blockedCreate = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          barberId, serviceId, date: getFutureDate(20), startTime: '16:00',
          clientName: 'Juan', clientLastname: 'Perez', clientEmail: email, clientPhone: '099333333',
          tempLockId: contrastLockId,
        });
      expect(blockedCreate.status).toBe(409);

      // Reagenda uno de esos 10 turnos existentes (no crea uno nuevo) a una fecha/hora libre.
      const targetId = appointmentIds[0];
      const newDate = getFutureDate(25);

      const res = await request(app)
        .patch(`/api/appointments/${targetId}/reschedule`)
        .set('Authorization', `Bearer ${token}`)
        .send({ date: newDate, startTime: '11:00', barberId });

      expect(res.status).toBe(200);
      expect(res.body.appointment.date).toBe(newDate);
      expect(res.body.appointment.startTime).toBe('11:00');

      // El cliente sigue teniendo exactamente 10 turnos Confirmado — reprogramar no creó ni destruyó ninguno.
      const activeCount = await AppointmentModel.countDocuments({
        clientId: new mongoose.Types.ObjectId(clientId),
        status: 'Confirmado',
      });
      expect(activeCount).toBe(10);
    });
  });

  describe('PATCH /api/appointments/:id/payment — marcar pagado', () => {
    it('admin marca turno como pagado', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { appointmentId } = await seedAppointment({ barberId, serviceId, status: 'Confirmado' });

      const res = await request(app)
        .patch(`/api/appointments/${appointmentId}/payment`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const updated = await AppointmentModel.findById(appointmentId);
      expect(updated!.paymentStatus).toBe('Pagado');
    });

    it('rechaza si el turno no existe', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });

      const res = await request(app)
        .patch(`/api/appointments/${new mongoose.Types.ObjectId().toString()}/payment`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('rechaza si no es admin ni empleado', async () => {
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });

      const res = await request(app)
        .patch(`/api/appointments/${new mongoose.Types.ObjectId().toString()}/payment`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/appointments/:id/send-reminder — enviar recordatorio', () => {
    it('admin envía recordatorio', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { appointmentId } = await seedAppointment({ barberId, serviceId, clientEmail: 'cliente@test.com' });

      const res = await request(app)
        .post(`/api/appointments/${appointmentId}/send-reminder`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Recordatorio enviado/);
    });

    it('rechaza si el turno no tiene email', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      const { barberId } = await seedBarber();
      const { serviceId } = await seedService();
      const { appointmentId } = await seedAppointment({ barberId, serviceId, clientEmail: '' });

      const res = await request(app)
        .post(`/api/appointments/${appointmentId}/send-reminder`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/appointments/:id/change-barber — cambiar barbero', () => {
    it('admin cambia barbero exitosamente', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      const { barberId: oldBarberId } = await seedBarber({ email: 'viejo@test.com', name: 'Viejo', phone: '098765431' });
      const { barberId: newBarberId } = await seedBarber({ email: 'nuevo@test.com', name: 'Nuevo', phone: '098765433' });
      const { serviceId } = await seedService();
      const { appointmentId } = await seedAppointment({ barberId: oldBarberId, serviceId, status: 'Confirmado' });

      const res = await request(app)
        .patch(`/api/appointments/${appointmentId}/change-barber`)
        .set('Authorization', `Bearer ${token}`)
        .send({ barberId: newBarberId });

      expect(res.status).toBe(200);

      const updated = await AppointmentModel.findById(appointmentId);
      expect(updated!.barberId.toString()).toBe(newBarberId);
    });

    it('rechaza si el nuevo barbero está ocupado en ese horario', async () => {
      const { adminId } = await seedAdmin();
      const { token } = signToken({ id: adminId, email: 'admin@test.com', kind: 'Admin' });
      const { barberId: oldBarberId } = await seedBarber({ email: 'viejo2@test.com', name: 'Viejo2', phone: '098765434' });
      const { barberId: newBarberId } = await seedBarber({ email: 'ocupado@test.com', name: 'Ocupado', phone: '098765435' });
      const { serviceId } = await seedService();
      const date = getFutureDate(15);
      const { appointmentId } = await seedAppointment({ barberId: oldBarberId, serviceId, date, startTime: '10:00', status: 'Confirmado' });
      await seedAppointment({ barberId: newBarberId, serviceId, date, startTime: '10:00', status: 'Confirmado' });

      const res = await request(app)
        .patch(`/api/appointments/${appointmentId}/change-barber`)
        .set('Authorization', `Bearer ${token}`)
        .send({ barberId: newBarberId });

      expect(res.status).toBe(409);
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
      expect(updated!.paymentStatus).toBe('Pendiente');
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
