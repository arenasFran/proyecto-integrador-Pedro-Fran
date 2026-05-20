export type EmailMessage = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

export interface IEmailService {
  sendMail(message: EmailMessage): Promise<void>;
}
