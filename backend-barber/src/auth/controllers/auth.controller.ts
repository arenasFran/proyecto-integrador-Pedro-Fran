import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { saveUserService } from "../services/users.services";
import { Barber, RegisteredClient } from "../models/user.model";
import jwt, { SignOptions } from "jsonwebtoken";

const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || "1h") as SignOptions["expiresIn"];

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, lastname, phone } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingBarber = await Barber.findOne({ email: normalizedEmail });
    const existingClient = await RegisteredClient.findOne({ email: normalizedEmail });
    if (existingBarber || existingClient) {
      return res.status(409).json({ error: 'Email en uso.' })
    }

    const existingPhoneBarber = await Barber.findOne({ phone });
    const existingPhoneClient = await RegisteredClient.findOne({ phone });
    if (existingPhoneBarber || existingPhoneClient) {
      return res.status(409).json({ error: 'Teléfono en uso.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const data = {
      email: normalizedEmail,
      password: hash,
      name,
      lastname,
      phone,
      authProvider: 'local' as const
    }

    await saveUserService(data)
    res.status(201).json({ message: 'Usuario registrado con éxito' })
  } catch (error: any) { 
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email o teléfono ya registrado.' })
    }
    res.status(500).json({ error: 'Error al registrar al usuario' })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const barber = await Barber.findOne({ email: normalizedEmail })
    const user = barber || await RegisteredClient.findOne({ email: normalizedEmail })
    if (!user) {
      return res.status(401).json({ error: 'Email y/o contraseña incorrectos.' })
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Este usuario se registró con Google, usá ese método para ingresar.' })
    }

    const passValida = await bcrypt.compare(password, user.password);
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