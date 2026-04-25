import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user.model";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    const { email, given_name, family_name, sub, name } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name: given_name || name || 'Usuario',
        lastname: family_name || '-',
        authProvider: 'google',
        googleId: sub,
        role: 'cliente'
      });
    }

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    res.status(200).json({ message: 'Login exitoso', token: jwtToken });

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'Error al autenticar con Google' });
  }
};