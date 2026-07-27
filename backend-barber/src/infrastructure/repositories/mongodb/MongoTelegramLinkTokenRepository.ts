import TelegramLinkToken from './models/telegramLinkToken.model';

export type ConsumedTelegramLinkToken = {
  userId: string;
};

export class MongoTelegramLinkTokenRepository {
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await TelegramLinkToken.create({ userId, tokenHash, expiresAt });
  }

  async verifyAndConsume(tokenHash: string): Promise<ConsumedTelegramLinkToken | null> {
    const doc = await TelegramLinkToken.findOneAndUpdate(
      { tokenHash, used: false, expiresAt: { $gt: new Date() } },
      { $set: { used: true } },
      { returnDocument: 'before' }
    );

    if (!doc) {
      return null;
    }

    return { userId: doc.userId.toString() };
  }
}
