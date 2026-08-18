const verifyIdTokenMock = jest.fn();

jest.mock('../../../src/infrastructure/config/mailer', () => ({
  __esModule: true,
  default: { sendMail: jest.fn().mockResolvedValue(undefined) },
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/infrastructure/services/GoogleAuthService', () => ({
  GoogleAuthService: jest.fn().mockImplementation(() => ({
    verifyIdToken: verifyIdTokenMock,
  })),
}));

import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../src/app';
import TempLockModel from '../../../src/infrastructure/repositories/mongodb/models/tempLock.model';
import {
  seedBarber,
  getFutureDate,
} from '../../test-utils/factories';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('TempLock routes — integración real', () => {
  describe('POST /api/appointments/temp-lock', () => {
    it('crea un tempLock con datos válidos', async () => {
      const { barberId } = await seedBarber();
      const date = getFutureDate(15);

      const res = await request(app)
        .post('/api/appointments/temp-lock')
        .send({ barberId, date, startTime: '10:00' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        message: 'Slot apartado temporalmente',
        tempLockId: expect.any(String),
        ownerToken: expect.stringMatching(/^[a-f0-9]{64}$/),
      });

      const doc = await TempLockModel.findById(res.body.tempLockId);
      expect(doc).not.toBeNull();
      expect(doc!.barberId.toString()).toBe(barberId);
      expect(doc!.date).toBe(date);
      expect(doc!.startTime).toBe('10:00');
    });

    it('rechaza tempLock duplicado (mismo barberId+date+startTime)', async () => {
      const { barberId } = await seedBarber();
      const date = getFutureDate(15);
      const payload = { barberId, date, startTime: '10:00' };

      await request(app).post('/api/appointments/temp-lock').send(payload);
      const res = await request(app).post('/api/appointments/temp-lock').send(payload);

      expect(res.status).toBe(409);
    });

    it('rechaza si falta barberId', async () => {
      const res = await request(app)
        .post('/api/appointments/temp-lock')
        .send({ date: getFutureDate(15), startTime: '10:00' });

      expect(res.status).toBe(400);
    });

    it('rechaza fecha con formato inválido', async () => {
      const { barberId } = await seedBarber();

      const res = await request(app)
        .post('/api/appointments/temp-lock')
        .send({ barberId, date: '20-06-2026', startTime: '10:00' });

      expect(res.status).toBe(400);
    });

    it('rechaza startTime con formato inválido', async () => {
      const { barberId } = await seedBarber();

      const res = await request(app)
        .post('/api/appointments/temp-lock')
        .send({ barberId, date: getFutureDate(15), startTime: '10' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/appointments/temp-lock/:tempLockId', () => {
    const ownerToken = 'a'.repeat(64);

    it('libera un tempLock existente con el ownerToken correcto', async () => {
      const { barberId } = await seedBarber();
      const date = getFutureDate(15);
      const doc = await TempLockModel.create({
        barberId: new mongoose.Types.ObjectId(barberId),
        date,
        startTime: '10:00',
        ownerToken,
      });
      const tempLockId = doc._id.toString();

      const res = await request(app)
        .delete(`/api/appointments/temp-lock/${tempLockId}`)
        .send({ ownerToken });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'TempLock liberado' });

      const deleted = await TempLockModel.findById(tempLockId);
      expect(deleted).toBeNull();
    });

    it('responde 403 si el ownerToken no coincide', async () => {
      const { barberId } = await seedBarber();
      const doc = await TempLockModel.create({
        barberId: new mongoose.Types.ObjectId(barberId),
        date: getFutureDate(15),
        startTime: '10:00',
        ownerToken,
      });
      const tempLockId = doc._id.toString();

      const res = await request(app)
        .delete(`/api/appointments/temp-lock/${tempLockId}`)
        .send({ ownerToken: 'b'.repeat(64) });

      expect(res.status).toBe(403);

      const stillExists = await TempLockModel.findById(tempLockId);
      expect(stillExists).not.toBeNull();
    });

    it('responde 200 si el tempLock no existe y el token es válido (idempotente)', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .delete(`/api/appointments/temp-lock/${fakeId}`)
        .send({ ownerToken });

      expect(res.status).toBe(200);
    });

    it('responde 400 si falta el ownerToken', async () => {
      const { barberId } = await seedBarber();
      const doc = await TempLockModel.create({
        barberId: new mongoose.Types.ObjectId(barberId),
        date: getFutureDate(15),
        startTime: '10:00',
        ownerToken,
      });
      const tempLockId = doc._id.toString();

      const res = await request(app).delete(`/api/appointments/temp-lock/${tempLockId}`);

      expect(res.status).toBe(400);
    });

    it('responde 400 si el ownerToken no tiene el formato esperado', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .delete(`/api/appointments/temp-lock/${fakeId}`)
        .send({ ownerToken: 'short' });

      expect(res.status).toBe(400);
    });
  });
});
