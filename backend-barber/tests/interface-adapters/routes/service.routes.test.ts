jest.mock('../../../src/infrastructure/config/mailer', () => ({
  __esModule: true,
  default: { sendMail: jest.fn().mockResolvedValue(undefined) },
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

import request from 'supertest';
import app from '../../../src/app';
import { JwtTokenService } from '../../../src/infrastructure/services/JwtTokenService';

describe('Service routes', () => {
  const makeAuthHeader = () => {
    const tokenService = new JwtTokenService();
    const token = tokenService.sign({
      id: 'user-1',
      email: 'test@example.com',
      kind: 'Registrado',
    });

    return `Bearer ${token}`;
  };

  it('debe devolver los servicios con auth', async () => {
    const response = await request(app)
      .get('/api/services')
      .set('Authorization', makeAuthHeader());

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.services)).toBe(true);
    expect(response.body.services.length).toBe(4);
    expect(response.body.services[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      description: expect.any(String),
      price: expect.any(Number),
      durationMinutes: expect.any(Number),
      imageUrl: expect.any(String),
    });
  });

  it('debe responder 401 si falta el header Authorization', async () => {
    const response = await request(app).get('/api/services');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'No autorizado' });
  });
});
