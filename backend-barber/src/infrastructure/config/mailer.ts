import nodemailer from 'nodemailer';
import { getConfig } from './env';

const config = getConfig();

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: config.smtp.user
    ? { user: config.smtp.user, pass: config.smtp.pass || '' }
    : undefined,
});

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
  return transporter.sendMail({ from: from || config.smtp.from, to, subject, html, text });
};

export default { sendMail };
