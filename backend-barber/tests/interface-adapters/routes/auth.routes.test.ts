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
import bcrypt from 'bcrypt';
import app from '../../../src/app';
import { HashService } from '../../../src/infrastructure/services/HashService';
import { RegisteredClient } from '../../../src/infrastructure/repositories/mongodb/models/client.model';
import PasswordReset from '../../../src/infrastructure/repositories/mongodb/models/passwordReset.model';

const hashService = new HashService();
const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('Auth routes', () => {
  beforeEach(() => {
    verifyIdTokenMock.mockReset();
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  it('debe registrar un usuario', async () => {
    const response = await request(app).post('/auth/register').send({
      email: 'register@example.com',
      password: 'Abcd1234',
      repeatPassword: 'Abcd1234',
      name: 'Juan',
      lastname: 'Perez',
      phone: '123456789',
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toMatch(/Usuario registrado/);
  });

  it('debe enviar codigo 2FA', async () => {
    const hash = await bcrypt.hash('123456', 10);
    await RegisteredClient.create({
      email: '2fa-enviar@example.com',
      password: hash,
      name: 'Juan',
      lastname: 'Perez',
      phone: '333333',
      authProvider: 'local',
    });

    const response = await request(app).post('/auth/2fa/send').send({
      email: '2fa-enviar@example.com',
      password: '123456',
    });

    expect(response.status).toBe(200);
  });

  it('debe verificar codigo 2FA', async () => {
    const code = '123456';
    const codeHash = hashService.sha256(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await RegisteredClient.create({
      email: '2fa-verify@example.com',
      password: 'hash',
      name: 'Juan',
      lastname: 'Perez',
      phone: '444444',
      authProvider: 'local',
      twoFactorCode: codeHash,
      twoFactorExpires: expiresAt,
    });

    const response = await request(app).post('/auth/2fa/verify').send({
      email: '2fa-verify@example.com',
      code,
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
  });

  it('debe solicitar reset de password', async () => {
    await RegisteredClient.create({
      email: 'reset@example.com',
      password: 'hash',
      name: 'Juan',
      lastname: 'Perez',
      phone: '555555',
      authProvider: 'local',
    });

    const response = await request(app).post('/auth/request-reset').send({
      email: 'reset@example.com',
    });

    expect(response.status).toBe(200);
  });

  it('debe resetear la password', async () => {
    const user = await RegisteredClient.create({
      email: 'reset2@example.com',
      password: await bcrypt.hash('123456', 10),
      name: 'Juan',
      lastname: 'Perez',
      phone: '666666',
      authProvider: 'local',
    });

    const token = 'token-reset';
    const tokenHash = hashService.sha256(token);
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await PasswordReset.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      used: false,
    });

    const response = await request(app).post('/auth/reset-password').send({
      token,
      password: 'Abcd1234',
      repeatPassword: 'Abcd1234',
      email: 'reset2@example.com',
    });

    expect(response.status).toBe(200);
    const updated = await RegisteredClient.findById(user._id);
    expect(updated?.password).not.toBeNull();
  });

  it('debe autenticar con Google (nuevo usuario → requiresProfileCompletion)', async () => {
    verifyIdTokenMock.mockResolvedValue({
      email: 'google-new@example.com',
      emailVerified: true,
      givenName: 'Juan',
      familyName: 'Perez',
      name: 'Juan Perez',
      sub: 'google-1',
    });

    const response = await request(app).post('/auth/google').send({ token: 'google-token' });

    expect(response.status).toBe(200);
    expect(response.body.requiresProfileCompletion).toBe(true);
    expect(response.body.partialToken).toEqual(expect.any(String));
  });

  it('debe autenticar con Google (usuario existente → token)', async () => {
    const hash = await bcrypt.hash('SomePass1!', 10);
    await RegisteredClient.create({
      email: 'google-existing@example.com',
      password: hash,
      name: 'Juan',
      lastname: 'Perez',
      phone: '777777',
      authProvider: 'google',
      googleId: 'google-existing-1',
    });

    verifyIdTokenMock.mockResolvedValue({
      email: 'google-existing@example.com',
      emailVerified: true,
      givenName: 'Juan',
      familyName: 'Perez',
      name: 'Juan Perez',
      sub: 'google-existing-1',
    });

    const response = await request(app).post('/auth/google').send({ token: 'google-token' });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
  });
});
