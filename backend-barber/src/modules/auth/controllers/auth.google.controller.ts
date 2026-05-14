import { Request, Response } from "express";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import jwt, { SignOptions } from "jsonwebtoken";
import {
    IRegisteredClient,
    RegisteredClient,
} from "../../../common/models/client.model";
import { findUserByEmail } from "../utils/auth.utils";

const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || "1h") as SignOptions["expiresIn"];

async function getGoogleUser(token: string): Promise<TokenPayload> {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('Token de Google inválido');
  }
  return payload;
}

async function handleGoogleUser(payload: TokenPayload) {
  const { email, email_verified, given_name, family_name, sub, name } = payload;
  if (!email || !email_verified) {
    throw new Error('Cuenta de Google no verificada');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    if (existingUser.kind === 'Admin' || existingUser.kind === 'Empleado') {
      throw new Error('Este usuario no puede iniciar con Google.');
    }
    const registeredClient = existingUser as IRegisteredClient;
    if (registeredClient.authProvider === 'google' && registeredClient.googleId !== sub) {
      throw new Error('Token de Google inválido');
    }
    return existingUser;
  }

  return RegisteredClient.create({
    email: normalizedEmail,
    name: given_name || name || 'Usuario',
    lastname: family_name || '-',
    authProvider: 'google',
    googleId: sub,
  });
}


export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const payload = await getGoogleUser(token);
    const user = await handleGoogleUser(payload);

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email, kind: user.kind },
      process.env.JWT_SECRET as string,
      { expiresIn: jwtExpiresIn, algorithm: 'HS256' }
    );

    res.status(200).json({ message: 'Login exitoso', token: jwtToken });

  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Error al autenticar con Google' });
  }
};
