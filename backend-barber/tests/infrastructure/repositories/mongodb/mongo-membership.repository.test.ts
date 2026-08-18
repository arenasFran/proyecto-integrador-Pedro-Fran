import mongoose from 'mongoose';
import { MongoMembershipRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MembershipModel } from '../../../../src/infrastructure/repositories/mongodb/models/membership.model';
import { MEMBERSHIP_DEFAULTS, type MembershipStatus } from '../../../../src/domain/types/membership';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoMembershipRepository — expireExpiredMemberships', () => {
  let repository: MongoMembershipRepository;

  const userId = new mongoose.Types.ObjectId();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const createdUserIds: mongoose.Types.ObjectId[] = [userId];

  const createMembershipDoc = async (overrides: {
    userId?: mongoose.Types.ObjectId;
    status?: MembershipStatus;
    endDate: Date;
    couponsUsed?: number;
  }) => {
    return MembershipModel.create({
      userId: overrides.userId ?? userId,
      status: overrides.status ?? 'active',
      startDate: new Date(Date.now() - 60 * DAY_MS),
      endDate: overrides.endDate,
      couponsTotal: 4,
      couponsUsed: overrides.couponsUsed ?? 0,
      productDiscount: 10,
      createdBy: 'client',
    });
  };

  beforeEach(() => {
    repository = new MongoMembershipRepository();
  });

  afterEach(async () => {
    await MembershipModel.deleteMany({ userId: { $in: createdUserIds } });
  });

  it('debe expirar membresía vencida (endDate < now): status pasa a expired', async () => {
    const yesterday = new Date(Date.now() - DAY_MS);
    const doc = await createMembershipDoc({ endDate: yesterday, couponsUsed: 2 });

    const expired = await repository.expireExpiredMemberships();

    expect(expired).toBe(1);

    const updated = await MembershipModel.findById(doc._id);
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('expired');
    expect(updated!.couponsUsed).toBe(2);
  });

  it('no debe tocar membresías no vencidas', async () => {
    const tomorrow = new Date(Date.now() + DAY_MS);
    const doc = await createMembershipDoc({ endDate: tomorrow, couponsUsed: 1 });

    const expired = await repository.expireExpiredMemberships();

    expect(expired).toBe(0);

    const updated = await MembershipModel.findById(doc._id);
    expect(updated!.status).toBe('active');
    expect(updated!.couponsUsed).toBe(1);
  });

  it('debe manejar múltiples membresías vencidas', async () => {
    // Cada usuario solo puede tener una membresía 'active' a la vez (índice único
    // parcial userId+status), así que "múltiples vencidas" se simula con usuarios
    // distintos, no reutilizando el mismo userId con dos membresías activas.
    const otherUserId1 = new mongoose.Types.ObjectId();
    const otherUserId2 = new mongoose.Types.ObjectId();
    createdUserIds.push(otherUserId1, otherUserId2);

    const yesterday = new Date(Date.now() - DAY_MS);
    await createMembershipDoc({ userId: otherUserId1, endDate: yesterday, couponsUsed: 3 });
    await createMembershipDoc({ userId: otherUserId2, endDate: yesterday, couponsUsed: 1 });

    const tomorrow = new Date(Date.now() + DAY_MS);
    await createMembershipDoc({ endDate: tomorrow, couponsUsed: 0 });

    const expired = await repository.expireExpiredMemberships();

    expect(expired).toBe(2);
  });
});

describeIfMongo('MongoMembershipRepository — updates atómicos (regresión de lost-update)', () => {
  let repository: MongoMembershipRepository;
  const userId = new mongoose.Types.ObjectId();

  const createMembershipDoc = async (overrides: { couponsUsed?: number } = {}) => {
    return MembershipModel.create({
      userId,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      couponsTotal: 4,
      couponsUsed: overrides.couponsUsed ?? 0,
      productDiscount: 10,
      createdBy: 'client',
    });
  };

  beforeEach(() => {
    repository = new MongoMembershipRepository();
  });

  afterEach(async () => {
    await MembershipModel.deleteMany({ userId });
  });

  it('debe aplicar dos incrementCouponsUsed concurrentes sin perder ninguno', async () => {
    const doc = await createMembershipDoc({ couponsUsed: 0 });

    await Promise.all([
      repository.incrementCouponsUsed(doc._id.toString(), 1),
      repository.incrementCouponsUsed(doc._id.toString(), 1),
    ]);

    const updated = await MembershipModel.findById(doc._id);
    expect(updated!.couponsUsed).toBe(2);
  });

  it('incrementCouponsUsed no debe permitir superar couponsTotal (canje concurrente)', async () => {
    const doc = await createMembershipDoc({ couponsUsed: 3 });

    const [first, second] = await Promise.all([
      repository.incrementCouponsUsed(doc._id.toString(), 1),
      repository.incrementCouponsUsed(doc._id.toString(), 1),
    ]);

    const results = [first, second];
    expect(results.filter((r) => r !== null)).toHaveLength(1);
    expect(results.filter((r) => r === null)).toHaveLength(1);

    const updated = await MembershipModel.findById(doc._id);
    expect(updated!.couponsUsed).toBe(4);
  });

  it('incrementCouponsUsed devuelve null si ya no quedan cupones disponibles', async () => {
    const doc = await createMembershipDoc({ couponsUsed: 4 });

    const result = await repository.incrementCouponsUsed(doc._id.toString(), 1);

    expect(result).toBeNull();
    const updated = await MembershipModel.findById(doc._id);
    expect(updated!.couponsUsed).toBe(4);
  });

  it('incrementCouponsUsed no debe bajar de 0', async () => {
    const doc = await createMembershipDoc({ couponsUsed: 0 });

    await repository.incrementCouponsUsed(doc._id.toString(), -1);

    const updated = await MembershipModel.findById(doc._id);
    expect(updated!.couponsUsed).toBe(0);
  });
});
