import { EmailMessage, IEmailService } from '../../ports/IEmailService';

const MAX_ATTEMPTS = 3;

// Reintenta con backoff exponencial (500ms, 1000ms) antes de darse por vencido.
// Nunca rechaza: el llamador decide si el resultado (enviado o no) le importa o no.
export async function sendMailWithRetry(
  emailService: IEmailService,
  message: EmailMessage,
  errorLabel: string
): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      await emailService.sendMail(message);
      return true;
    } catch (error) {
      console.error(`${errorLabel} (intento ${attempt + 1}):`, error);
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
      }
    }
  }
  return false;
}
