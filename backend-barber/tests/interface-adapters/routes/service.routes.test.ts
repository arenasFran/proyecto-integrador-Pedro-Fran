jest.mock('../../../src/infrastructure/config/mailer', () => ({
  __esModule: true,
  default: { sendMail: jest.fn().mockResolvedValue(undefined) },
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../../../src/app';

describe('Service routes', () => {
  it('debe devolver los servicios sin auth', async () => {
    const response = await request(app).get('/api/services');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.services)).toBe(true);
    expect(response.body.services.length).toBe(4);
    expect(response.body.services[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      description: expect.any(String),
      price: expect.any(Number),
      imageUrl: expect.any(String),
    });
  });
});
