import { User } from '../../../domain/entities/User';
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

  async createRegisteredClient(user: User): Promise<User> {
    const doc = await RegisteredClient.create(userToRegisteredClientData(user));
    return userFromRegisteredClient(doc);
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
