import crypto from 'crypto';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { Email } from '../../../domain/value-objects/Email';
import { AppError } from '../../errors/AppError';

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

    const isValid = await this.passwordHasher.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Email y/o contraseña incorrectos.', 401);
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

    await this.userRepository.updateUserSecurity(user.id, {
      twoFactorFailedAttempts: 0,
      twoFactorLockedUntil: null,
    });

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(new Date().getTime() + 5 * 60 * 1000);
    const codeHash = this.hashService.sha256(code);

    let lastError: unknown;
    let sent = false;
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        await this.emailService.sendMail({
          to: email,
          subject: 'Tu código de verificación',
          html: `<h2>Tu código es: <strong>${code}</strong></h2><p>Expira en 5 minutos.</p>`,
        });
        sent = true;
        break;
      } catch (error) {
        lastError = error;
        console.error(
          'Error enviando email 2FA (intento %d) a %s: %s',
          attempt + 1,
          email,
          error instanceof Error ? error.message : 'Error desconocido'
        );
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
        }
      }
    }

    if (!sent) {
      console.error('Fallo al enviar email después de 3 intentos:', lastError);
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
