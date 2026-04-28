import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { Barber, RegisteredClient } from "../models/user.model";
import jwt, { SignOptions } from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || "1h") as SignOptions["expiresIn"];

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: 'Token de Google inválido' });
    }

    const { email, email_verified, given_name, family_name, sub, name } = payload;

    if (!email || !email_verified) {
      return res.status(401).json({ error: 'Cuenta de Google no verificada' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const barber = await Barber.findOne({ email: normalizedEmail });
    if (barber) {
      return res.status(401).json({ error: 'Este usuario no puede iniciar con Google.' });
    }

    let user = await RegisteredClient.findOne({ email: normalizedEmail });

    if (user) {
      if (user.authProvider === 'google' && user.googleId !== sub) {
        return res.status(401).json({ error: 'Token de Google inválido' })
      }
    } else {

      user = await RegisteredClient.create({
        email: normalizedEmail,
        name: given_name || name || 'Usuario',
        lastname: family_name || '-',
        authProvider: 'google',
        googleId: sub,
      });
    }

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email, kind: user.kind },
      process.env.JWT_SECRET as string,
      { expiresIn: jwtExpiresIn, algorithm: 'HS256' }
    );

    res.status(200).json({ message: 'Login exitoso', token: jwtToken });

  } catch (error) {
    res.status(500).json({ error: 'Error al autenticar con Google' });
  }
};