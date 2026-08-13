import request from 'supertest';
import express from 'express';
import { createTelegramRouter } from '../../../src/interface-adapters/routes/telegram.routes';
import { TelegramController } from '../../../src/interface-adapters/controllers/telegram/TelegramController';
import { GenerateTelegramLinkTokenUseCase } from '../../../src/application/use-cases/telegram/GenerateTelegramLinkTokenUseCase';
import { makeMockTelegramLinkTokenRepository, makeMockHashService } from '../../test-utils/mocks';

describe('POST /api/telegram/link-token — autorización', () => {
  let app: express.Application;
  let currentUser: { _id: string; email: string; kind: string };

  const authenticate: express.RequestHandler = (req, _res, next) => {
    (req as any).user = currentUser;
    next();
  };

  beforeEach(() => {
    const tokenRepo = makeMockTelegramLinkTokenRepository();
    const hashService = makeMockHashService();
    hashService.sha256.mockImplementation((input: string) => `hash(${input})`);
    tokenRepo.create.mockResolvedValue(undefined);

    const useCase = new GenerateTelegramLinkTokenUseCase(tokenRepo as any, hashService as any, 'BarberiaSAbot');
    const controller = new TelegramController(useCase);

    app = express();
    app.use(express.json());
    app.use('/api/telegram', createTelegramRouter({ telegramController: controller, authenticate: authenticate as any }));
  });

  it('permite a un cliente registrado generar el token de vinculación', async () => {
    currentUser = { _id: 'client-1', email: 'cliente@test.com', kind: 'Registrado' };

    const res = await request(app).post('/api/telegram/link-token');

    expect(res.status).toBe(200);
  });

  it('rechaza con 403 a un Admin (la vinculación es solo para clientes)', async () => {
    currentUser = { _id: 'admin-1', email: 'admin@test.com', kind: 'Admin' };

    const res = await request(app).post('/api/telegram/link-token');

    expect(res.status).toBe(403);
  });

  it('rechaza con 403 a un Empleado (la vinculación es solo para clientes)', async () => {
    currentUser = { _id: 'barber-1', email: 'barbero@test.com', kind: 'Empleado' };

    const res = await request(app).post('/api/telegram/link-token');

    expect(res.status).toBe(403);
  });
});
