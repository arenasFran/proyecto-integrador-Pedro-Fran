import { EmailMessage, IEmailService } from '../../application/ports/IEmailService';

export class FakeEmailService implements IEmailService {
  private static codes = new Map<string, string>();

  async sendMail(message: EmailMessage): Promise<void> {
    const match = message.html?.match(/<strong>(\d+)<\/strong>/);
    if (match) {
      FakeEmailService.codes.set(message.to.toLowerCase(), match[1]);
    }
  }

  static getCode(email: string): string | undefined {
    return FakeEmailService.codes.get(email.toLowerCase());
  }

  static clear(): void {
    FakeEmailService.codes.clear();
  }
}
