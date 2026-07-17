import request from 'supertest';
import express from 'express';
import { createMembershipRouter } from '../../../src/interface-adapters/routes/membership.routes';
import { MembershipController } from '../../../src/interface-adapters/controllers/membership/MembershipController';
import { Membership } from '../../../src/domain/entities/Membership';
import { makeMockMembershipRepository, makeMockUserRepository, makeMockMembershipTransactionRepository } from '../../test-utils/mocks';

describe('POST /api/memberships — autorización', () => {
  let app: express.Application;
  let membershipRepo: ReturnType<typeof makeMockMembershipRepository>;
  let userRepo: ReturnType<typeof makeMockUserRepository>;
  let currentUser: { _id: string; email: string; kind: string };

  const authenticate: express.RequestHandler = (req, _res, next) => {
    (req as any).user = currentUser;
    next();
  };

  const fakeUser = (id: string) => ({ id, email: `${id}@test.com`, name: 'Test', lastname: 'User' });

  const savedMembership = (userId: string, createdBy: 'client' | 'admin') =>
    Membership.restore({
      id: '507f1f77bcf86cd799439011',
      userId,
      price: 399,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      couponsTotal: 4,
      couponsUsed: 0,
      productDiscount: 10,
      durationDays: 30,
      billingCycle: null,
      createdBy,
      paymentMethod: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  beforeEach(() => {
    membershipRepo = makeMockMembershipRepository();
    userRepo = makeMockUserRepository();
    const controller = new MembershipController(membershipRepo as any, userRepo as any, makeMockMembershipTransactionRepository() as any);

    app = express();
    app.use(express.json());
    app.use('/api/memberships', createMembershipRouter({ membershipController: controller, authenticate: authenticate as any }));
  });

  const userId2 = '507f1f77bcf86cd799439012';
  const adminId = '507f1f77bcf86cd799439013';

  it('permite a un admin crear una membresía para otro usuario', async () => {
    currentUser = { _id: adminId, email: 'admin@test.com', kind: 'Admin' };
    userRepo.findById.mockResolvedValue(fakeUser(userId2));
    membershipRepo.hasActiveMembership.mockResolvedValue(false);
    membershipRepo.save.mockResolvedValue(savedMembership(userId2, 'admin'));

    const res = await request(app).post('/api/memberships').send({ userId: userId2 });

    expect(res.status).toBe(201);
  });

  it('rechaza con 403 si un cliente intenta crear una membresía (solo staff)', async () => {
    currentUser = { _id: userId2, email: 'user@test.com', kind: 'Registrado' };

    const res = await request(app).post('/api/memberships').send({ userId: userId2 });

    expect(res.status).toBe(403);
  });

  it('respeta couponsTotal/productDiscount enviados por un admin', async () => {
    currentUser = { _id: adminId, email: 'admin@test.com', kind: 'Admin' };
    userRepo.findById.mockResolvedValue(fakeUser(userId2));
    membershipRepo.hasActiveMembership.mockResolvedValue(false);
    membershipRepo.save.mockResolvedValue(savedMembership(userId2, 'admin'));

    const res = await request(app)
      .post('/api/memberships')
      .send({ userId: userId2, couponsTotal: 12, productDiscount: 100 });

    expect(res.status).toBe(201);
    const createdMembership = membershipRepo.save.mock.calls[0][0];
    expect(createdMembership.couponsTotal).toBe(12);
    expect(createdMembership.productDiscount).toBe(100);
  });
});
