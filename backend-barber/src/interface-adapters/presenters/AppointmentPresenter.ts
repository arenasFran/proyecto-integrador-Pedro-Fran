import { Response } from 'express';
import { AppError } from '../../application/errors/AppError';

export class AppointmentPresenter {
  static success<T>(res: Response, payload: T, status = 200) {
    return res.status(status).json(payload);
  }

  static handleError(res: Response, error: unknown, fallbackMessage: string) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: fallbackMessage });
  }
}
