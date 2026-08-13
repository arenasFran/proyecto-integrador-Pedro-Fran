import mongoose from 'mongoose';
import { MongoTelegramLinkRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoTelegramLinkRepository';
import TelegramLink from '../../../../src/infrastructure/repositories/mongodb/models/telegramLink.model';
import { TokenCipherService } from '../../../../src/infrastructure/services/TokenCipherService';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoTelegramLinkRepository', () => {
  let repository: MongoTelegramLinkRepository;
  const cipher = new TokenCipherService();

  beforeEach(() => {
    repository = new MongoTelegramLinkRepository();
  });

  afterEach(async () => {
    await TelegramLink.deleteMany({});
  });

  describe('upsert', () => {
    it('debe crear el vínculo cifrando el refreshToken', async () => {
      const userId = new mongoose.Types.ObjectId().toString();

      await repository.upsert({ userId, telegramId: 555, refreshToken: 'raw-refresh-token' });

      const doc = await TelegramLink.findOne({ userId });
      expect(doc).not.toBeNull();
      expect(doc!.telegramId).toBe(555);
      expect(doc!.refreshToken).not.toBe('raw-refresh-token');
      expect(cipher.decrypt(doc!.refreshToken)).toBe('raw-refresh-token');
    });

    it('debe actualizar el vínculo existente (rotación del refreshToken)', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      await repository.upsert({ userId, telegramId: 555, refreshToken: 'token-viejo' });

      await repository.upsert({ userId, telegramId: 555, refreshToken: 'token-nuevo' });

      const docs = await TelegramLink.find({ userId });
      expect(docs).toHaveLength(1);
      expect(cipher.decrypt(docs[0].refreshToken)).toBe('token-nuevo');
    });
  });

  describe('findByTelegramId', () => {
    it('debe devolver el vínculo con el refreshToken descifrado', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      await repository.upsert({ userId, telegramId: 555, refreshToken: 'mi-refresh-token' });

      const found = await repository.findByTelegramId(555);

      expect(found).toEqual({ userId, telegramId: 555, refreshToken: 'mi-refresh-token' });
    });

    it('debe devolver null si no existe el vínculo', async () => {
      const found = await repository.findByTelegramId(999);
      expect(found).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('debe devolver el vínculo con el refreshToken descifrado', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      await repository.upsert({ userId, telegramId: 555, refreshToken: 'mi-refresh-token' });

      const found = await repository.findByUserId(userId);

      expect(found).toEqual({ userId, telegramId: 555, refreshToken: 'mi-refresh-token' });
    });

    it('debe devolver null si no existe el vínculo', async () => {
      const found = await repository.findByUserId(new mongoose.Types.ObjectId().toString());
      expect(found).toBeNull();
    });
  });
});
