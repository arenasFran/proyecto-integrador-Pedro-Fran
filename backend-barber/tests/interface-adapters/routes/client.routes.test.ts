import request from 'supertest';
import express from 'express';
import { createClientRouter } from '../../../src/interface-adapters/routes/client.routes';
import { ClientController } from '../../../src/interface-adapters/controllers/client/ClientController';
import { Client } from '../../../src/domain/entities/Client';
import { AppError } from '../../../src/domain/errors/AppError';

describe('Client routes — sanciones por inasistencias', () => {
  const makeClient = (overrides?: Partial<Parameters<typeof Client.create>[0]>) =>
    Client.create({
      id: '507f1f77bcf86cd799439011',
      name: 'Juan',
      lastname: 'Perez',
      phone: '+59899123456',
      kind: 'NoRegistrado',
      noShowCount: 3,
      ...overrides,
    });

  let app: express.Application;
  let manageSanction: { sancionar: jest.Mock; levantar: jest.Mock };

  const authenticateAs = (kind: string): express.RequestHandler =>
    (_req, _res, next) => {
      (_req as any).user = { _id: 'admin-1', email: 'admin@test.com', kind };
      next();
    };

  beforeEach(() => {
    manageSanction = {
      sancionar: jest.fn(),
      levantar: jest.fn(),
    };
    const controller = new ClientController(manageSanction as any);

    app = express();
    app.use(express.json());
    app.use('/api/clients', createClientRouter({
      authenticate: authenticateAs('Admin'),
      clientController: controller,
    }));
  });

  describe('PATCH /api/clients/:id/sancion', () => {
    it('debe sancionar al cliente (Admin)', async () => {
      manageSanction.sancionar.mockResolvedValue(
        makeClient({ sancionado: true, fechaSancion: new Date(), motivoSancion: '3 inasistencias', sancionadoPor: 'admin@test.com' })
      );

      const response = await request(app)
        .patch('/api/clients/507f1f77bcf86cd799439011/sancion')
        .send({ motivo: '3 inasistencias' });

      expect(response.status).toBe(200);
      expect(manageSanction.sancionar).toHaveBeenCalledWith(
        { clientId: '507f1f77bcf86cd799439011', motivo: '3 inasistencias' },
        'admin@test.com'
      );
      expect(response.body.message).toMatch(/sancionado/);
    });

    it('debe fallar con 400 si el cliente no alcanzó las 3 inasistencias', async () => {
      manageSanction.sancionar.mockRejectedValue(
        new AppError('El cliente debe acumular al menos 3 inasistencias para ser sancionado.', 400)
      );

      const response = await request(app)
        .patch('/api/clients/507f1f77bcf86cd799439011/sancion')
        .send({ motivo: 'Inasistencias' });

      expect(response.status).toBe(400);
    });

    it('debe validar el id del cliente', async () => {
      const response = await request(app)
        .patch('/api/clients/invalid-id/sancion')
        .send({ motivo: 'Inasistencias' });

      expect(response.status).toBe(400);
      expect(manageSanction.sancionar).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/clients/:id/sancion/levantar', () => {
    it('debe levantar la sanción (Admin)', async () => {
      manageSanction.levantar.mockResolvedValue(
        makeClient({ sancionado: false, noShowCount: 0 })
      );

      const response = await request(app)
        .patch('/api/clients/507f1f77bcf86cd799439011/sancion/levantar');

      expect(response.status).toBe(200);
      expect(manageSanction.levantar).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(response.body.message).toMatch(/levantada/);
    });

    it('debe fallar si el cliente no está sancionado', async () => {
      manageSanction.levantar.mockRejectedValue(
        new AppError('El cliente no se encuentra sancionado.', 400)
      );

      const response = await request(app)
        .patch('/api/clients/507f1f77bcf86cd799439011/sancion/levantar');

      expect(response.status).toBe(400);
    });
  });
});