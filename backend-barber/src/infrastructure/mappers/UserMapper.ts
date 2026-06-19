import { User } from '../../domain/entities/User';
import {
    IAdmin,
    IBarberBase,
    IEmployee,
} from '../repositories/mongodb/models/barber.model';
import {
    IRegisteredClient,
} from '../repositories/mongodb/models/client.model';

export class UserMapper {
  static fromBarber(doc: IBarberBase): User {
    return User.create({
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name,
      lastname: doc.lastname,
      phone: doc.phone,
      kind: (doc as IAdmin | IEmployee).kind || 'Empleado',
      authProvider: 'local',
      passwordHash: doc.password,
      twoFactor: {
        codeHash: doc.twoFactorCode,
        expiresAt: doc.twoFactorExpires,
      },
      lastLoginAt: doc.lastLoginAt,
      twoFactorFailedAttempts: doc.twoFactorFailedAttempts,
      twoFactorLockedUntil: doc.twoFactorLockedUntil,
      resetFailedAttempts: doc.resetFailedAttempts,
      resetLockedUntil: doc.resetLockedUntil,
      photoUrl: (doc as IBarberBase & { photoUrl?: string | null }).photoUrl ?? null,
    });
  }

  static fromRegisteredClient(doc: IRegisteredClient): User {
    return User.create({
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name,
      lastname: doc.lastname,
      phone: doc.phone,
      kind: 'Registrado',
      authProvider: doc.authProvider || 'local',
      passwordHash: doc.password,
      googleId: doc.googleId,
      twoFactor: {
        codeHash: doc.twoFactorCode,
        expiresAt: doc.twoFactorExpires,
      },
      lastLoginAt: doc.lastLoginAt,
      twoFactorFailedAttempts: doc.twoFactorFailedAttempts,
      twoFactorLockedUntil: doc.twoFactorLockedUntil,
      resetFailedAttempts: doc.resetFailedAttempts,
      resetLockedUntil: doc.resetLockedUntil,
      photoUrl: doc.photoUrl ?? null,
    });
  }

  static toRegisteredClientData(user: User) {
    return {
      email: user.email,
      password: user.passwordHash,
      name: user.name,
      lastname: user.lastname,
      phone: user.phone,
      authProvider: user.authProvider,
      googleId: user.googleId,
      twoFactorCode: user.twoFactor?.codeHash,
      twoFactorExpires: user.twoFactor?.expiresAt,
      twoFactorFailedAttempts: user.twoFactorFailedAttempts ?? undefined,
      twoFactorLockedUntil: user.twoFactorLockedUntil ?? undefined,
      resetFailedAttempts: user.resetFailedAttempts ?? undefined,
      resetLockedUntil: user.resetLockedUntil ?? undefined,
    };
  }
}
