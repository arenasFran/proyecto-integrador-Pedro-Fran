import TelegramLink from './models/telegramLink.model';

export type TelegramLinkRecord = {
  userId: string;
  telegramId: number;
  refreshToken: string;
};

export type TelegramLinkUpsertInput = {
  userId: string;
  telegramId: number;
  refreshToken: string;
};

export class MongoTelegramLinkRepository {
  async findByTelegramId(telegramId: number): Promise<TelegramLinkRecord | null> {
    const doc = await TelegramLink.findOne({ telegramId }).lean();
    if (!doc) return null;
    return { userId: doc.userId.toString(), telegramId: doc.telegramId, refreshToken: doc.refreshToken };
  }

  async findByUserId(userId: string): Promise<TelegramLinkRecord | null> {
    const doc = await TelegramLink.findOne({ userId }).lean();
    if (!doc) return null;
    return { userId: doc.userId.toString(), telegramId: doc.telegramId, refreshToken: doc.refreshToken };
  }

  async upsert(input: TelegramLinkUpsertInput): Promise<void> {
    await TelegramLink.findOneAndUpdate(
      { userId: input.userId },
      { $set: { telegramId: input.telegramId, refreshToken: input.refreshToken } },
      { upsert: true }
    );
  }
}
