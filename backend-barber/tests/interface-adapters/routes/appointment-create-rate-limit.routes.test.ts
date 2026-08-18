jest.mock('../../../src/infrastructure/config/mailer', () => ({
  __esModule: true,
  default: { sendMail: jest.fn().mockResolvedValue(undefined) },
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/infrastructure/services/GoogleAuthService', () => ({
  GoogleAuthService: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

require('./appointment-create-rate-limit.env');

import request from 'supertest';
import app from '../../../src/app';
import ServiceModel from '../../../src/infrastructure/repositories/mongodb/models/service.model';
import { Employee } from '../../../src/infrastructure/repositories/mongodb/models/barber.model';
import { seedBarber, seedService, seedTempLock, getFutureDate } from '../../test-utils/factories';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('POST /api/appointments — rate limiting (5/15min per IP)', () => {
  beforeEach(async () => {
    await ServiceModel.deleteMany({});
    await Employee.deleteMany({});
  });

  it('debe rechazar con 429 después de 5 requests exitosos', async () => {
    const { barberId } = await seedBarber();
    const { serviceId } = await seedService();
    const date = getFutureDate(15);

    for (let i = 0; i < 5; i++) {
      const { tempLockId } = await seedTempLock({ barberId, date, startTime: `${10 + i}:00` });
      const res = await request(app)
        .post('/api/appointments')
        .send({
          barberId,
          serviceId,
          date,
          startTime: `${10 + i}:00`,
          clientName: 'Juan',
          clientLastname: 'Perez',
          clientEmail: `test${i}@test.com`,
          clientPhone: '099123456',
          tempLockId,
        });
      expect(res.status).not.toBe(429);
    }

    const { tempLockId } = await seedTempLock({ barberId, date, startTime: '15:00' });
    const blocked = await request(app)
      .post('/api/appointments')
      .send({
        barberId,
        serviceId,
        date,
        startTime: '15:00',
        clientName: 'Juan',
        clientLastname: 'Perez',
        clientEmail: 'blocked@test.com',
        clientPhone: '099123456',
        tempLockId,
      });
    expect(blocked.status).toBe(429);
  });
});
