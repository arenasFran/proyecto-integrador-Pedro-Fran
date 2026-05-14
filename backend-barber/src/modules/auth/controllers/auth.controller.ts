import { Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import {
  findBarberByPhone,
} from "../services/barber.services";
import {
  createRegisteredClient,
  findRegisteredClientByPhone,
} from "../services/client.services";
import {
  findUserByEmail,
  hashPassword,
  validatePassword,
} from "../utils/auth.utils";

const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || "1h") as SignOptions["expiresIn"];

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, lastname, phone } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'Email en uso.' })
    }

    const existingPhoneBarber = await findBarberByPhone(phone);
    const existingPhoneClient = await findRegisteredClientByPhone(phone);
    if (existingPhoneBarber || existingPhoneClient) {
      return res.status(409).json({ error: 'Teléfono en uso.' });
    }

    const hash = await hashPassword(password);
    const data = {
      email: normalizedEmail,
      password: hash,
      name,
      lastname,
      phone,
      authProvider: 'local' as const
    }

    await createRegisteredClient(data)
    res.status(201).json({ message: 'Usuario registrado con éxito' })
  } catch (error: any) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue ?? {})[0];
      const message = field === "phone" ? "Teléfono en uso." : "Email en uso.";
      return res.status(409).json({ error: message })
    }
    res.status(500).json({ error: 'Error al registrar al usuario' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Email y/o contraseña incorrectos.' })
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Este usuario se registró con Google, usá ese método para ingresar.' })
    }

    const passValida = await validatePassword(password, user.password);
    if (!passValida) {
      return res.status(401).json({ error: 'Email y/o contraseña incorrectos.' })
    }

    const token = jwt.sign(
      { email: user.email, id: user._id, kind: user.kind },
      process.env.JWT_SECRET as string,
      { expiresIn: jwtExpiresIn, algorithm: 'HS256' }
    )

    res.status(200).json({ message: 'Login exitoso', token })
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor.' })
  }
}
