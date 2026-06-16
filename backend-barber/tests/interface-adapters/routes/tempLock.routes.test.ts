import request from 'supertest';
import express from 'express';
import { createTempLockRouter } from '../../../src/interface-adapters/routes/tempLock.routes';
import { TempLockController } from '../../../src/interface-adapters/controllers/tempLock/TempLockController';
import { CreateTempLockUseCase } from '../../../src/application/use-cases/tempLock/CreateTempLockUseCase';
import { ReleaseTempLockUseCase } from '../../../src/application/use-cases/tempLock/ReleaseTempLockUseCase';

describe('TempLock routes', () => {
  let app: express.Application;
  let createTempLock: jest.Mocked<CreateTempLockUseCase>;
  let releaseTempLock: jest.Mocked<ReleaseTempLockUseCase>;

  beforeEach(() => {
    createTempLock = { execute: jest.fn() } as unknown as jest.Mocked<CreateTempLockUseCase>;
    releaseTempLock = { execute: jest.fn() } as unknown as jest.Mocked<ReleaseTempLockUseCase>;
    const controller = new TempLockController(createTempLock, releaseTempLock);

    app = express();
    app.use(express.json());
    app.use('/api/barbers/:barberId/temp-lock', createTempLockRouter({ tempLockController: controller }));
  });

  it('POST /api/barbers/:barberId/temp-lock debe crear un tempLock con datos validos', async () => {
    createTempLock.execute.mockResolvedValue({ message: 'Slot apartado temporalmente', tempLockId: 'temp-1' });

    const response = await request(app)
      .post('/api/barbers/barber-1/temp-lock')
      .send({ barberId: 'barber-1', date: '2026-06-20', startTime: '10:00' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Slot apartado temporalmente', tempLockId: 'temp-1' });
  });

  it('POST debe devolver 400 si faltan campos requeridos', async () => {
    const response = await request(app)
      .post('/api/barbers/barber-1/temp-lock')
      .send({ barberId: 'barber-1' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('POST debe devolver 400 si la fecha no tiene formato YYYY-MM-DD', async () => {
    const response = await request(app)
      .post('/api/barbers/barber-1/temp-lock')
      .send({ barberId: 'barber-1', date: '20-06-2026', startTime: '10:00' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('POST debe devolver 400 si startTime no tiene formato HH:MM', async () => {
    const response = await request(app)
      .post('/api/barbers/barber-1/temp-lock')
      .send({ barberId: 'barber-1', date: '2026-06-20', startTime: '10' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('DELETE /api/barbers/:barberId/temp-lock/:tempLockId debe liberar un tempLock', async () => {
    releaseTempLock.execute.mockResolvedValue(undefined);

    const response = await request(app).delete('/api/barbers/barber-1/temp-lock/temp-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'TempLock liberado' });
  });

  it('POST debe devolver 429 si se supera el rate limit', async () => {
    createTempLock.execute.mockResolvedValue({ message: 'Slot apartado temporalmente', tempLockId: 'temp-1' });

    const requests = Array.from({ length: 21 }, (_, i) =>
      request(app)
        .post('/api/barbers/barber-1/temp-lock')
        .send({ barberId: `barber-${i}`, date: '2026-06-20', startTime: '10:00' })
    );

    const responses = await Promise.all(requests);
    const tooMany = responses.find((r) => r.status === 429);
    expect(tooMany).toBeTruthy();
    expect(tooMany!.body).toEqual({ error: 'Demasiados intentos. Esperá 5 minutos.' });
  });
});
