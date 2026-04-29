import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD }
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
  const fallbackFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@example.com';
  return transporter.sendMail({ from: from || fallbackFrom, to, subject, html, text });
};

export default { sendMail };
