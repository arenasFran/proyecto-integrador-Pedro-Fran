import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../../src/app';
import { AppError } from '../../../src/domain/errors/AppError';

const buildApp = () => {
  const app = express();
  app.use(express.json());

  app.use('/boom-app-error', (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next(new AppError('Recurso no encontrado.', 404, 'NOT_FOUND'));
  });

  app.use('/boom-generic', (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    next(new Error('detalle interno sensible'));
  });

  app.use(errorHandler);
  return app;
};

describe('Global error handler', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('devuelve el status, mensaje y código de un AppError', async () => {
    const response = await request(buildApp()).get('/boom-app-error');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Recurso no encontrado.');
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('responde 500 genérico sin filtrar detalles internos', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await request(buildApp()).get('/boom-generic');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Error interno del servidor');
    expect(JSON.stringify(response.body)).not.toContain('detalle interno sensible');
  });
});