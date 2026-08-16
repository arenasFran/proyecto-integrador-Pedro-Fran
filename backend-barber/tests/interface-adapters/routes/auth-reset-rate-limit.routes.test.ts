jest.mock('../../../src/infrastructure/config/mailer', () => ({
  __esModule: true,
  default: { sendMail: jest.fn().mockResolvedValue(undefined) },
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../../../src/app';
import { getConfig } from '../../../src/infrastructure/config/env';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('Auth routes — rate limiting de recuperación de contraseña (resetLimiter en app.ts)', () => {
  it('debe bloquear con 429 tras agotar el cupo de /auth/request-reset, y el bloqueo se comparte con /auth/reset-password (mismo resetLimiter)', async () => {
    const { max } = getConfig().rateLimit.reset;

    for (let i = 0; i < max; i++) {
      const response = await request(app).post('/auth/request-reset').send({ email: 'nadie@example.com' });
      expect(response.status).not.toBe(429);
    }

    const blockedRequestReset = await request(app).post('/auth/request-reset').send({ email: 'nadie@example.com' });
    expect(blockedRequestReset.status).toBe(429);

    const blockedResetPassword = await request(app)
      .post('/auth/reset-password')
      .send({ email: 'nadie@example.com', code: '123456', password: 'Abcd1234', repeatPassword: 'Abcd1234' });
    expect(blockedResetPassword.status).toBe(429);
  });
});
