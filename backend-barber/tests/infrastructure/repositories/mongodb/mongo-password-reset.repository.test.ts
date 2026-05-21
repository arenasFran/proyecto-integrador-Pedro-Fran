import mongoose from 'mongoose';
import { MongoPasswordResetRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoPasswordResetRepository';
import PasswordReset from '../../../../src/infrastructure/repositories/mongodb/models/passwordReset.model';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoPasswordResetRepository', () => {
  let repository: MongoPasswordResetRepository;

  beforeEach(() => {
    repository = new MongoPasswordResetRepository();
  });

  it('debe crear un token de reset', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await repository.create(userId, 'hash', expiresAt);

    const doc = await PasswordReset.findOne({ tokenHash: 'hash' });
    expect(doc).not.toBeNull();
    expect(doc?.userId.toString()).toBe(userId);
  });

  it('debe verificar y consumir el token', async () => {
    const userId = new mongoose.Types.ObjectId();
    const expiresAt = new Date(Date.now() + 60 * 1000);
    await PasswordReset.create({ userId, tokenHash: 'hash', expiresAt, used: false });

    const token = await repository.verifyAndConsume('hash');

    expect(token).not.toBeNull();
    const updated = await PasswordReset.findOne({ tokenHash: 'hash' });
    expect(updated?.used).toBe(true);
  });

  it('debe devolver null si el token esta expirado', async () => {
    const userId = new mongoose.Types.ObjectId();
    const expiresAt = new Date(Date.now() - 1000);
    await PasswordReset.create({ userId, tokenHash: 'hash', expiresAt, used: false });

    const token = await repository.verifyAndConsume('hash');

    expect(token).toBeNull();
  });
});
