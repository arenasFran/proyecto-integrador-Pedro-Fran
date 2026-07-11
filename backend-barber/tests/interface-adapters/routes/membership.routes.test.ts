import request from 'supertest';
import express from 'express';

// Los limiters de membership.routes.ts son de módulo (contador compartido entre tests).
// Estos tests no verifican rate limiting, así que se neutraliza para que no interfiera.
jest.mock('express-rate-limit', () => () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next());

import { createMembershipRouter } from '../../../src/interface-adapters/routes/membership.routes';
import { MembershipController } from '../../../src/interface-adapters/controllers/membership/MembershipController';
import { Membership } from '../../../src/domain/entities/Membership';
import { makeMockMembershipRepository, makeMockUserRepository } from '../../test-utils/mocks';

describe('Membership routes — cancel / reactivate', () => {
  let app: express.Application;
  let staffApp: express.Application;
  let empleadoApp: express.Application;
  let membershipRepo: ReturnType<typeof makeMockMembershipRepository>;

  const authenticate: express.RequestHandler = (req, _res, next) => {
    (req as any).user = { _id: 'user-1', email: 'test@test.com', kind: 'Registrado' };
    next();
  };

  const authenticateStaff: express.RequestHandler = (req, _res, next) => {
    (req as any).user = { _id: 'admin-1', email: 'admin@test.com', kind: 'Admin' };
    next();
  };

  const authenticateEmpleado: express.RequestHandler = (req, _res, next) => {
    (req as any).user = { _id: 'barbero-1', email: 'barbero@test.com', kind: 'Empleado' };
    next();
  };

  const baseProps = {
    id: '507f1f77bcf86cd799439011',
    userId: 'user-1',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    couponsTotal: 4,
    couponsUsed: 0,
    productDiscount: 10,
    autoRenew: true,
    createdBy: 'client' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const activeMembership = () => Membership.restore({ ...baseProps, status: 'active' });
  const cancelledMembership = () => Membership.restore({ ...baseProps, status: 'active', autoRenew: false });
  const expiredMembership = () => Membership.restore({ ...baseProps, status: 'expired' });
  const expiredCancelledMembership = () => Membership.restore({ ...baseProps, status: 'expired', autoRenew: false });

  beforeEach(() => {
    membershipRepo = makeMockMembershipRepository();
    const userRepo = makeMockUserRepository();
    const controller = new MembershipController(membershipRepo as any, userRepo as any);

    app = express();
    app.use(express.json());
    app.use('/api/memberships', createMembershipRouter({ membershipController: controller, authenticate: authenticate as any }));

    staffApp = express();
    staffApp.use(express.json());
    staffApp.use('/api/memberships', createMembershipRouter({ membershipController: controller, authenticate: authenticateStaff as any }));

    empleadoApp = express();
    empleadoApp.use(express.json());
    empleadoApp.use('/api/memberships', createMembershipRouter({ membershipController: controller, authenticate: authenticateEmpleado as any }));
  });

  describe('GET /api/memberships/user/:userId', () => {
    const userId = '507f1f77bcf86cd799439099';

    it('debe devolver la membresía activa y el historial (Admin)', async () => {
      membershipRepo.findActiveByUser.mockResolvedValue(activeMembership());
      membershipRepo.findByUser.mockResolvedValue([activeMembership()]);

      const response = await request(staffApp).get(`/api/memberships/user/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.active).toMatchObject({ status: 'active' });
      expect(response.body.history).toHaveLength(1);
    });

    it('debe permitir el acceso a un Empleado', async () => {
      membershipRepo.findActiveByUser.mockResolvedValue(null);
      membershipRepo.findByUser.mockResolvedValue([]);

      const response = await request(empleadoApp).get(`/api/memberships/user/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ active: null, history: [] });
    });

    it('debe retornar 403 si quien pide no es Admin ni Empleado', async () => {
      const response = await request(app).get(`/api/memberships/user/${userId}`);

      expect(response.status).toBe(403);
    });

    it('debe devolver active: null y el historial si no tiene membresía activa', async () => {
      membershipRepo.findActiveByUser.mockResolvedValue(null);
      membershipRepo.findByUser.mockResolvedValue([expiredMembership()]);

      const response = await request(staffApp).get(`/api/memberships/user/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.active).toBeNull();
      expect(response.body.history).toHaveLength(1);
    });
  });

  describe('POST /api/memberships/:id/cancel', () => {
    it('debe cancelar la renovación automática exitosamente', async () => {
      const mem = activeMembership();
      membershipRepo.findById.mockResolvedValue(mem);
      membershipRepo.updateAutoRenew.mockResolvedValue(cancelledMembership());

      const response = await request(app)
        .post('/api/memberships/507f1f77bcf86cd799439011/cancel');

      expect(response.status).toBe(200);
      expect(response.body.autoRenew).toBe(false);
      expect(response.body.status).toBe('active');
    });

    it('debe retornar 404 si la membresía no existe', async () => {
      membershipRepo.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/memberships/507f1f77bcf86cd799439011/cancel');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Membresía no encontrada.' });
    });

    it('debe retornar 403 si el usuario no es el dueño', async () => {
      const mem = activeMembership();
      jest.spyOn(mem, 'userId', 'get').mockReturnValue('other-user');
      membershipRepo.findById.mockResolvedValue(mem);

      const response = await request(app)
        .post('/api/memberships/507f1f77bcf86cd799439011/cancel');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'No tenés permisos para cancelar esta membresía.' });
    });

    it('debe retornar 400 si la membresía no está activa', async () => {
      membershipRepo.findById.mockResolvedValue(expiredMembership());

      const response = await request(app)
        .post('/api/memberships/507f1f77bcf86cd799439011/cancel');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'La membresía no está activa.' });
    });

    it('debe retornar 400 si autoRenew ya es false (doble cancelación)', async () => {
      const mem = cancelledMembership();
      membershipRepo.findById.mockResolvedValue(mem);

      const response = await request(app)
        .post('/api/memberships/507f1f77bcf86cd799439011/cancel');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'La renovación automática ya está desactivada.' });
    });
  });

  describe('POST /api/memberships/redeem', () => {
    const redeemBody = { userId: '507f1f77bcf86cd799439099' };

    it('debe canjear un cupón exitosamente', async () => {
      membershipRepo.findActiveByUser.mockResolvedValue(activeMembership());
      membershipRepo.incrementCouponsUsed.mockResolvedValue(
        Membership.restore({ ...baseProps, status: 'active', couponsUsed: 1 })
      );

      const response = await request(staffApp)
        .post('/api/memberships/redeem')
        .send(redeemBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ remainingCoupons: 3, couponsUsed: 1 });
    });

    it('debe retornar 400 si el usuario no tiene membresía activa', async () => {
      membershipRepo.findActiveByUser.mockResolvedValue(null);

      const response = await request(staffApp)
        .post('/api/memberships/redeem')
        .send(redeemBody);

      expect(response.status).toBe(400);
    });

    it('debe retornar 409 si el canje concurrente ya agotó los cupones (incrementCouponsUsed devuelve null)', async () => {
      membershipRepo.findActiveByUser.mockResolvedValue(activeMembership());
      membershipRepo.incrementCouponsUsed.mockResolvedValue(null);

      const response = await request(staffApp)
        .post('/api/memberships/redeem')
        .send(redeemBody);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: 'No quedan cupones disponibles.' });
    });

    it('debe retornar 403 si quien pide el canje no es Admin ni Empleado', async () => {
      const response = await request(app)
        .post('/api/memberships/redeem')
        .send(redeemBody);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/memberships/:id/reactivate', () => {
    it('debe reactivar la renovación automática exitosamente', async () => {
      const mem = cancelledMembership();
      membershipRepo.findById.mockResolvedValue(mem);
      membershipRepo.updateAutoRenew.mockResolvedValue(activeMembership());

      const response = await request(app)
        .post('/api/memberships/507f1f77bcf86cd799439011/reactivate');

      expect(response.status).toBe(200);
      expect(response.body.autoRenew).toBe(true);
    });

    it('debe retornar 404 si la membresía no existe', async () => {
      membershipRepo.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/memberships/507f1f77bcf86cd799439011/reactivate');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Membresía no encontrada.' });
    });

    it('debe retornar 403 si el usuario no es el dueño', async () => {
      const mem = cancelledMembership();
      jest.spyOn(mem, 'userId', 'get').mockReturnValue('other-user');
      membershipRepo.findById.mockResolvedValue(mem);

      const response = await request(app)
        .post('/api/memberships/507f1f77bcf86cd799439011/reactivate');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'No tenés permisos para reactivar esta membresía.' });
    });

    it('debe retornar 400 si autoRenew ya es true', async () => {
      membershipRepo.findById.mockResolvedValue(activeMembership());

      const response = await request(app)
        .post('/api/memberships/507f1f77bcf86cd799439011/reactivate');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'La renovación automática ya está activa.' });
    });

    it('debe retornar 400 si la membresía no está activa', async () => {
      membershipRepo.findById.mockResolvedValue(expiredCancelledMembership());

      const response = await request(app)
        .post('/api/memberships/507f1f77bcf86cd799439011/reactivate');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'La membresía no está activa.' });
    });
  });
});
