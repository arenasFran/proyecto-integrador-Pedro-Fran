import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Email } from '../../../domain/value-objects/Email';
import { TwoFactorSendDTO } from '../../dto/auth/TwoFactorSendDTO';
import { AppError } from '../../errors/AppError';
import { IDateTimeProvider } from '../../ports/IDateTimeProvider';
import { IEmailService } from '../../ports/IEmailService';
import { IHashService } from '../../ports/IHashService';
import { IPasswordHasher } from '../../ports/IPasswordHasher';
import { IRandomGenerator } from '../../ports/IRandomGenerator';

export class SendTwoFactorCodeUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly emailService: IEmailService,
    private readonly randomGenerator: IRandomGenerator,
    private readonly hashService: IHashService,
    private readonly dateTimeProvider: IDateTimeProvider
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

    const code = this.randomGenerator.generateNumericCode(6);
    const expiresAt = new Date(this.dateTimeProvider.now().getTime() + 5 * 60 * 1000);
    const codeHash = this.hashService.sha256(code);

    await this.userRepository.updateTwoFactor(user.id, {
      codeHash,
      expiresAt,
    });

    this.emailService
      .sendMail({
        to: email,
        subject: 'Tu código de verificación',
        html: `<h2>Tu código es: <strong>${code}</strong></h2><p>Expira en 5 minutos.</p>`,
      })
      .catch((error: unknown) => {
        console.error('Error enviando email 2FA a %s', email, error);
      });

    return { message: 'Código enviado al email' };
  }
}
