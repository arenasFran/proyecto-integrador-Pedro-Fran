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
    };
  }
}
