import { MembershipController } from '../../../../src/interface-adapters/controllers/membership/MembershipController';
import { Membership } from '../../../../src/domain/entities/Membership';
import { AppError } from '../../../../src/domain/errors/AppError';
import { createMockReqFull, createMockRes } from '../../../test-utils/expressMocks';
import { makeMockMembershipRepository, makeMockMembershipTransactionRepository, makeMockUserRepository } from '../../../test-utils/mocks';

const makeMembership = (overrides?: Partial<{ userId: string; status: 'active' | 'pending' | 'expired'; couponsUsed: number; couponsTotal: number }>) =>
  Membership.restore({
    id: 'mem-1',
    userId: overrides?.userId ?? 'user-1',
    status: overrides?.status ?? 'active',
    price: 399,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    couponsTotal: overrides?.couponsTotal ?? 4,
    couponsUsed: overrides?.couponsUsed ?? 0,
    productDiscount: 10,
    durationDays: 30,
    billingCycle: null,
    createdBy: 'client',
    paymentMethod: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('MembershipController', () => {
  let membershipRepo: ReturnType<typeof makeMockMembershipRepository>;
  let userRepo: ReturnType<typeof makeMockUserRepository>;
  let transactionRepo: ReturnType<typeof makeMockMembershipTransactionRepository>;
  let createMembershipUseCase: { execute: jest.Mock };
  let cancelMembershipUseCase: { execute: jest.Mock };
  let initiateMembershipPaymentUseCase: { execute: jest.Mock };
  let approvePendingMembershipUseCase: { execute: jest.Mock };
  let retryMembershipPaymentUseCase: { execute: jest.Mock };
  let controller: MembershipController;

  const makeFullController = () =>
    new MembershipController(
      membershipRepo as any,
      userRepo as any,
      transactionRepo as any,
      undefined,
      undefined,
      createMembershipUseCase as any,
      cancelMembershipUseCase as any,
      initiateMembershipPaymentUseCase as any,
      approvePendingMembershipUseCase as any,
      retryMembershipPaymentUseCase as any,
    );

  beforeEach(() => {
    membershipRepo = makeMockMembershipRepository();
    userRepo = makeMockUserRepository();
    transactionRepo = makeMockMembershipTransactionRepository();
    createMembershipUseCase = { execute: jest.fn() };
    cancelMembershipUseCase = { execute: jest.fn() };
    initiateMembershipPaymentUseCase = { execute: jest.fn() };
    approvePendingMembershipUseCase = { execute: jest.fn() };
    retryMembershipPaymentUseCase = { execute: jest.fn() };
    userRepo.findByIds.mockResolvedValue(new Map());
    controller = makeFullController();
  });

  describe('getMyMembership', () => {
    it('debe devolver active/pending/history', async () => {
      membershipRepo.findActiveByUser.mockResolvedValue(makeMembership());
      membershipRepo.findPendingByUser.mockResolvedValue(null);
      membershipRepo.findByUser.mockResolvedValue([]);
      const req = createMockReqFull({});
      (req as any).user = { _id: 'user-1' };
      const res = createMockRes();

      await controller.getMyMembership(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ active: expect.objectContaining({ id: 'mem-1' }), pending: null, history: [] }),
      );
    });

    it('debe responder 500 si falla el repositorio', async () => {
      membershipRepo.findActiveByUser.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({});
      (req as any).user = { _id: 'user-1' };
      const res = createMockRes();

      await controller.getMyMembership(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getByUserId', () => {
    it('debe devolver el resumen del usuario indicado', async () => {
      membershipRepo.findActiveByUser.mockResolvedValue(null);
      membershipRepo.findPendingByUser.mockResolvedValue(null);
      membershipRepo.findByUser.mockResolvedValue([]);
      const req = createMockReqFull({ params: { userId: 'user-2' } });
      const res = createMockRes();

      await controller.getByUserId(req, res);

      expect(membershipRepo.findActiveByUser).toHaveBeenCalledWith('user-2');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    it('debe responder 403 si el usuario no es staff', async () => {
      const req = createMockReqFull({ body: { userId: 'user-1' } });
      (req as any).user = { _id: 'admin-1', kind: 'Registrado' };
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('debe crear la membresía cuando el usuario es Admin', async () => {
      createMembershipUseCase.execute.mockResolvedValue(makeMembership());
      const req = createMockReqFull({ body: { userId: 'user-1' } });
      (req as any).user = { _id: 'admin-1', kind: 'Admin' };
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('debe crear la membresía cuando el usuario es Empleado', async () => {
      createMembershipUseCase.execute.mockResolvedValue(makeMembership());
      const req = createMockReqFull({ body: { userId: 'user-1' } });
      (req as any).user = { _id: 'emp-1', kind: 'Empleado' };
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('debe responder 500 si el caso de uso no está disponible', async () => {
      controller = new MembershipController(membershipRepo as any, userRepo as any, transactionRepo as any);
      const req = createMockReqFull({ body: { userId: 'user-1' } });
      (req as any).user = { _id: 'admin-1', kind: 'Admin' };
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('debe propagar el AppError del caso de uso', async () => {
      createMembershipUseCase.execute.mockRejectedValue(new AppError('El usuario ya tiene una membresía activa.', 409));
      const req = createMockReqFull({ body: { userId: 'user-1' } });
      (req as any).user = { _id: 'admin-1', kind: 'Admin' };
      const res = createMockRes();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('getAll', () => {
    it('debe listar membresías con datos de usuario enriquecidos', async () => {
      membershipRepo.findAllEntityView.mockResolvedValue({ data: [makeMembership()], total: 1, page: 1, totalPages: 1, limit: 10 });
      userRepo.findByIds.mockResolvedValue(new Map([['user-1', { id: 'user-1', name: 'Ana', lastname: 'Gomez', email: 'ana@test.com' } as any]]));
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: [expect.objectContaining({ user: expect.objectContaining({ name: 'Ana' }) })] }),
      );
    });

    it('debe devolver user null si no se encuentra el usuario', async () => {
      membershipRepo.findAllEntityView.mockResolvedValue({ data: [makeMembership()], total: 1, page: 1, totalPages: 1, limit: 10 });
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: [expect.objectContaining({ user: null })] }),
      );
    });
  });

  describe('getById', () => {
    it('debe devolver la membresía', async () => {
      membershipRepo.findById.mockResolvedValue(makeMembership());
      const req = createMockReqFull({ params: { id: 'mem-1' } });
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe responder 404 si no existe', async () => {
      membershipRepo.findById.mockResolvedValue(null);
      const req = createMockReqFull({ params: { id: 'mem-x' } });
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('cancel', () => {
    it('debe cancelar la membresía', async () => {
      cancelMembershipUseCase.execute.mockResolvedValue(undefined);
      const req = createMockReqFull({ params: { id: 'mem-1' } });
      (req as any).user = { _id: 'admin-1', kind: 'Admin' };
      const res = createMockRes();

      await controller.cancel(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe responder 500 si el caso de uso no está disponible', async () => {
      controller = new MembershipController(membershipRepo as any, userRepo as any, transactionRepo as any);
      const req = createMockReqFull({ params: { id: 'mem-1' } });
      (req as any).user = { _id: 'admin-1', kind: 'Admin' };
      const res = createMockRes();

      await controller.cancel(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('initiatePayment', () => {
    it('debe iniciar el pago y responder 201', async () => {
      initiateMembershipPaymentUseCase.execute.mockResolvedValue({
        preferenceId: 'pref-1', initPoint: 'init', sandboxInitPoint: 'sandbox', paymentId: 'pay-1', membershipId: 'mem-1',
      });
      const req = createMockReqFull({ body: { userId: 'user-1' } });
      (req as any).user = { _id: 'user-1', kind: 'Registrado', email: 'user@test.com' };
      const res = createMockRes();

      await controller.initiatePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('debe responder 500 si MercadoPago no está configurado', async () => {
      controller = new MembershipController(membershipRepo as any, userRepo as any, transactionRepo as any);
      const req = createMockReqFull({ body: { userId: 'user-1' } });
      (req as any).user = { _id: 'user-1', kind: 'Registrado', email: 'user@test.com' };
      const res = createMockRes();

      await controller.initiatePayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('approvePending', () => {
    it('debe aprobar la membresía pendiente', async () => {
      approvePendingMembershipUseCase.execute.mockResolvedValue({ ok: true });
      const req = createMockReqFull({ params: { id: 'mem-1' } });
      (req as any).user = { _id: 'admin-1' };
      const res = createMockRes();

      await controller.approvePending(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe responder 500 si el caso de uso no está disponible', async () => {
      controller = new MembershipController(membershipRepo as any, userRepo as any, transactionRepo as any);
      const req = createMockReqFull({ params: { id: 'mem-1' } });
      (req as any).user = { _id: 'admin-1' };
      const res = createMockRes();

      await controller.approvePending(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('retryPayment', () => {
    it('debe reintentar el pago y responder 201', async () => {
      retryMembershipPaymentUseCase.execute.mockResolvedValue({
        preferenceId: 'pref-2', initPoint: 'init', sandboxInitPoint: 'sandbox', paymentId: 'pay-2', membershipId: 'mem-1',
      });
      const req = createMockReqFull({ body: { userId: 'user-1' } });
      (req as any).user = { _id: 'user-1', kind: 'Registrado', email: 'user@test.com' };
      const res = createMockRes();

      await controller.retryPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('debe responder 500 si MercadoPago no está configurado', async () => {
      controller = new MembershipController(membershipRepo as any, userRepo as any, transactionRepo as any);
      const req = createMockReqFull({ body: { userId: 'user-1' } });
      (req as any).user = { _id: 'user-1', kind: 'Registrado', email: 'user@test.com' };
      const res = createMockRes();

      await controller.retryPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('redeemCoupon', () => {
    it('debe canjear un cupón y devolver los restantes', async () => {
      const membership = makeMembership({ couponsUsed: 0 });
      membershipRepo.findActiveByUser.mockResolvedValue(membership);
      membershipRepo.incrementCouponsUsed.mockResolvedValue({ remainingCoupons: 3, couponsUsed: 1 });
      const req = createMockReqFull({ body: { userId: 'user-1' } });
      const res = createMockRes();

      await controller.redeemCoupon(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ remainingCoupons: 3, couponsUsed: 1 }));
    });

    it('debe responder 400 si el usuario no tiene membresía activa', async () => {
      membershipRepo.findActiveByUser.mockResolvedValue(null);
      const req = createMockReqFull({ body: { userId: 'user-1' } });
      const res = createMockRes();

      await controller.redeemCoupon(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 409 si no quedan cupones al persistir', async () => {
      const membership = makeMembership({ couponsUsed: 0 });
      membershipRepo.findActiveByUser.mockResolvedValue(membership);
      membershipRepo.incrementCouponsUsed.mockResolvedValue(null);
      const req = createMockReqFull({ body: { userId: 'user-1' } });
      const res = createMockRes();

      await controller.redeemCoupon(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('debe responder según el AppError si redeemCoupon() lanza (sin cupones)', async () => {
      const membership = makeMembership({ couponsUsed: 4, couponsTotal: 4 });
      membershipRepo.findActiveByUser.mockResolvedValue(membership);
      const req = createMockReqFull({ body: { userId: 'user-1' } });
      const res = createMockRes();

      await controller.redeemCoupon(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(membershipRepo.incrementCouponsUsed).not.toHaveBeenCalled();
    });
  });

  describe('getTransactions', () => {
    it('debe buscar por membershipId cuando se provee', async () => {
      transactionRepo.findByMembershipId.mockResolvedValue({ data: [], total: 0 });
      const req = createMockReqFull({ query: { membershipId: 'mem-1' } });
      const res = createMockRes();

      await controller.getTransactions(req, res);

      expect(transactionRepo.findByMembershipId).toHaveBeenCalledWith('mem-1', expect.any(Object));
      expect(transactionRepo.findAll).not.toHaveBeenCalled();
    });

    it('debe buscar por userId cuando se provee (sin membershipId)', async () => {
      transactionRepo.findAll.mockResolvedValue({ data: [], total: 0 });
      transactionRepo.findByUser.mockResolvedValue({ data: [{ id: 'tx-1' }], total: 1 });
      const req = createMockReqFull({ query: { userId: 'user-1' } });
      const res = createMockRes();

      await controller.getTransactions(req, res);

      expect(transactionRepo.findByUser).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [{ id: 'tx-1' }] }));
    });

    it('debe devolver todas las transacciones si no hay membershipId ni userId', async () => {
      transactionRepo.findAll.mockResolvedValue({ data: [{ id: 'tx-2' }], total: 1 });
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getTransactions(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [{ id: 'tx-2' }] }));
    });
  });

  describe('getPending', () => {
    it('debe devolver membresías pendientes con datos de usuario', async () => {
      membershipRepo.findPendingAll.mockResolvedValue([makeMembership({ status: 'pending' })]);
      userRepo.findByIds.mockResolvedValue(new Map([['user-1', { id: 'user-1', name: 'Ana', lastname: 'Gomez', email: 'a@test.com' } as any]]));
      const req = createMockReqFull({});
      const res = createMockRes();

      await controller.getPending(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: [expect.objectContaining({ user: expect.objectContaining({ name: 'Ana' }) })] }),
      );
    });
  });

  describe('getExpiringSoon', () => {
    it('debe usar 5 días por defecto y calcular daysLeft', async () => {
      const membership = makeMembership();
      membershipRepo.findExpiringSoon.mockResolvedValue([membership]);
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getExpiringSoon(req, res);

      expect(membershipRepo.findExpiringSoon).toHaveBeenCalledWith(5);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ days: 5 }));
    });

    it('debe usar el parámetro days provisto', async () => {
      membershipRepo.findExpiringSoon.mockResolvedValue([]);
      const req = createMockReqFull({ query: { days: '10' } });
      const res = createMockRes();

      await controller.getExpiringSoon(req, res);

      expect(membershipRepo.findExpiringSoon).toHaveBeenCalledWith(10);
    });
  });

  describe('getCouponHistory', () => {
    it('debe devolver el historial de cupones', async () => {
      const membership = makeMembership();
      membershipRepo.findById.mockResolvedValue(membership);
      membershipRepo.findCouponAppointments.mockResolvedValue([
        { _id: 'appt-1', date: '2026-01-01', startTime: '10:00', serviceName: 'Corte', servicePrice: 500, status: 'Confirmado' },
      ]);
      const req = createMockReqFull({ params: { id: 'mem-1' } });
      (req as any).user = { _id: 'user-1', kind: 'Registrado' };
      const res = createMockRes();

      await controller.getCouponHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ history: [expect.objectContaining({ appointmentId: 'appt-1', couponRestored: false })] }),
      );
    });

    it('debe responder 404 si la membresía no existe', async () => {
      membershipRepo.findById.mockResolvedValue(null);
      const req = createMockReqFull({ params: { id: 'mem-x' } });
      (req as any).user = { _id: 'user-1', kind: 'Registrado' };
      const res = createMockRes();

      await controller.getCouponHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debe responder 403 si el usuario no es dueño ni admin', async () => {
      membershipRepo.findById.mockResolvedValue(makeMembership({ userId: 'otro-user' }));
      const req = createMockReqFull({ params: { id: 'mem-1' } });
      (req as any).user = { _id: 'user-1', kind: 'Registrado' };
      const res = createMockRes();

      await controller.getCouponHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('addCouponsToMembership', () => {
    it('debe agregar cupones cuando el actor es Admin', async () => {
      membershipRepo.findById.mockResolvedValue(makeMembership());
      membershipRepo.addCouponsTotal.mockResolvedValue({ id: 'mem-1', couponsTotal: 6, couponsUsed: 0, remainingCoupons: 6 });
      const req = createMockReqFull({ params: { id: 'mem-1' }, body: { count: 2 } });
      (req as any).user = { kind: 'Admin' };
      const res = createMockRes();

      await controller.addCouponsToMembership(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ couponsTotal: 6 }));
    });

    it('debe responder 400 si count no es un entero positivo', async () => {
      const req = createMockReqFull({ params: { id: 'mem-1' }, body: { count: -1 } });
      (req as any).user = { kind: 'Admin' };
      const res = createMockRes();

      await controller.addCouponsToMembership(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe responder 403 si el actor no es Admin', async () => {
      const req = createMockReqFull({ params: { id: 'mem-1' }, body: { count: 2 } });
      (req as any).user = { kind: 'Empleado' };
      const res = createMockRes();

      await controller.addCouponsToMembership(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('debe responder 404 si la membresía no existe', async () => {
      membershipRepo.findById.mockResolvedValue(null);
      const req = createMockReqFull({ params: { id: 'mem-x' }, body: { count: 2 } });
      (req as any).user = { kind: 'Admin' };
      const res = createMockRes();

      await controller.addCouponsToMembership(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debe responder 500 si addCouponsTotal falla', async () => {
      membershipRepo.findById.mockResolvedValue(makeMembership());
      membershipRepo.addCouponsTotal.mockResolvedValue(null);
      const req = createMockReqFull({ params: { id: 'mem-1' }, body: { count: 2 } });
      (req as any).user = { kind: 'Admin' };
      const res = createMockRes();

      await controller.addCouponsToMembership(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
