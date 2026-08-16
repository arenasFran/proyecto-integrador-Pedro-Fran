import crypto from 'crypto';
import { AppError } from '../../../domain/errors/AppError';
import { MongoPasswordResetRepository } from '../../../infrastructure/repositories/mongodb/MongoPasswordResetRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { Email } from '../../../domain/value-objects/Email';
import { IEmailService } from '../../ports/IEmailService';

type RequestResetDTO = { email: string };
import { IHashService } from '../../ports/IHashService';

export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly passwordResetRepository: MongoPasswordResetRepository,
    private readonly emailService: IEmailService,
    private readonly hashService: IHashService,
    private readonly frontendUrl: string,
    private readonly expirationMinutes: number
  ) {}

  async execute(dto: RequestResetDTO): Promise<{ message: string }> {
    const email = Email.create(dto.email).getValue();
    const user = await this.userRepository.findByEmail(email);

    if (user && user.authProvider === 'local') {
      const code = String(crypto.randomInt(100000, 1000000));
      const codeHash = this.hashService.sha256(code);
      const expiresAt = new Date(
        new Date().getTime() + this.expirationMinutes * 60 * 1000
      );

      const recoveryUrl = `${this.frontendUrl}/recovery`;
      const subject = 'Tu código para restablecer la contraseña';
      const html = [
        '<p>Recibimos una solicitud para restablecer tu contraseña.</p>',
        `<p>Tu código de verificación es: <strong>${code}</strong></p>`,
        `<p>Ingresalo en <a href="${recoveryUrl}">${recoveryUrl}</a> dentro de los próximos ${this.expirationMinutes} minutos.`,
        'Si no solicitaste el cambio, podés ignorar este correo.</p>',
      ].join(' ');

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

      await this.passwordResetRepository.create(user.id, codeHash, expiresAt);
    }

    return {
      message:
        'Si el email existe, recibirás un código para restablecer la contraseña.',
    };
  }
}

