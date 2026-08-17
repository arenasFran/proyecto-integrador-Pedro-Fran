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

require('./business-write-rate-limit.env');

import request from 'supertest';
import app from '../../../src/app';
import { seedRegisteredClient, signToken } from '../../test-utils/factories';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('Business write endpoints — rate limiting', () => {
  describe('POST /api/cart/sync (cartMutationLimiter: 5/60s)', () => {
    it('debe rechazar con 429 después de 5 requests', async () => {
      const { clientId, email } = await seedRegisteredClient({ email: 'cart-ratelimit@test.com' });
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });

      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/cart/sync')
          .set('Authorization', `Bearer ${token}`)
          .send({ items: [{ productId: `prod-${i}`, quantity: 1 }] });
        expect(res.status).not.toBe(429);
      }

      const blocked = await request(app)
        .post('/api/cart/sync')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId: 'prod-blocked', quantity: 1 }] });
      expect(blocked.status).toBe(429);
    });
  });
});
