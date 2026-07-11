import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../src/app';
import AppointmentModel from '../../../src/infrastructure/repositories/mongodb/models/appointment.model';
import { seedAdmin, seedBarber, signToken } from '../../test-utils/factories';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('Analytics Routes (new endpoints)', () => {
  let adminToken: string;
  let barber1Id: string;
  let barber2Id: string;

  beforeAll(async () => {
    const admin = await seedAdmin();
    adminToken = signToken({ id: admin.adminId, kind: 'Admin' }).token;

    const b1 = await seedBarber({ email: 'carlos@test.com', name: 'Carlos', lastname: 'Lopez', phone: '111111' });
    barber1Id = b1.barberId;

    const b2 = await seedBarber({ email: 'pedro@test.com', name: 'Pedro', lastname: 'Garcia', phone: '222222' });
    barber2Id = b2.barberId;

    const makeAppointment = (overrides: {
      date: string; startTime: string; endTime: string;
      barberId: string;
      status: string; servicePrice?: number; serviceName?: string;
    }) => ({
      barberId: new mongoose.Types.ObjectId(overrides.barberId),
      clientName: 'Juan',
      clientLastname: 'Perez',
      clientPhone: '099333333',
      clientEmail: 'cliente@test.com',
      serviceId: 'svc-1',
      serviceName: overrides.serviceName ?? 'Corte',
      servicePrice: overrides.servicePrice ?? 490,
      serviceDuration: 30,
      date: overrides.date,
      startTime: overrides.startTime,
      endTime: overrides.endTime,
      status: overrides.status,
      paymentStatus: 'Pendiente',
      paymentMethod: 'local',
      statusHistory: [{ status: overrides.status, timestamp: new Date(), actor: 'system' }],
    });

    await AppointmentModel.create(makeAppointment({
      date: '2025-06-05', startTime: '10:00', endTime: '10:30',
      barberId: barber1Id, status: 'Completado', serviceName: 'Corte',
    }));
    await AppointmentModel.create(makeAppointment({
      date: '2025-06-05', startTime: '11:00', endTime: '11:30',
      barberId: barber2Id, status: 'Confirmado', serviceName: 'Barba', servicePrice: 300,
    }));
    await AppointmentModel.create(makeAppointment({
      date: '2025-06-10', startTime: '10:00', endTime: '10:45',
      barberId: barber1Id, status: 'Completado', servicePrice: 600, serviceName: 'Corte',
    }));
    await AppointmentModel.create(makeAppointment({
      date: '2025-06-10', startTime: '14:00', endTime: '14:30',
      barberId: barber2Id, status: 'Cancelado', serviceName: 'Corte',
    }));
    await AppointmentModel.create(makeAppointment({
      date: '2025-06-15', startTime: '10:00', endTime: '10:30',
      barberId: barber1Id, status: 'NoShow', serviceName: 'Barba', servicePrice: 300,
    }));
    await AppointmentModel.create(makeAppointment({
      date: '2025-06-20', startTime: '15:00', endTime: '15:30',
      barberId: barber2Id, status: 'Completado', serviceName: 'Corte',
    }));
    await AppointmentModel.create(makeAppointment({
      date: '2025-06-25', startTime: '10:00', endTime: '10:30',
      barberId: barber1Id, status: 'Confirmado', serviceName: 'Corte',
    }));
  });

  describe('GET /api/analytics/charts/horas', () => {
    it('devuelve distribución por hora', async () => {
      const res = await request(app)
        .get('/api/analytics/charts/horas')
        .query({ desde: '2025-06-01', hasta: '2025-06-30' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);

      const horas = res.body as { hora: number; cantidad: number }[];
      expect(horas.length).toBeGreaterThan(0);

      const hora10 = horas.find((h: { hora: number }) => h.hora === 10);
      expect(hora10).toBeDefined();
      expect(hora10!.cantidad).toBeGreaterThanOrEqual(3);
    });

    it('rechaza sin token', async () => {
      const res = await request(app)
        .get('/api/analytics/charts/horas')
        .query({ desde: '2025-06-01', hasta: '2025-06-30' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/analytics/charts/dias-semana', () => {
    it('devuelve 200 con estructura correcta', async () => {
      const res = await request(app)
        .get('/api/analytics/charts/dias-semana')
        .query({ desde: '2025-06-01', hasta: '2025-06-30' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/analytics/charts/clientes-recurrentes', () => {
    it('devuelve tasa de retorno', async () => {
      const res = await request(app)
        .get('/api/analytics/charts/clientes-recurrentes')
        .query({ desde: '2025-06-01', hasta: '2025-06-30' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalClientes');
      expect(res.body).toHaveProperty('recurrentes');
      expect(res.body).toHaveProperty('tasaRetorno');
      expect(res.body).toHaveProperty('nuevos');
      expect(typeof res.body.totalClientes).toBe('number');
    });
  });

  describe('GET /api/analytics/clientes', () => {
    it('permite acceso a Admin', async () => {
      const res = await request(app)
        .get('/api/analytics/clientes')
        .query({ desde: '2025-06-01', hasta: '2025-06-30' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('permite acceso a Empleado (barbero) — necesario para la ficha de cliente', async () => {
      const barberToken = signToken({ id: barber1Id, kind: 'Empleado' }).token;

      const res = await request(app)
        .get('/api/analytics/clientes')
        .query({ desde: '2025-06-01', hasta: '2025-06-30' })
        .set('Authorization', `Bearer ${barberToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('rechaza a un cliente Registrado', async () => {
      const clientToken = signToken({ id: 'cliente-1', kind: 'Registrado' }).token;

      const res = await request(app)
        .get('/api/analytics/clientes')
        .query({ desde: '2025-06-01', hasta: '2025-06-30' })
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/analytics/charts/ingresos-servicio', () => {
    it('devuelve 200 con estructura correcta', async () => {
      const res = await request(app)
        .get('/api/analytics/charts/ingresos-servicio')
        .query({ desde: '2025-06-01', hasta: '2025-06-30' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/analytics/charts/horas — validación', () => {
    it('rechaza sin parámetros de fecha', async () => {
      const res = await request(app)
        .get('/api/analytics/charts/horas')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });
});
