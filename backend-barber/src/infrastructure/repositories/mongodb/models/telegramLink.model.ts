import mongoose, { Document } from 'mongoose';
const { Schema } = mongoose;

export interface ITelegramLink extends Document {
  userId: mongoose.Types.ObjectId;
  telegramId: number;
  /**
   * Refresh token crudo (no hash): el bot lo necesita para presentarlo más adelante
   * en /auth/refresh y actuar en nombre de este usuario. Riesgo aceptado, mismo nivel
   * que cualquier sesión persistente de cliente (ver plan-bot-telegram.md, sección 10).
   */
  refreshToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const telegramLinkSchema = new Schema<ITelegramLink>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    telegramId: { type: Number, required: true, unique: true },
    refreshToken: { type: String, required: true },
  },
  { timestamps: true }
);

const TelegramLink = mongoose.model<ITelegramLink>('TelegramLink', telegramLinkSchema);
export default TelegramLink;
