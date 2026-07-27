import mongoose, { Document } from 'mongoose';
const { Schema } = mongoose;

export interface ITelegramLinkToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const telegramLinkTokenSchema = new Schema<ITelegramLinkToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

telegramLinkTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TelegramLinkToken = mongoose.model<ITelegramLinkToken>('TelegramLinkToken', telegramLinkTokenSchema);
export default TelegramLinkToken;
