import mongoose from 'mongoose';
import { MongoPaymentRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoPaymentRepository';
import { PaymentModel } from '../../../../src/infrastructure/repositories/mongodb/models/payment.model';
import { Payment } from '../../../../src/domain/entities/Payment';
import type { PaymentType, PaymentStatus } from '../../../../src/domain/types/payment.types';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoPaymentRepository', () => {
  let repository: MongoPaymentRepository;
  const userId = new mongoose.Types.ObjectId().toString();

  const createPaymentDoc = async (overrides: Partial<{ type: PaymentType; status: PaymentStatus; referenceId: string; mpPreferenceId: string; mpPaymentId: string; createdAt: Date }> = {}) => {
    const doc = await PaymentModel.create({
      type: overrides.type ?? 'product_order',
      referenceId: overrides.referenceId ?? 'ref-1',
      status: overrides.status ?? 'pending',
      mpPreferenceId: overrides.mpPreferenceId,
      mpPaymentId: overrides.mpPaymentId,
      amount: 500,
      currency: 'UYU',
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (overrides.createdAt) {
      await PaymentModel.collection.updateOne({ _id: doc._id }, { $set: { createdAt: overrides.createdAt } });
    }
    return doc;
  };

  beforeEach(() => {
    repository = new MongoPaymentRepository();
  });

  afterEach(async () => {
    await PaymentModel.deleteMany({});
  });

  describe('findById', () => {
    it('debe devolver el pago reconstruido', async () => {
      const doc = await createPaymentDoc();
      const found = await repository.findById(doc._id.toString());
      expect(found).not.toBeNull();
      expect(found!.referenceId).toBe('ref-1');
    });

    it('debe devolver null si no existe', async () => {
      const found = await repository.findById(new mongoose.Types.ObjectId().toString());
      expect(found).toBeNull();
    });
  });

  describe('findByMpPreferenceId', () => {
    it('debe encontrar el pago por preferenceId', async () => {
      await createPaymentDoc({ mpPreferenceId: 'pref-123' });
      const found = await repository.findByMpPreferenceId('pref-123');
      expect(found).not.toBeNull();
    });
  });

  describe('findByMpPaymentId', () => {
    it('debe encontrar el pago por mpPaymentId', async () => {
      await createPaymentDoc({ mpPaymentId: 'mp-123' });
      const found = await repository.findByMpPaymentId('mp-123');
      expect(found).not.toBeNull();
    });
  });

  describe('findByReference', () => {
    it('debe encontrar el pago por referencia y tipo', async () => {
      await createPaymentDoc({ referenceId: 'order-9', type: 'product_order' });
      const found = await repository.findByReference('order-9', 'product_order');
      expect(found).not.toBeNull();
    });

    it('debe devolver null si el tipo no coincide', async () => {
      await createPaymentDoc({ referenceId: 'order-9', type: 'product_order' });
      const found = await repository.findByReference('order-9', 'membership');
      expect(found).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('debe devolver los pagos del usuario ordenados por fecha descendente', async () => {
      await createPaymentDoc({ createdAt: new Date('2026-01-01') });
      await createPaymentDoc({ createdAt: new Date('2026-01-10') });

      const payments = await repository.findByUser(userId);

      expect(payments).toHaveLength(2);
      expect(payments[0].createdAt.getTime()).toBeGreaterThan(payments[1].createdAt.getTime());
    });
  });

  describe('save', () => {
    it('debe crear un pago nuevo cuando no tiene id', async () => {
      const payment = Payment.create({ type: 'product_order', referenceId: 'order-1', amount: 500, userId });

      const saved = await repository.save(payment);

      expect(saved.id).toBeTruthy();
      const found = await PaymentModel.findById(saved.id);
      expect(found).not.toBeNull();
    });

    it('debe actualizar un pago existente incluyendo metadata de MP', async () => {
      const doc = await createPaymentDoc();
      const payment = await repository.findById(doc._id.toString());
      payment!.approve('mp-1');
      payment!.enrich({ mpStatusDetail: 'accredited' });

      await repository.save(payment!);

      const updated = await PaymentModel.findById(doc._id);
      expect(updated!.status).toBe('approved');
      expect(updated!.mpPaymentId).toBe('mp-1');
      expect(updated!.mpStatusDetail).toBe('accredited');
    });
  });

  describe('updateMpPreferenceId', () => {
    it('debe actualizar el mpPreferenceId del pago', async () => {
      const doc = await createPaymentDoc();
      await repository.updateMpPreferenceId(doc._id.toString(), 'pref-nuevo');
      const updated = await PaymentModel.findById(doc._id);
      expect(updated!.mpPreferenceId).toBe('pref-nuevo');
    });
  });

  describe('cancelPendingByAppointments', () => {
    it('debe cancelar pagos pendientes de turnos anteriores al corte', async () => {
      const old = await createPaymentDoc({ type: 'appointment', status: 'pending', createdAt: new Date('2020-01-01') });
      await createPaymentDoc({ type: 'product_order', status: 'pending', createdAt: new Date('2020-01-01') });

      const count = await repository.cancelPendingByAppointments(new Date('2025-01-01'));

      expect(count).toBe(1);
      const updated = await PaymentModel.findById(old._id);
      expect(updated!.status).toBe('cancelled');
    });
  });

  describe('cancelOrphanPendingPayments', () => {
    it('debe cancelar pagos pendientes de appointment y product_order anteriores al corte', async () => {
      await createPaymentDoc({ type: 'appointment', status: 'pending', createdAt: new Date('2020-01-01') });
      await createPaymentDoc({ type: 'product_order', status: 'pending', createdAt: new Date('2020-01-01') });
      await createPaymentDoc({ type: 'membership', status: 'pending', createdAt: new Date('2020-01-01') });

      const count = await repository.cancelOrphanPendingPayments(new Date('2025-01-01'));

      expect(count).toBe(2);
    });
  });

  describe('findAll', () => {
    it('debe filtrar por tipo y status con paginación', async () => {
      await createPaymentDoc({ type: 'product_order', status: 'approved' });
      await createPaymentDoc({ type: 'membership', status: 'approved' });

      const result = await repository.findAll({ type: 'product_order' });

      expect(result.total).toBe(1);
      expect(result.data[0].type).toBe('product_order');
    });

    it('debe usar page 1 y limit 20 por defecto', async () => {
      await createPaymentDoc();
      const result = await repository.findAll();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });
});
