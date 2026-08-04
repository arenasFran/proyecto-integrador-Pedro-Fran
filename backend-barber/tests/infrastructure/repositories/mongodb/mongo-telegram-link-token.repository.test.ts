import mongoose from 'mongoose';
import { MongoTelegramLinkTokenRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoTelegramLinkTokenRepository';
import TelegramLinkToken from '../../../../src/infrastructure/repositories/mongodb/models/telegramLinkToken.model';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoTelegramLinkTokenRepository — verifyAndConsume', () => {
  let repository: MongoTelegramLinkTokenRepository;
  const userId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    repository = new MongoTelegramLinkTokenRepository();
  });

  afterEach(async () => {
    await TelegramLinkToken.deleteMany({ userId });
  });

  it('consume un token valido y devuelve el userId dueño', async () => {
    await repository.create(userId, 'hash-abc', new Date(Date.now() + 60_000));

    const result = await repository.verifyAndConsume('hash-abc');

    expect(result).toEqual({ userId });
  });

  it('no permite consumir el mismo token dos veces', async () => {
    await repository.create(userId, 'hash-once', new Date(Date.now() + 60_000));

    const first = await repository.verifyAndConsume('hash-once');
    const second = await repository.verifyAndConsume('hash-once');

    expect(first).toEqual({ userId });
    expect(second).toBeNull();
  });

  it('no permite consumir un token expirado', async () => {
    await repository.create(userId, 'hash-expired', new Date(Date.now() - 1000));

    const result = await repository.verifyAndConsume('hash-expired');

    expect(result).toBeNull();
  });

  it('devuelve null para un hash que no existe', async () => {
    const result = await repository.verifyAndConsume('hash-inexistente');

    expect(result).toBeNull();
  });
});
