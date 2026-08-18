import request from 'supertest';
import app from '../../../src/app';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

const MAX = 100;

describeIfMongo('Public GET routes — rate limiting (100 req/min)', () => {
  it('bloquea /api/services con 429 al superar el cupo', async () => {
    for (let i = 0; i < MAX; i++) {
      const response = await request(app).get('/api/services');
      expect(response.status).not.toBe(429);
    }

    const blocked = await request(app).get('/api/services');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBeTruthy();
  });

  it('aplica el limiter sin romper /api/barbers/public, /api/products y /api/products/categories', async () => {
    const [barbers, products, categories] = await Promise.all([
      request(app).get('/api/barbers/public'),
      request(app).get('/api/products'),
      request(app).get('/api/products/categories'),
    ]);

    expect(barbers.status).toBe(200);
    expect(products.status).toBe(200);
    expect(categories.status).toBe(200);
  });
});