import mongoose from 'mongoose';
import { MongoMembershipRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MembershipModel } from '../../../../src/infrastructure/repositories/mongodb/models/membership.model';
import { MEMBERSHIP_DEFAULTS } from '../../../../src/domain/types/membership';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoMembershipRepository — expireExpiredMemberships', () => {
  let repository: MongoMembershipRepository;

  const userId = new mongoose.Types.ObjectId();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const createMembershipDoc = async (overrides: {
    status?: string;
    endDate: Date;
    autoRenew?: boolean;
    couponsUsed?: number;
  }) => {
    return MembershipModel.create({
      userId,
      status: overrides.status ?? 'active',
      startDate: new Date(Date.now() - 60 * DAY_MS),
      endDate: overrides.endDate,
      couponsTotal: 4,
      couponsUsed: overrides.couponsUsed ?? 0,
      productDiscount: 10,
      createdBy: 'client',
      autoRenew: overrides.autoRenew ?? true,
    });
  };

  beforeEach(() => {
    repository = new MongoMembershipRepository();
  });

  afterEach(async () => {
    await MembershipModel.deleteMany({ userId });
  });

  it('debe renovar membresía vencida con autoRenew=true: extiende endDate +30d y resetea couponsUsed', async () => {
    const yesterday = new Date(Date.now() - DAY_MS);
    const doc = await createMembershipDoc({ endDate: yesterday, autoRenew: true, couponsUsed: 3 });

    const result = await repository.expireExpiredMemberships();

    expect(result.expired).toBe(0);
    expect(result.renewed).toBe(1);

    const updated = await MembershipModel.findById(doc._id);
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('active');
    expect(updated!.couponsUsed).toBe(0);

    const expectedEnd = new Date();
    expectedEnd.setDate(expectedEnd.getDate() + MEMBERSHIP_DEFAULTS.durationDays);
    const diffMs = updated!.endDate.getTime() - expectedEnd.getTime();
    expect(Math.abs(diffMs)).toBeLessThan(1000);
  });

  it('debe expirar membresía vencida con autoRenew=false: status pasa a expired, couponsUsed intacto', async () => {
    const yesterday = new Date(Date.now() - DAY_MS);
    const doc = await createMembershipDoc({ endDate: yesterday, autoRenew: false, couponsUsed: 2 });

    const result = await repository.expireExpiredMemberships();

    expect(result.expired).toBe(1);
    expect(result.renewed).toBe(0);

    const updated = await MembershipModel.findById(doc._id);
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('expired');
    expect(updated!.couponsUsed).toBe(2);
  });

  it('no debe tocar membresías no vencidas (autoRenew=true)', async () => {
    const tomorrow = new Date(Date.now() + DAY_MS);
    const doc = await createMembershipDoc({ endDate: tomorrow, autoRenew: true, couponsUsed: 1 });

    const result = await repository.expireExpiredMemberships();

    expect(result.expired).toBe(0);
    expect(result.renewed).toBe(0);

    const updated = await MembershipModel.findById(doc._id);
    expect(updated!.status).toBe('active');
    expect(updated!.couponsUsed).toBe(1);
    expect(updated!.endDate.getTime()).toBe(tomorrow.getTime());
  });

  it('no debe tocar membresías no vencidas (autoRenew=false)', async () => {
    const tomorrow = new Date(Date.now() + DAY_MS);
    const doc = await createMembershipDoc({ endDate: tomorrow, autoRenew: false, couponsUsed: 1 });

    const result = await repository.expireExpiredMemberships();

    expect(result.expired).toBe(0);
    expect(result.renewed).toBe(0);

    const updated = await MembershipModel.findById(doc._id);
    expect(updated!.status).toBe('active');
    expect(updated!.autoRenew).toBe(false);
    expect(updated!.couponsUsed).toBe(1);
  });

  it('debe manejar múltiples membresías vencidas mixtas correctamente', async () => {
    const yesterday = new Date(Date.now() - DAY_MS);
    await createMembershipDoc({ endDate: yesterday, autoRenew: true, couponsUsed: 3 });
    await createMembershipDoc({ endDate: yesterday, autoRenew: false, couponsUsed: 1 });

    const tomorrow = new Date(Date.now() + DAY_MS);
    await createMembershipDoc({ endDate: tomorrow, autoRenew: true, couponsUsed: 0 });

    const result = await repository.expireExpiredMemberships();

    expect(result.expired).toBe(1);
    expect(result.renewed).toBe(1);
  });
});

describeIfMongo('MongoMembershipRepository — updates atómicos (regresión de lost-update)', () => {
  let repository: MongoMembershipRepository;
  const userId = new mongoose.Types.ObjectId();

  const createMembershipDoc = async (overrides: { couponsUsed?: number; autoRenew?: boolean } = {}) => {
    return MembershipModel.create({
      userId,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      couponsTotal: 4,
      couponsUsed: overrides.couponsUsed ?? 0,
      productDiscount: 10,
      createdBy: 'client',
      autoRenew: overrides.autoRenew ?? true,
    });
  };

  beforeEach(() => {
    repository = new MongoMembershipRepository();
  });

  afterEach(async () => {
    await MembershipModel.deleteMany({ userId });
  });

  it('debe aplicar dos incrementCouponsUsed concurrentes sin perder ninguno (a diferencia del viejo save() que sobreescribía todo)', async () => {
    const doc = await createMembershipDoc({ couponsUsed: 0 });

    await Promise.all([
      repository.incrementCouponsUsed(doc._id.toString(), 1),
      repository.incrementCouponsUsed(doc._id.toString(), 1),
    ]);

    const updated = await MembershipModel.findById(doc._id);
    expect(updated!.couponsUsed).toBe(2);
  });

  it('incrementCouponsUsed no debe bajar de 0', async () => {
    const doc = await createMembershipDoc({ couponsUsed: 0 });

    await repository.incrementCouponsUsed(doc._id.toString(), -1);

    const updated = await MembershipModel.findById(doc._id);
    expect(updated!.couponsUsed).toBe(0);
  });

  it('updateAutoRenew no debe tocar couponsUsed aunque haya cambiado por otra operación concurrente', async () => {
    const doc = await createMembershipDoc({ couponsUsed: 2, autoRenew: true });

    await Promise.all([
      repository.incrementCouponsUsed(doc._id.toString(), 1),
      repository.updateAutoRenew(doc._id.toString(), false),
    ]);

    const updated = await MembershipModel.findById(doc._id);
    expect(updated!.couponsUsed).toBe(3);
    expect(updated!.autoRenew).toBe(false);
  });
});
