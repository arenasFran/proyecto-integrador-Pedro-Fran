import mongoose, { Document } from 'mongoose';
const { Schema } = mongoose;

export interface ITelegramLink extends Document {
  userId: mongoose.Types.ObjectId;
  telegramId: number;
  /**
   * Refresh token cifrado (AES-256-GCM, ver TokenCipherService): el bot lo necesita
   * en texto plano más adelante para presentarlo en /auth/refresh y actuar en nombre
   * de este usuario, así que no puede guardarse solo como hash (a diferencia de
   * RefreshTokenModel). Se cifra en reposo para que una lectura de solo-Mongo no
   * alcance para impersonar al usuario.
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
