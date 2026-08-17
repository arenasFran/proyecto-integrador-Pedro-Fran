import mongoose from 'mongoose';
import { MongoOrderRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoOrderRepository';
import { OrderModel } from '../../../../src/infrastructure/repositories/mongodb/models/order.model';
import { Order } from '../../../../src/domain/entities/Order';
import type { OrderStatus } from '../../../../src/domain/types/order.types';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoOrderRepository', () => {
  let repository: MongoOrderRepository;

  const createOrderDoc = async (overrides: Partial<{ userId: string; status: OrderStatus; createdAt: Date; total: number }> = {}) => {
    const doc = await OrderModel.create({
      userId: overrides.userId ?? 'user-1',
      items: [{ productId: 'prod-1', name: 'Cera', price: 100, quantity: 1 }],
      total: overrides.total ?? 100,
      status: overrides.status ?? 'pending',
      statusHistory: [{ status: 'pending', timestamp: new Date(), actor: 'system' }],
    });
    if (overrides.createdAt) {
      // mongoose ignora $set.createdAt en updateOne por el plugin de timestamps;
      // hay que escribirlo con la colección nativa para poder simular fechas pasadas.
      await OrderModel.collection.updateOne({ _id: doc._id }, { $set: { createdAt: overrides.createdAt } });
    }
    return doc;
  };

  beforeEach(() => {
    repository = new MongoOrderRepository();
  });

  afterEach(async () => {
    await OrderModel.deleteMany({});
  });

  describe('findById', () => {
    it('debe devolver la orden reconstruida como entidad de dominio', async () => {
      const doc = await createOrderDoc();
      const found = await repository.findById(doc._id.toString());
      expect(found).not.toBeNull();
      expect(found!.userId).toBe('user-1');
      expect(found!.total).toBe(100);
    });

    it('debe devolver null si no existe', async () => {
      const found = await repository.findById(new mongoose.Types.ObjectId().toString());
      expect(found).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('debe devolver las órdenes del usuario ordenadas por fecha descendente', async () => {
      await createOrderDoc({ userId: 'user-1', createdAt: new Date('2026-01-01') });
      await createOrderDoc({ userId: 'user-1', createdAt: new Date('2026-01-05') });
      await createOrderDoc({ userId: 'user-2' });

      const orders = await repository.findByUser('user-1');

      expect(orders).toHaveLength(2);
      expect(orders[0].createdAt.getTime()).toBeGreaterThan(orders[1].createdAt.getTime());
    });
  });

  describe('findAll', () => {
    it('debe filtrar por status', async () => {
      await createOrderDoc({ status: 'pending' });
      await createOrderDoc({ status: 'paid' });

      const result = await repository.findAll({ status: 'paid' });

      expect(result.total).toBe(1);
      expect(result.data[0].status).toBe('paid');
    });

    it('debe paginar los resultados', async () => {
      for (let i = 0; i < 3; i++) await createOrderDoc();

      const result = await repository.findAll({ page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
    });

    it('debe filtrar por rango de fechas desde/hasta', async () => {
      await createOrderDoc({ createdAt: new Date('2026-01-01T12:00:00Z') });
      await createOrderDoc({ createdAt: new Date('2026-02-01T12:00:00Z') });

      const result = await repository.findAll({ desde: '2026-01-01', hasta: '2026-01-31' });

      expect(result.total).toBe(1);
    });

    it('debe filtrar solo con desde', async () => {
      await createOrderDoc({ createdAt: new Date('2026-01-01T12:00:00Z') });
      await createOrderDoc({ createdAt: new Date('2026-02-01T12:00:00Z') });

      const result = await repository.findAll({ desde: '2026-01-15' });

      expect(result.total).toBe(1);
    });

    it('debe filtrar solo con hasta', async () => {
      await createOrderDoc({ createdAt: new Date('2026-01-01T12:00:00Z') });
      await createOrderDoc({ createdAt: new Date('2026-02-01T12:00:00Z') });

      const result = await repository.findAll({ hasta: '2026-01-15' });

      expect(result.total).toBe(1);
    });
  });

  describe('cancelPendingOlderThan', () => {
    it('debe cancelar órdenes pendientes anteriores al corte', async () => {
      const old = await createOrderDoc({ status: 'pending', createdAt: new Date('2020-01-01') });
      await createOrderDoc({ status: 'pending', createdAt: new Date() });

      const count = await repository.cancelPendingOlderThan(new Date('2025-01-01'));

      expect(count).toBe(1);
      const updated = await OrderModel.findById(old._id);
      expect(updated!.status).toBe('cancelled');
    });

    it('no debe tocar órdenes que no están pendientes', async () => {
      await createOrderDoc({ status: 'paid', createdAt: new Date('2020-01-01') });

      const count = await repository.cancelPendingOlderThan(new Date());

      expect(count).toBe(0);
    });
  });

  describe('delete', () => {
    it('debe eliminar la orden', async () => {
      const doc = await createOrderDoc();
      await repository.delete(doc._id.toString());
      const found = await OrderModel.findById(doc._id);
      expect(found).toBeNull();
    });
  });

  describe('save', () => {
    it('debe crear una orden nueva cuando no tiene id', async () => {
      const order = Order.create({
        userId: 'user-1',
        items: [{ productId: 'prod-1', name: 'Cera', price: 100, quantity: 1 }],
      });

      const saved = await repository.save(order);

      expect(saved.id).toBeTruthy();
      const found = await OrderModel.findById(saved.id);
      expect(found).not.toBeNull();
      expect(found!.total).toBe(100);
    });

    it('debe actualizar una orden existente', async () => {
      const doc = await createOrderDoc({ status: 'pending' });
      const order = await repository.findById(doc._id.toString());
      order!.pay('pay-1');

      await repository.save(order!);

      const updated = await OrderModel.findById(doc._id);
      expect(updated!.status).toBe('paid');
      expect(updated!.paymentId).toBe('pay-1');
    });
  });
});
