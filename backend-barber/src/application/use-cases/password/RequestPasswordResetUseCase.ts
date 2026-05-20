import { IPasswordResetRepository } from '../../../domain/repositories/IPasswordResetRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Email } from '../../../domain/value-objects/Email';
import { RequestResetDTO } from '../../dto/password/RequestResetDTO';
import { IDateTimeProvider } from '../../ports/IDateTimeProvider';
import { IEmailService } from '../../ports/IEmailService';
import { IHashService } from '../../ports/IHashService';
import { IRandomGenerator } from '../../ports/IRandomGenerator';

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordResetRepository: IPasswordResetRepository,
    private readonly emailService: IEmailService,
    private readonly randomGenerator: IRandomGenerator,
    private readonly hashService: IHashService,
    private readonly dateTimeProvider: IDateTimeProvider,
    private readonly frontendUrl: string,
    private readonly expirationMinutes: number
  ) {}

  async execute(dto: RequestResetDTO): Promise<{ message: string }> {
    const email = Email.create(dto.email).getValue();
    const user = await this.userRepository.findByEmail(email);

    if (user) {
      const token = this.randomGenerator.generateHexToken(32);
      const tokenHash = this.hashService.sha256(token);
      const expiresAt = new Date(
        this.dateTimeProvider.now().getTime() + this.expirationMinutes * 60 * 1000
      );

      await this.passwordResetRepository.create(user.id, tokenHash, expiresAt);

      const url = `${this.frontendUrl}/reset-password?token=${token}`;
      const subject = 'Restablece tu contraseña';
      const html = `<p>Para restablecer tu contraseña haz clic <a href="${url}">aquí</a>.</p>`;

      this.emailService
        .sendMail({ to: user.email, subject, html })
        .catch((error: unknown) => {
          console.error('Error sending password reset email to %s', user.email, error);
        });
    }

    return {
      message:
        'Si el email existe, recibirás instrucciones para restablecer la contraseña.',
    };
  }
}
