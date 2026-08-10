import mongoose from 'mongoose';
import { MongoMembershipTransactionRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoMembershipTransactionRepository';
import { MembershipTransactionModel } from '../../../../src/infrastructure/repositories/mongodb/models/membership-transaction.model';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoMembershipTransactionRepository', () => {
  let repository: MongoMembershipTransactionRepository;
  const userId = new mongoose.Types.ObjectId().toString();
  const membershipId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    repository = new MongoMembershipTransactionRepository();
  });

  afterEach(async () => {
    await MembershipTransactionModel.deleteMany({});
  });

  describe('create', () => {
    it('debe crear una transacción y devolver sus datos', async () => {
      const created = await repository.create({
        userId,
        membershipId,
        amount: 500,
        paymentMethod: 'mercadopago',
        mpPaymentId: 'mp-1',
        createdBy: 'client',
      });

      expect(created.id).toBeTruthy();
      expect(created.userId).toBe(userId);
      expect(created.membershipId).toBe(membershipId);
      expect(created.mpPaymentId).toBe('mp-1');
    });

    it('debe permitir crear una transacción admin con adminId', async () => {
      const adminId = new mongoose.Types.ObjectId().toString();
      const created = await repository.create({
        userId,
        membershipId,
        amount: 500,
        paymentMethod: 'local',
        createdBy: 'admin',
        adminId,
      });

      expect(created.adminId).toBe(adminId);
      expect(created.createdBy).toBe('admin');
    });
  });

  describe('findByMpPaymentId', () => {
    it('debe encontrar la transacción por mpPaymentId', async () => {
      await repository.create({ userId, membershipId, amount: 500, paymentMethod: 'mercadopago', mpPaymentId: 'mp-x', createdBy: 'client' });
      const found = await repository.findByMpPaymentId('mp-x');
      expect(found).not.toBeNull();
    });

    it('debe devolver null si no existe', async () => {
      const found = await repository.findByMpPaymentId('no-existe');
      expect(found).toBeNull();
    });
  });

  describe('findByMembershipId', () => {
    it('debe devolver las transacciones de la membresía paginadas', async () => {
      await repository.create({ userId, membershipId, amount: 500, paymentMethod: 'local', createdBy: 'client' });
      await repository.create({ userId, membershipId, amount: 500, paymentMethod: 'local', createdBy: 'client' });

      const result = await repository.findByMembershipId(membershipId, { page: 1, limit: 1 });

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findByUser', () => {
    it('debe filtrar por paymentMethod', async () => {
      await repository.create({ userId, membershipId, amount: 500, paymentMethod: 'mercadopago', createdBy: 'client' });
      await repository.create({ userId, membershipId, amount: 500, paymentMethod: 'local', createdBy: 'client' });

      const result = await repository.findByUser(userId, { paymentMethod: 'local' });

      expect(result.total).toBe(1);
      expect(result.data[0].paymentMethod).toBe('local');
    });

    it('debe filtrar por rango de fechas desde/hasta', async () => {
      await repository.create({ userId, membershipId, amount: 500, paymentMethod: 'local', createdBy: 'client' });

      const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = await repository.findByUser(userId, {
        desde: '2020-01-01',
        hasta: future.toISOString().slice(0, 10),
      });

      expect(result.total).toBe(1);
    });

    it('no debe devolver transacciones fuera del rango', async () => {
      await repository.create({ userId, membershipId, amount: 500, paymentMethod: 'local', createdBy: 'client' });

      const result = await repository.findByUser(userId, { desde: '2020-01-01', hasta: '2020-01-31' });

      expect(result.total).toBe(0);
    });
  });

  describe('findAll', () => {
    it('debe devolver todas las transacciones paginadas', async () => {
      await repository.create({ userId, membershipId, amount: 500, paymentMethod: 'local', createdBy: 'client' });
      await repository.create({ userId, membershipId, amount: 500, paymentMethod: 'mercadopago', createdBy: 'admin' });

      const result = await repository.findAll({ page: 1, limit: 20 });

      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
    });

    it('debe filtrar por paymentMethod', async () => {
      await repository.create({ userId, membershipId, amount: 500, paymentMethod: 'local', createdBy: 'client' });
      await repository.create({ userId, membershipId, amount: 500, paymentMethod: 'mercadopago', createdBy: 'client' });

      const result = await repository.findAll({ paymentMethod: 'mercadopago' });

      expect(result.total).toBe(1);
    });

    it('debe filtrar por rango de fechas', async () => {
      await repository.create({ userId, membershipId, amount: 500, paymentMethod: 'local', createdBy: 'client' });

      const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = await repository.findAll({ hasta: future.toISOString().slice(0, 10) });

      expect(result.total).toBe(1);
    });
  });
});
