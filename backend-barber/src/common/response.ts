import { Response } from 'express';
import { AppError } from '../domain/errors/AppError';

export function sendSuccess<T>(res: Response, payload: T, status = 200) {
  return res.status(status).json(payload);
}

export function sendError(res: Response, error: unknown, fallbackMessage: string) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(`[sendError] ${fallbackMessage}. Causa:`, message);
  if (error instanceof Error && error.stack) {
    console.error('[sendError] Stack:', error.stack);
  }

  if (error && typeof error === 'object' && 'code' in error && (error as any).code === 11000) {
    return res.status(409).json({ error: 'El registro ya existe.' });
  }

  return res.status(500).json({ error: fallbackMessage });
}

