import mongoose from 'mongoose';
import { MongoMembershipRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MembershipModel } from '../../../../src/infrastructure/repositories/mongodb/models/membership.model';
import { RegisteredClient } from '../../../../src/infrastructure/repositories/mongodb/models/client.model';
import AppointmentModel from '../../../../src/infrastructure/repositories/mongodb/models/appointment.model';
import { Membership } from '../../../../src/domain/entities/Membership';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoMembershipRepository (métodos adicionales)', () => {
  let repository: MongoMembershipRepository;
  const DAY_MS = 24 * 60 * 60 * 1000;

  const createMembershipDoc = async (overrides: {
    userId?: mongoose.Types.ObjectId;
    status?: string;
    endDate?: Date;
    couponsUsed?: number;
    couponsTotal?: number;
    createdAt?: Date;
  } = {}) => {
    const doc = await MembershipModel.create({
      userId: overrides.userId ?? new mongoose.Types.ObjectId(),
      status: overrides.status ?? 'active',
      startDate: new Date(),
      endDate: overrides.endDate ?? new Date(Date.now() + 30 * DAY_MS),
      couponsTotal: overrides.couponsTotal ?? 4,
      couponsUsed: overrides.couponsUsed ?? 0,
      productDiscount: 10,
      createdBy: 'client',
    });
    if (overrides.createdAt) {
      await MembershipModel.collection.updateOne({ _id: doc._id }, { $set: { createdAt: overrides.createdAt } });
    }
    return doc;
  };

  beforeEach(() => {
    repository = new MongoMembershipRepository();
  });

  afterEach(async () => {
    await MembershipModel.deleteMany({});
    await RegisteredClient.deleteMany({});
    await AppointmentModel.deleteMany({});
  });

  describe('findActiveByUser / findPendingByUser / findAnyByUser', () => {
    it('debe devolver la membresía activa vigente del usuario', async () => {
      const userId = new mongoose.Types.ObjectId();
      await createMembershipDoc({ userId, status: 'active' });

      const found = await repository.findActiveByUser(userId.toString());

      expect(found).not.toBeNull();
      expect(found!.status).toBe('active');
    });

    it('no debe devolver una membresía activa ya vencida', async () => {
      const userId = new mongoose.Types.ObjectId();
      await createMembershipDoc({ userId, status: 'active', endDate: new Date(Date.now() - DAY_MS) });

      const found = await repository.findActiveByUser(userId.toString());

      expect(found).toBeNull();
    });

    it('debe devolver la membresía pendiente del usuario', async () => {
      const userId = new mongoose.Types.ObjectId();
      await createMembershipDoc({ userId, status: 'pending' });

      const found = await repository.findPendingByUser(userId.toString());

      expect(found).not.toBeNull();
      expect(found!.status).toBe('pending');
    });

    it('findAnyByUser debe devolver la más reciente sin importar el status', async () => {
      const userId = new mongoose.Types.ObjectId();
      await createMembershipDoc({ userId, status: 'expired', createdAt: new Date('2020-01-01') });
      await createMembershipDoc({ userId, status: 'pending', createdAt: new Date('2026-01-01') });

      const found = await repository.findAnyByUser(userId.toString());

      expect(found!.status).toBe('pending');
    });
  });

  describe('findById / findByUser', () => {
    it('findById debe devolver la membresía por id', async () => {
      const doc = await createMembershipDoc();
      const found = await repository.findById(doc._id.toString());
      expect(found!.id).toBe(doc._id.toString());
    });

    it('findByUser debe devolver todas las membresías del usuario ordenadas por fecha', async () => {
      const userId = new mongoose.Types.ObjectId();
      await createMembershipDoc({ userId, status: 'expired', createdAt: new Date('2020-01-01') });
      await createMembershipDoc({ userId, status: 'active', createdAt: new Date('2026-01-01') });

      const found = await repository.findByUser(userId.toString());

      expect(found).toHaveLength(2);
      expect(found[0].status).toBe('active');
    });
  });

  describe('findAll', () => {
    it('debe filtrar por status', async () => {
      await createMembershipDoc({ status: 'active' });
      await createMembershipDoc({ status: 'pending' });

      const result = await repository.findAll({ status: 'pending' });

      expect(result.total).toBe(1);
      expect(result.data[0].status).toBe('pending');
    });

    it('debe filtrar por búsqueda de nombre/email de cliente registrado', async () => {
      const client = await RegisteredClient.create({ name: 'Juan', lastname: 'Perez', email: 'juan@test.com', kind: 'Registrado' });
      await createMembershipDoc({ userId: client._id as mongoose.Types.ObjectId });
      await createMembershipDoc();

      const result = await repository.findAll({ search: 'Juan' });

      expect(result.total).toBe(1);
    });

    it('debe devolver vacío si la búsqueda no matchea a ningún cliente', async () => {
      await createMembershipDoc();
      const result = await repository.findAll({ search: 'NoExiste123' });
      expect(result.total).toBe(0);
      expect(result.data).toEqual([]);
    });
  });

  describe('save', () => {
    it('debe crear una membresía nueva', async () => {
      const membership = Membership.create({ userId: new mongoose.Types.ObjectId().toString(), createdBy: 'client' });
      const saved = await repository.save(membership);
      expect(saved.id).toBeTruthy();
      const found = await MembershipModel.findById(saved.id);
      expect(found).not.toBeNull();
    });

    it('debe actualizar una membresía existente', async () => {
      const doc = await createMembershipDoc({ status: 'pending' });
      const membership = await repository.findById(doc._id.toString());
      membership!.approve('admin-1');

      await repository.save(membership!);

      const updated = await MembershipModel.findById(doc._id);
      expect(updated!.status).toBe('active');
      expect(updated!.approvedBy).toBe('admin-1');
    });
  });

  describe('addCouponsTotal', () => {
    it('debe sumar cupones al total', async () => {
      const doc = await createMembershipDoc({ couponsTotal: 4 });
      const updated = await repository.addCouponsTotal(doc._id.toString(), 2);
      expect(updated!.couponsTotal).toBe(6);
    });

    it('debe devolver null si count es 0 o negativo', async () => {
      const doc = await createMembershipDoc();
      const updated = await repository.addCouponsTotal(doc._id.toString(), 0);
      expect(updated).toBeNull();
    });
  });

  describe('atomicConsumeCoupon / atomicRestoreCoupon', () => {
    it('atomicConsumeCoupon debe incrementar couponsUsed en 1', async () => {
      const doc = await createMembershipDoc({ couponsUsed: 0 });
      const updated = await repository.atomicConsumeCoupon(doc._id.toString());
      expect(updated!.couponsUsed).toBe(1);
    });

    it('atomicRestoreCoupon debe decrementar couponsUsed en 1', async () => {
      const doc = await createMembershipDoc({ couponsUsed: 2 });
      const updated = await repository.atomicRestoreCoupon(doc._id.toString());
      expect(updated!.couponsUsed).toBe(1);
    });
  });

  describe('hasActiveMembership', () => {
    it('debe devolver true si el usuario tiene membresía activa vigente', async () => {
      const userId = new mongoose.Types.ObjectId();
      await createMembershipDoc({ userId, status: 'active' });
      expect(await repository.hasActiveMembership(userId.toString())).toBe(true);
    });

    it('debe devolver false si no tiene membresía activa', async () => {
      const userId = new mongoose.Types.ObjectId();
      expect(await repository.hasActiveMembership(userId.toString())).toBe(false);
    });
  });

  describe('approvePending', () => {
    it('debe activar la membresía y setear endDate/approvedBy/approvedAt', async () => {
      const doc = await createMembershipDoc({ status: 'pending' });
      const updated = await repository.approvePending(doc._id.toString(), 'admin-1');
      expect(updated!.status).toBe('active');
      expect(updated!.approvedBy).toBe('admin-1');
      expect(updated!.endDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('findPendingAll', () => {
    it('debe devolver todas las membresías pendientes', async () => {
      await createMembershipDoc({ status: 'pending' });
      await createMembershipDoc({ status: 'active' });

      const pending = await repository.findPendingAll();

      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('pending');
    });
  });

  describe('findExpiringSoon', () => {
    it('debe devolver membresías activas que vencen dentro del rango de días', async () => {
      await createMembershipDoc({ status: 'active', endDate: new Date(Date.now() + 2 * DAY_MS) });
      await createMembershipDoc({ status: 'active', endDate: new Date(Date.now() + 60 * DAY_MS) });

      const expiring = await repository.findExpiringSoon(5);

      expect(expiring).toHaveLength(1);
    });
  });

  describe('findCouponAppointments', () => {
    it('debe devolver los turnos pagados con cupón de membresía', async () => {
      const membershipId = new mongoose.Types.ObjectId();
      await AppointmentModel.create({
        barberId: new mongoose.Types.ObjectId(),
        clientName: 'Juan',
        clientLastname: 'Perez',
        serviceId: 'svc-1',
        serviceName: 'Corte',
        servicePrice: 500,
        serviceDuration: 30,
        date: '2026-01-01',
        startTime: '10:00',
        endTime: '10:30',
        paymentMethod: 'memberPass',
        membershipId,
      });
      await AppointmentModel.create({
        barberId: new mongoose.Types.ObjectId(),
        clientName: 'Otro',
        clientLastname: 'Cliente',
        serviceId: 'svc-2',
        serviceName: 'Corte',
        servicePrice: 500,
        serviceDuration: 30,
        date: '2026-01-02',
        startTime: '11:00',
        endTime: '11:30',
        paymentMethod: 'local',
      });

      const appointments = await repository.findCouponAppointments(membershipId.toString());

      expect(appointments).toHaveLength(1);
      expect(appointments[0].serviceName).toBe('Corte');
    });
  });

  describe('findAllEntityView', () => {
    it('debe devolver una única membresía por usuario (la más reciente)', async () => {
      const userId = new mongoose.Types.ObjectId();
      await createMembershipDoc({ userId, status: 'expired', createdAt: new Date('2020-01-01') });
      await createMembershipDoc({ userId, status: 'active', createdAt: new Date('2026-01-01') });
      await createMembershipDoc();

      const result = await repository.findAllEntityView({});

      const forUser = result.data.filter((m) => m.userId === userId.toString());
      expect(forUser).toHaveLength(1);
      expect(forUser[0].status).toBe('active');
    });

    it('debe filtrar por status', async () => {
      await createMembershipDoc({ status: 'active' });
      await createMembershipDoc({ status: 'pending' });

      const result = await repository.findAllEntityView({ status: 'pending' });

      expect(result.total).toBe(1);
      expect(result.data[0].status).toBe('pending');
    });
  });
});
