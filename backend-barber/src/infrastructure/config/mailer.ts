import nodemailer, { Transporter } from 'nodemailer';
import { getConfig } from './env';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const config = getConfig();
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user
        ? { user: config.smtp.user, pass: config.smtp.pass || '' }
        : undefined,
    });
  }
  return transporter;
}

export const sendMail = async ({
  from,
  to,
  subject,
  html,
  text,
}: {
  from?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) => {
  const config = getConfig();
  const info = await getTransporter().sendMail({ from: from || config.smtp.from, to, subject, html, text });

  if (config.emailProvider === 'ethereal') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[EMAIL-ETHEREAL] Preview del mail enviado: ${previewUrl}`);
    }
  }

  return info;
};

export default { sendMail };
