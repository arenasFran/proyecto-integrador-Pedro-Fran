import crypto from 'crypto';
import { AppError } from '../../../application/errors/AppError';
import { IPasswordResetRepository } from '../../../domain/repositories/IPasswordResetRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Email } from '../../../domain/value-objects/Email';
import { RequestResetDTO } from '../../dto/password/RequestResetDTO';
import { IEmailService } from '../../ports/IEmailService';
import { IHashService } from '../../ports/IHashService';

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordResetRepository: IPasswordResetRepository,
    private readonly emailService: IEmailService,
    private readonly hashService: IHashService,
    private readonly frontendUrl: string,
    private readonly expirationMinutes: number
  ) {}

  async execute(dto: RequestResetDTO): Promise<{ message: string }> {
    const email = Email.create(dto.email).getValue();
    const user = await this.userRepository.findByEmail(email);

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashService.sha256(token);
      const expiresAt = new Date(
        new Date().getTime() + this.expirationMinutes * 60 * 1000
      );

      const url = `${this.frontendUrl}/reset-password?token=${token}`;
      const subject = 'Restablece tu contraseña';
      const html = `<p>Para restablecer tu contraseña haz clic <a href="${url}">aquí</a>.</p>`;

      let lastError: unknown;
      let sent = false;
      for (let attempt = 0; attempt <= 2; attempt++) {
        try {
          await this.emailService.sendMail({ to: user.email, subject, html });
          sent = true;
          break;
        } catch (error) {
          lastError = error;
          console.error(
            'Error enviando email reset password (intento %d) a %s: %s',
            attempt + 1,
            user.email,
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
          'No se pudo enviar el correo. Servicio de correo no disponible, intentá de nuevo.',
          500
        );
      }

      await this.passwordResetRepository.create(user.id, tokenHash, expiresAt);
    }

    return {
      message:
        'Si el email existe, recibirás instrucciones para restablecer la contraseña.',
    };
  }
}
