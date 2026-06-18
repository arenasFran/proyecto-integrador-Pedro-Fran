import request from 'supertest';
import express from 'express';
import { createTempLockRouter } from '../../../src/interface-adapters/routes/tempLock.routes';
import { TempLockController } from '../../../src/interface-adapters/controllers/tempLock/TempLockController';
import { makeMockTempLockRepository } from '../../test-utils/mocks';

describe('TempLock routes', () => {
  let app: express.Application;
  let tempLockRepository: ReturnType<typeof makeMockTempLockRepository>;

  beforeEach(() => {
    tempLockRepository = makeMockTempLockRepository();
    const controller = new TempLockController(tempLockRepository);

    app = express();
    app.use(express.json());
    app.use('/api/barbers/:barberId/temp-lock', createTempLockRouter({ tempLockController: controller }));
  });

  it('POST /api/barbers/:barberId/temp-lock debe crear un tempLock con datos validos', async () => {
    tempLockRepository.create.mockResolvedValue('temp-1');

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
    tempLockRepository.findById.mockResolvedValue({ _id: 'temp-1' });

    const response = await request(app).delete('/api/barbers/barber-1/temp-lock/temp-1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'TempLock liberado' });
  });
});
