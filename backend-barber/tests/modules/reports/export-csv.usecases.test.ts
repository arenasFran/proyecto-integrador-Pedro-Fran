import mongoose from 'mongoose';
import { ExportOrdersCsvUseCase } from '../../../src/application/use-cases/reports/ExportOrdersCsvUseCase';
import { ExportSalesCsvUseCase } from '../../../src/application/use-cases/reports/ExportSalesCsvUseCase';
import { ExportProductsCsvUseCase } from '../../../src/application/use-cases/reports/ExportProductsCsvUseCase';
import { ExportMembershipsCsvUseCase } from '../../../src/application/use-cases/reports/ExportMembershipsCsvUseCase';
import { OrderModel } from '../../../src/infrastructure/repositories/mongodb/models/order.model';
import { PaymentModel } from '../../../src/infrastructure/repositories/mongodb/models/payment.model';
import { ProductModel } from '../../../src/infrastructure/repositories/mongodb/models/product.model';
import { MembershipModel } from '../../../src/infrastructure/repositories/mongodb/models/membership.model';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('Export*CsvUseCase (reportes)', () => {
  afterEach(async () => {
    await Promise.all([
      OrderModel.deleteMany({}),
      PaymentModel.deleteMany({}),
      ProductModel.deleteMany({}),
      MembershipModel.deleteMany({}),
    ]);
  });

  describe('ExportOrdersCsvUseCase', () => {
    const useCase = new ExportOrdersCsvUseCase();

    it('debe devolver solo el header si no hay órdenes', async () => {
      const csv = await useCase.execute({});
      const lines = csv.split('\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe('ID,Usuario,Total,Estado,Items,Creado');
    });

    it('debe listar las órdenes con sus items concatenados', async () => {
      await OrderModel.create({
        userId: 'user-1',
        items: [
          { productId: 'p1', name: 'Cera', price: 100, quantity: 2 },
          { productId: 'p2', name: 'Gel', price: 50, quantity: 1 },
        ],
        total: 250,
        status: 'paid',
        statusHistory: [{ status: 'paid', timestamp: new Date(), actor: 'system' }],
      });

      const csv = await useCase.execute({});
      const lines = csv.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('user-1');
      expect(lines[1]).toContain('250');
      expect(lines[1]).toContain('paid');
      expect(lines[1]).toContain('Cerax2;Gelx1');
    });

    it('debe filtrar por status', async () => {
      await OrderModel.create({ userId: 'u1', items: [{ productId: 'p1', name: 'A', price: 10, quantity: 1 }], total: 10, status: 'pending', statusHistory: [] });
      await OrderModel.create({ userId: 'u2', items: [{ productId: 'p1', name: 'A', price: 10, quantity: 1 }], total: 10, status: 'paid', statusHistory: [] });

      const csv = await useCase.execute({ status: 'paid' });
      const lines = csv.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('u2');
    });

    it('debe filtrar por rango de fechas', async () => {
      const oldOrder = await OrderModel.create({ userId: 'u-old', items: [{ productId: 'p1', name: 'A', price: 10, quantity: 1 }], total: 10, status: 'paid', statusHistory: [] });
      await OrderModel.collection.updateOne({ _id: oldOrder._id }, { $set: { createdAt: new Date('2020-01-01') } });
      await OrderModel.create({ userId: 'u-new', items: [{ productId: 'p1', name: 'A', price: 10, quantity: 1 }], total: 10, status: 'paid', statusHistory: [] });

      const csv = await useCase.execute({ desde: '2025-01-01', hasta: '2030-01-01' });
      const lines = csv.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('u-new');
    });
  });

  describe('ExportSalesCsvUseCase', () => {
    const useCase = new ExportSalesCsvUseCase();

    it('debe devolver solo el header si no hay pagos aprobados', async () => {
      await PaymentModel.create({
        type: 'product_order', referenceId: 'ref-1', status: 'pending', amount: 100, currency: 'UYU', userId: new mongoose.Types.ObjectId(),
      });

      const csv = await useCase.execute({});
      expect(csv.split('\n')).toHaveLength(1);
    });

    it('debe listar solo los pagos aprobados', async () => {
      const userId = new mongoose.Types.ObjectId();
      await PaymentModel.create({ type: 'product_order', referenceId: 'ref-1', status: 'approved', amount: 500, currency: 'UYU', userId });
      await PaymentModel.create({ type: 'membership', referenceId: 'ref-2', status: 'rejected', amount: 300, currency: 'UYU', userId });

      const csv = await useCase.execute({});
      const lines = csv.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('product_order');
      expect(lines[1]).toContain('ref-1');
      expect(lines[1]).toContain('500');
    });

    it('debe filtrar por rango de fechas', async () => {
      const userId = new mongoose.Types.ObjectId();
      const oldPayment = await PaymentModel.create({ type: 'product_order', referenceId: 'ref-old', status: 'approved', amount: 100, currency: 'UYU', userId });
      await PaymentModel.collection.updateOne({ _id: oldPayment._id }, { $set: { createdAt: new Date('2020-01-01') } });
      await PaymentModel.create({ type: 'product_order', referenceId: 'ref-new', status: 'approved', amount: 100, currency: 'UYU', userId });

      const csv = await useCase.execute({ desde: '2025-01-01', hasta: '2030-01-01' });
      const lines = csv.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('ref-new');
    });
  });

  describe('ExportProductsCsvUseCase', () => {
    const useCase = new ExportProductsCsvUseCase();

    it('debe listar los productos ordenados por nombre, excluyendo eliminados', async () => {
      await ProductModel.create({ name: 'Zeta', description: 'd', price: 100, stock: 5, category: 'a', status: 'active' });
      await ProductModel.create({ name: 'Alfa', description: 'd', price: 200, stock: 3, category: 'b', status: 'active' });
      await ProductModel.create({ name: 'Borrado', description: 'd', price: 300, stock: 1, category: 'c', status: 'deleted' });

      const csv = await useCase.execute();
      const lines = csv.split('\n');

      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('ID,Nombre,Categoría,Precio,Stock,Estado');
      expect(lines[1]).toContain('Alfa');
      expect(lines[2]).toContain('Zeta');
      expect(csv).not.toContain('Borrado');
    });
  });

  describe('ExportMembershipsCsvUseCase', () => {
    const useCase = new ExportMembershipsCsvUseCase();

    it('debe listar las membresías con sus cupones', async () => {
      const userId = new mongoose.Types.ObjectId();
      await MembershipModel.create({
        userId, status: 'active', price: 399, startDate: new Date('2026-01-01'), endDate: new Date('2026-02-01'),
        couponsTotal: 4, couponsUsed: 1, productDiscount: 10, createdBy: 'client',
      });

      const csv = await useCase.execute({});
      const lines = csv.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('active');
      expect(lines[1]).toContain('399');
      expect(lines[1]).toContain('1,4');
    });

    it('debe filtrar por status', async () => {
      const userId = new mongoose.Types.ObjectId();
      await MembershipModel.create({ userId, status: 'active', price: 399, startDate: new Date(), endDate: new Date(), couponsTotal: 4, couponsUsed: 0, productDiscount: 10, createdBy: 'client' });
      await MembershipModel.create({ userId: new mongoose.Types.ObjectId(), status: 'expired', price: 399, startDate: new Date(), endDate: new Date(), couponsTotal: 4, couponsUsed: 0, productDiscount: 10, createdBy: 'client' });

      const csv = await useCase.execute({ status: 'expired' });
      const lines = csv.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('expired');
    });

    it('debe filtrar por rango de fechas (createdAt)', async () => {
      const userId = new mongoose.Types.ObjectId();
      const old = await MembershipModel.create({ userId, status: 'expired', price: 399, startDate: new Date(), endDate: new Date(), couponsTotal: 4, couponsUsed: 0, productDiscount: 10, createdBy: 'client' });
      await MembershipModel.collection.updateOne({ _id: old._id }, { $set: { createdAt: new Date('2020-01-01') } });
      await MembershipModel.create({ userId, status: 'active', price: 399, startDate: new Date(), endDate: new Date(), couponsTotal: 4, couponsUsed: 0, productDiscount: 10, createdBy: 'client' });

      const csv = await useCase.execute({ desde: '2025-01-01', hasta: '2030-01-01' });
      const lines = csv.split('\n');

      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('active');
    });
  });
});
