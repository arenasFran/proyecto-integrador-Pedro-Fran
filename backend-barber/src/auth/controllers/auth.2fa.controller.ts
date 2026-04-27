import { Request, Response } from "express";
import crypto from "crypto";
import jwt, { SignOptions } from "jsonwebtoken";
import User from "../models/user.model";
// TODO: importar sendMail cuando se mergee la rama de reset password
// import { sendMail } from "../../config/mailer";

const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || "1h") as SignOptions["expiresIn"];

export const sendTwoFactorCode = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Email y/o contraseña incorrectos.' })
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Este usuario se registró con Google, usá ese método para ingresar.' })
    }

    const bcrypt = await import('bcrypt');
    const passValida = await bcrypt.compare(password, user.password);
    if (!passValida) {
      return res.status(401).json({ error: 'Email y/o contraseña incorrectos.' })
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    
    user.twoFactorCode = code;
    user.twoFactorExpires = expires;
    await user.save();

    // TODO: reemplazar con sendMail cuando se mergee
    console.log(`Código 2FA para ${email}: ${code}`);
    // await sendMail({
    //   to: user.email,
    //   subject: 'Tu código de verificación',
    //   html: `<h2>Tu código es: <strong>${code}</strong></h2><p>Expira en 5 minutos.</p>`
    // })

    res.status(200).json({ message: 'Código enviado al email' })

  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor.' })
  }
}

export const verifyTwoFactorCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado.' })
    }

    if (!user.twoFactorCode || !user.twoFactorExpires) {
      return res.status(401).json({ error: 'No hay código activo.' })
    }

    if (new Date() > user.twoFactorExpires) {
      user.twoFactorCode = undefined;
      user.twoFactorExpires = undefined;
      await user.save();
      return res.status(401).json({ error: 'El código expiró.' })
    }

    if (user.twoFactorCode !== code) {
      return res.status(401).json({ error: 'Código incorrecto.' })
    }

   
    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    await user.save();

    
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: jwtExpiresIn, algorithm: 'HS256' }
    )

    res.status(200).json({ message: 'Login exitoso', token })

  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor.' })
  }
}