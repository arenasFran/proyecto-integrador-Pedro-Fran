import crypto from 'crypto';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { Email } from '../../../domain/value-objects/Email';
import { AppError } from '../../../domain/errors/AppError';
import { registerTwoFactorFailure } from './twoFactorLockout';
import { sendMailWithRetry } from '../shared/sendMailWithRetry';

type TwoFactorSendDTO = {
  email: string;
  password: string;
};
import { IEmailService } from '../../ports/IEmailService';
import { IHashService } from '../../ports/IHashService';
import { IPasswordHasher } from '../../ports/IPasswordHasher';

export class SendTwoFactorCodeUseCase {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly emailService: IEmailService,
    private readonly hashService: IHashService
  ) {}

  async execute(dto: TwoFactorSendDTO): Promise<{ message: string }> {
    const email = Email.create(dto.email).getValue();

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Email y/o contraseña incorrectos.', 401);
    }

    if (!user.passwordHash) {
      throw new AppError(
        'Este usuario se registró con Google, usá ese método para ingresar.',
        401
      );
    }

    if (user.twoFactorLockedUntil && new Date() < user.twoFactorLockedUntil) {
      const remainingMin = Math.ceil(
        (user.twoFactorLockedUntil.getTime() - new Date().getTime()) / 60000
      );
      throw new AppError(
        `Demasiados intentos fallidos de verificación. Intentalo de nuevo en ${remainingMin} minutos.`,
        429
      );
    }

    const isValid = await this.passwordHasher.compare(dto.password, user.passwordHash);
    if (!isValid) {
      // Cuenta la contraseña incorrecta contra el mismo contador/bloqueo que el código 2FA:
      // sin esto, alcanzaba con el rate limit por IP para probar contraseñas sin límite por cuenta.
      await registerTwoFactorFailure(
        this.userRepository,
        user.id,
        user.twoFactorFailedAttempts || 0,
        'Email y/o contraseña incorrectos.'
      );
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(new Date().getTime() + 5 * 60 * 1000);
    const codeHash = this.hashService.sha256(code);

    const sent = await sendMailWithRetry(
      this.emailService,
      {
        to: email,
        subject: 'Tu código de verificación',
        html: `<h2>Tu código es: <strong>${code}</strong></h2><p>Expira en 5 minutos.</p>`,
      },
      `Error enviando email 2FA a ${email}`
    );

    if (!sent) {
      throw new AppError(
        'No se pudo enviar el código de verificación. Servicio de correo no disponible, intentá de nuevo.',
        500
      );
    }

    await this.userRepository.updateTwoFactor(user.id, {
      codeHash,
      expiresAt,
    });

    return { message: 'Código enviado al email' };
  }
}


