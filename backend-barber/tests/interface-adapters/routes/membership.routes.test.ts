import request from 'supertest';
import express from 'express';

jest.mock('express-rate-limit', () => () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next());

import { createMembershipRouter } from '../../../src/interface-adapters/routes/membership.routes';
import { MembershipController } from '../../../src/interface-adapters/controllers/membership/MembershipController';
import { CreateMembershipUseCase } from '../../../src/application/use-cases/membership/CreateMembershipUseCase';
import { Membership } from '../../../src/domain/entities/Membership';
import { makeMockMembershipRepository, makeMockUserRepository, makeMockMembershipTransactionRepository } from '../../test-utils/mocks';

describe('Membership routes', () => {
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
    price: 399,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    couponsTotal: 4,
    couponsUsed: 0,
    productDiscount: 10,
    durationDays: 30,
    billingCycle: null as any,
    createdBy: 'client' as const,
    paymentMethod: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const activeMembership = () => Membership.restore({ ...baseProps, status: 'active' });
  const expiredMembership = () => Membership.restore({ ...baseProps, status: 'expired' });
  const pendingMembership = () => Membership.restore({ ...baseProps, status: 'pending' });

  beforeEach(() => {
    membershipRepo = makeMockMembershipRepository();
    const userRepo = makeMockUserRepository();
    const transactionRepo = makeMockMembershipTransactionRepository();
    const controller = new MembershipController(membershipRepo as any, userRepo as any, transactionRepo as any);

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
      expect(response.body).toEqual({ active: null, pending: null, history: [] });
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

  describe('POST /api/memberships — create (solo staff)', () => {
    it('debe retornar 403 si no es Admin ni Empleado', async () => {
      const response = await request(app)
        .post('/api/memberships')
        .send({ userId: '507f1f77bcf86cd799439099' });

      expect(response.status).toBe(403);
    });

    it('debe crear membresía para Admin', async () => {
      const fakeUser = { id: 'user-1', email: 'user@test.com', name: 'Test', lastname: 'User' };
      const userRepo = makeMockUserRepository();
      userRepo.findById.mockResolvedValue(fakeUser);
      membershipRepo = makeMockMembershipRepository();
      membershipRepo.hasActiveMembership.mockResolvedValue(false);
      membershipRepo.save.mockResolvedValue(activeMembership());

      const transactionRepo = makeMockMembershipTransactionRepository();
      const createMembershipUseCase = new CreateMembershipUseCase(membershipRepo as any, userRepo as any, transactionRepo as any);
      const controller = new MembershipController(membershipRepo as any, userRepo as any, transactionRepo as any, undefined, undefined, undefined, undefined, createMembershipUseCase);
      const staffAppLocal = express();
      staffAppLocal.use(express.json());
      staffAppLocal.use('/api/memberships', createMembershipRouter({ membershipController: controller, authenticate: authenticateStaff as any }));

      const response = await request(staffAppLocal)
        .post('/api/memberships')
        .send({ userId: 'user-1', paymentMethod: 'local' });

      expect(response.status).toBe(201);
    });
  });

  describe('POST /api/memberships/:id/approve', () => {
    it('debe aprobar membresía pendiente', async () => {
      membershipRepo.findById.mockResolvedValue(pendingMembership());
      membershipRepo.approvePending.mockResolvedValue(activeMembership());

      const response = await request(staffApp)
        .post('/api/memberships/507f1f77bcf86cd799439011/approve');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('active');
    });

    it('debe retornar 400 si no está pendiente', async () => {
      membershipRepo.findById.mockResolvedValue(activeMembership());

      const response = await request(staffApp)
        .post('/api/memberships/507f1f77bcf86cd799439011/approve');

      expect(response.status).toBe(400);
    });
  });
});
