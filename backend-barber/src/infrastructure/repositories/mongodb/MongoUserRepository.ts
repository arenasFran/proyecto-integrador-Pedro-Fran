import mongoose from 'mongoose';
import { User } from '../../../domain/entities/User';
import { AppError } from '../../../domain/errors/AppError';
import { Barber } from './models/barber.model';
import { RegisteredClient } from './models/client.model';

export type TwoFactorUpdate = {
  codeHash?: string;
  expiresAt?: Date;
};

export type UserUpdate = {
  name?: string;
  lastname?: string;
  phone?: string;
  email?: string;
  contactEmail?: string;
  passwordHash?: string;
  photoUrl?: string | null;
};

export type UserSecurityUpdate = {
  twoFactorFailedAttempts?: number | null;
  twoFactorLockedUntil?: Date | null;
  resetFailedAttempts?: number | null;
  resetLockedUntil?: Date | null;
};

export type LegalConsent = {
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: Date;
  marketingConsent: boolean;
};

const userFromBarber = (doc: Record<string, any>): User =>
  User.create({
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    lastname: doc.lastname,
    phone: doc.phone,
    kind: doc.kind || 'Empleado',
    authProvider: 'local',
    passwordHash: doc.password,
    photoUrl: doc.photoUrl ?? null,
    twoFactor: {
      codeHash: doc.twoFactorCode,
      expiresAt: doc.twoFactorExpires,
    },
    lastLoginAt: doc.lastLoginAt,
    twoFactorFailedAttempts: doc.twoFactorFailedAttempts,
    twoFactorLockedUntil: doc.twoFactorLockedUntil,
    resetFailedAttempts: doc.resetFailedAttempts,
    resetLockedUntil: doc.resetLockedUntil,
  });

const userFromRegisteredClient = (doc: Record<string, any>): User =>
  User.create({
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    lastname: doc.lastname,
    phone: doc.phone,
    kind: 'Registrado',
    authProvider: doc.authProvider || 'local',
    passwordHash: doc.password,
    googleId: doc.googleId,
    photoUrl: doc.photoUrl ?? null,
    twoFactor: {
      codeHash: doc.twoFactorCode,
      expiresAt: doc.twoFactorExpires,
    },
    lastLoginAt: doc.lastLoginAt,
    twoFactorFailedAttempts: doc.twoFactorFailedAttempts,
    twoFactorLockedUntil: doc.twoFactorLockedUntil,
    resetFailedAttempts: doc.resetFailedAttempts,
    resetLockedUntil: doc.resetLockedUntil,
  });

const userToRegisteredClientData = (user: User) => ({
  email: user.email,
  password: user.passwordHash,
  name: user.name,
  lastname: user.lastname,
  phone: user.phone,
  authProvider: user.authProvider,
  googleId: user.googleId,
  photoUrl: user.photoUrl,
  twoFactorCode: user.twoFactor?.codeHash,
  twoFactorExpires: user.twoFactor?.expiresAt,
  twoFactorFailedAttempts: user.twoFactorFailedAttempts ?? undefined,
  twoFactorLockedUntil: user.twoFactorLockedUntil ?? undefined,
  resetFailedAttempts: user.resetFailedAttempts ?? undefined,
  resetLockedUntil: user.resetLockedUntil ?? undefined,
});

export class MongoUserRepository {
  async findEmailById(userId: string): Promise<string | null> {
    const client = await RegisteredClient.findById(userId).select('email').lean();
    if (client?.email) return client.email;
    const barber = await Barber.findById(userId).select('email').lean();
    return barber?.email ?? null;
  }

  async findRegisteredClients(): Promise<User[]> {
    const docs = await RegisteredClient.find({}).sort({ name: 1 }).lean();
    return docs.map((doc) => userFromRegisteredClient(doc));
  }

  async findByIds(ids: string[]): Promise<Map<string, User>> {
    const userMap = new Map<string, User>();
    if (ids.length === 0) return userMap;

    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    const validIds = ids.filter((id) => objectIdRegex.test(id));
    if (validIds.length === 0) return userMap;
    const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));

    const barbers = await Barber.find({ _id: { $in: objectIds } }).lean();
    for (const doc of barbers) {
      const user = userFromBarber(doc);
      userMap.set(user.id, user);
    }

    const clients = await RegisteredClient.find({ _id: { $in: objectIds } }).lean();
    for (const doc of clients) {
      const user = userFromRegisteredClient(doc);
      userMap.set(user.id, user);
    }

    return userMap;
  }

  async findById(id: string): Promise<User | null> {
    const barber = await Barber.findById(id);
    if (barber) {
      return userFromBarber(barber);
    }

    const client = await RegisteredClient.findById(id);
    if (client) {
      return userFromRegisteredClient(client);
    }

    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const barber = await Barber.findOne({ email: normalizedEmail });
    if (barber) {
      return userFromBarber(barber);
    }

    const client = await RegisteredClient.findOne({ email: normalizedEmail });
    if (client) {
      return userFromRegisteredClient(client);
    }

    return null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const barber = await Barber.findOne({ phone });
    if (barber) {
      return userFromBarber(barber);
    }

    const client = await RegisteredClient.findOne({ phone });
    if (client) {
      return userFromRegisteredClient(client);
    }

    return null;
  }

  async createRegisteredClient(user: User, consent?: LegalConsent): Promise<User> {
    const data = userToRegisteredClientData(user);
    const expectedId = new mongoose.Types.ObjectId();

    try {
      const doc = await RegisteredClient.findOneAndUpdate(
        { email: data.email, kind: 'Registrado' },
        {
          $setOnInsert: {
            ...data,
            ...(consent
              ? {
                  termsVersion: consent.termsVersion,
                  privacyVersion: consent.privacyVersion,
                  acceptedAt: consent.acceptedAt,
                  marketingConsent: consent.marketingConsent,
                }
              : {}),
            _id: expectedId,
            kind: 'Registrado' as const,
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );

      if (!doc) {
        throw new AppError('Error al crear el usuario.', 500);
      }

      if (!doc._id.equals(expectedId)) {
        throw new AppError('El email ya está registrado.', 409);
      }

      return userFromRegisteredClient(doc);
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      if (error?.code === 11000) {
        if (error?.keyPattern?.phone) {
          throw new AppError('El número de teléfono ya está registrado.', 409);
        }
        if (error?.keyPattern?.email) {
          throw new AppError('El email ya está registrado.', 409);
        }
        throw new AppError('El registro ya existe.', 409);
      }
      throw error;
    }
  }

  async update(userId: string, data: UserUpdate): Promise<User | null> {
    const mongoData: Record<string, unknown> = {};

    if (data.name !== undefined) mongoData.name = data.name;
    if (data.lastname !== undefined) mongoData.lastname = data.lastname;
    if (data.phone !== undefined) mongoData.phone = data.phone;
    if (data.email !== undefined) {
      mongoData.email = data.email;
      mongoData.contactEmail = data.email;
    }
    if (data.contactEmail !== undefined) mongoData.contactEmail = data.contactEmail;
    if (data.passwordHash !== undefined) mongoData.password = data.passwordHash;
    if (data.photoUrl !== undefined) mongoData.photoUrl = data.photoUrl;

    const barber = await Barber.findByIdAndUpdate(
      userId,
      { $set: mongoData },
      { returnDocument: 'after', strict: false }
    );
    if (barber) {
      return userFromBarber(barber);
    }

    const client = await RegisteredClient.findByIdAndUpdate(
      userId,
      { $set: mongoData },
      { returnDocument: 'after', strict: false }
    );
    if (client) {
      return userFromRegisteredClient(client);
    }

    return null;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const barber = await Barber.findByIdAndUpdate(userId, { password: passwordHash });
    if (barber) {
      return;
    }
    await RegisteredClient.findByIdAndUpdate(userId, { password: passwordHash });
  }

  async updateTwoFactor(userId: string, update: TwoFactorUpdate): Promise<void> {
    const data = {
      twoFactorCode: update.codeHash,
      twoFactorExpires: update.expiresAt,
    };

    const barber = await Barber.findByIdAndUpdate(userId, data);
    if (barber) {
      return;
    }
    await RegisteredClient.findByIdAndUpdate(userId, data);
  }

  async updateLastLogin(userId: string): Promise<void> {
    const now = new Date();
    const barber = await Barber.findByIdAndUpdate(userId, { lastLoginAt: now });
    if (barber) {
      return;
    }
    await RegisteredClient.findByIdAndUpdate(userId, { lastLoginAt: now });
  }

  async updateUserSecurity(userId: string, update: UserSecurityUpdate): Promise<void> {
    const data: Record<string, unknown> = {};
    if (update.twoFactorFailedAttempts !== undefined) data.twoFactorFailedAttempts = update.twoFactorFailedAttempts;
    if (update.twoFactorLockedUntil !== undefined) data.twoFactorLockedUntil = update.twoFactorLockedUntil;
    if (update.resetFailedAttempts !== undefined) data.resetFailedAttempts = update.resetFailedAttempts;
    if (update.resetLockedUntil !== undefined) data.resetLockedUntil = update.resetLockedUntil;

    const barber = await Barber.findByIdAndUpdate(userId, data);
    if (barber) return;
    await RegisteredClient.findByIdAndUpdate(userId, data);
  }
}
