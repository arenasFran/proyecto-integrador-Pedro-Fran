import { Response } from 'express';
import { AppError } from '../domain/errors/AppError';

export function sendSuccess<T>(res: Response, payload: T, status = 200) {
  return res.status(status).json(payload);
}

export function sendError(res: Response, error: unknown, fallbackMessage: string) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  return res.status(500).json({ error: fallbackMessage });
}

