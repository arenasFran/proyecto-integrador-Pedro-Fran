import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import mailer from '../../config/mailer';
import { createResetToken, verifyAndConsumeResetToken } from '../services/passwordReset.services';
import { findUserByEmail, updatePassword } from '../services/users.services';

export const requestReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await findUserByEmail(email);

    // Always respond success to avoid user enumeration
    if (user) {
      const token = await createResetToken(user._id);
      const frontend = process.env.FRONTEND_URL || '';
      const url = `${frontend}/reset-password?token=${token}`;
      const subject = 'Restablece tu contraseña';
      const html = `<p>Para restablecer tu contraseña haz clic <a href="${url}">aquí</a>.</p>`;
      // send mail (don't await to reduce response time)
      mailer.sendMail({ to: user.email, subject, html }).catch((error: any) => {
        console.error('Error sending password reset email to %s', user.email, error);
      });
    }

    return res.status(200).json({ message: 'Si el email existe, recibirás instrucciones para restablecer la contraseña.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error procesando la solicitud' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    const tokenDoc = await verifyAndConsumeResetToken(token);
    if (!tokenDoc) return res.status(400).json({ error: 'Token inválido o expirado' });

    const hash = await bcrypt.hash(password, 10);
    await updatePassword(tokenDoc.userId, hash);

    return res.status(200).json({ message: 'Contraseña restablecida con éxito' });
  } catch (error) {
    return res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
};

export default { requestReset, resetPassword };
