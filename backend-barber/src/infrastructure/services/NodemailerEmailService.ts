import { EmailMessage, IEmailService } from '../../application/ports/IEmailService';
import mailer from '../config/mailer';

export class NodemailerEmailService implements IEmailService {
  async sendMail(message: EmailMessage): Promise<void> {
    await mailer.sendMail(message);
  }
}
