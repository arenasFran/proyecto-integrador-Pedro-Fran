import { Membership } from '../../../src/domain/entities/Membership';
import { AppError } from '../../../src/domain/errors/AppError';
import { MEMBERSHIP_DEFAULTS } from '../../../src/domain/types/membership';

describe('Membership entity', () => {
  const makeActiveMembership = (overrides?: Partial<{
    couponsTotal: number;
    couponsUsed: number;
    endDate: Date;
    status: 'active' | 'expired' | 'cancelled' | 'pending';
  }>) => {
    const future = new Date();
    future.setDate(future.getDate() + 30);

    return Membership.restore({
      id: 'mem-1',
      userId: 'user-1',
      status: overrides?.status ?? 'active',
      price: 399,
      startDate: new Date(),
      endDate: overrides?.endDate ?? future,
      couponsTotal: overrides?.couponsTotal ?? 4,
      couponsUsed: overrides?.couponsUsed ?? 0,
      productDiscount: 10,
      autoRenew: true,
      createdBy: 'client',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  describe('create', () => {
    it('debe crear membresía con valores por defecto', () => {
      const m = Membership.create({ userId: 'u1', createdBy: 'client' });
      expect(m.status).toBe('active');
      expect(m.couponsTotal).toBe(MEMBERSHIP_DEFAULTS.couponsTotal);
      expect(m.couponsUsed).toBe(0);
      expect(m.remainingCoupons).toBe(MEMBERSHIP_DEFAULTS.couponsTotal);
      expect(m.productDiscount).toBe(MEMBERSHIP_DEFAULTS.productDiscount);
    });

    it('debe crear membresía con valores personalizados', () => {
      const m = Membership.create({ userId: 'u1', createdBy: 'admin', couponsTotal: 6, productDiscount: 15 });
      expect(m.couponsTotal).toBe(6);
      expect(m.productDiscount).toBe(15);
      expect(m.createdBy).toBe('admin');
    });
  });

  describe('redeemCoupon', () => {
    it('debe incrementar couponsUsed en 1', () => {
      const m = makeActiveMembership();
      m.redeemCoupon();
      expect(m.couponsUsed).toBe(1);
      expect(m.remainingCoupons).toBe(m.couponsTotal - 1);
    });

    it('debe decrementar remainingCoupons en 1', () => {
      const m = makeActiveMembership();
      const before = m.remainingCoupons;
      m.redeemCoupon();
      expect(m.remainingCoupons).toBe(before - 1);
    });

    it('debe lanzar error si no quedan cupones', () => {
      const m = makeActiveMembership({ couponsTotal: 2, couponsUsed: 2 });
      expect(() => m.redeemCoupon()).toThrow(AppError);
      expect(() => m.redeemCoupon()).toThrow(/No quedan cupones/);
    });

    it('debe lanzar error si la membresía está vencida (endDate pasado)', () => {
      const past = new Date('2020-01-01');
      const m = makeActiveMembership({ endDate: past });
      expect(() => m.redeemCoupon()).toThrow(AppError);
      expect(() => m.redeemCoupon()).toThrow(/no está activa o está vencida/);
    });

    it('debe lanzar error si la membresía no está activa (cancelled)', () => {
      const m = makeActiveMembership({ status: 'cancelled' });
      expect(() => m.redeemCoupon()).toThrow(AppError);
    });

    it('debe lanzar error si la membresía no está activa (expired)', () => {
      const m = makeActiveMembership({ status: 'expired' });
      expect(() => m.redeemCoupon()).toThrow(AppError);
    });
  });

  describe('restoreCoupon', () => {
    it('debe decrementar couponsUsed en 1', () => {
      const m = makeActiveMembership({ couponsUsed: 2 });
      m.restoreCoupon();
      expect(m.couponsUsed).toBe(1);
      expect(m.remainingCoupons).toBe(m.couponsTotal - 1);
    });

    it('debe incrementar remainingCoupons en 1', () => {
      const m = makeActiveMembership({ couponsUsed: 2 });
      const before = m.remainingCoupons;
      m.restoreCoupon();
      expect(m.remainingCoupons).toBe(before + 1);
    });

    it('no debe bajar de 0 couponsUsed', () => {
      const m = makeActiveMembership({ couponsUsed: 0 });
      m.restoreCoupon();
      expect(m.couponsUsed).toBe(0);
    });

    it('no debe subir remainingCoupons por encima de couponsTotal', () => {
      const m = makeActiveMembership({ couponsUsed: 0 });
      m.restoreCoupon();
      expect(m.remainingCoupons).toBe(m.couponsTotal);
    });
  });

  describe('isExpired', () => {
    it('debe ser true si status no es active', () => {
      const cancelled = makeActiveMembership({ status: 'cancelled' });
      const expired = makeActiveMembership({ status: 'expired' });
      expect(cancelled.isExpired).toBe(true);
      expect(expired.isExpired).toBe(true);
    });

    it('debe ser true si endDate ya pasó', () => {
      const past = new Date('2020-01-01');
      const m = makeActiveMembership({ endDate: past });
      expect(m.isExpired).toBe(true);
    });

    it('debe ser false si está activa y vigente', () => {
      const m = makeActiveMembership();
      expect(m.isExpired).toBe(false);
    });
  });

  describe('remainingCoupons', () => {
    it('debe calcular couponsTotal - couponsUsed', () => {
      const m = makeActiveMembership({ couponsTotal: 5, couponsUsed: 3 });
      expect(m.remainingCoupons).toBe(2);
    });

    it('no debe ser negativo', () => {
      const m = makeActiveMembership({ couponsTotal: 2, couponsUsed: 5 });
      expect(m.remainingCoupons).toBe(0);
    });
  });

  describe('cancel', () => {
    it('debe establecer autoRenew en false y mantener status activo', () => {
      const m = makeActiveMembership();
      m.cancel();
      expect(m.autoRenew).toBe(false);
      expect(m.status).toBe('active');
    });

    it('debe lanzar error si ya no está activa', () => {
      const m = makeActiveMembership({ status: 'expired' });
      expect(() => m.cancel()).toThrow(AppError);
      expect(() => m.cancel()).toThrow(/no está activa/);
    });

    it('debe lanzar error si autoRenew ya es false (doble cancelación)', () => {
      const m = makeActiveMembership();
      m.cancel();
      expect(() => m.cancel()).toThrow(AppError);
      expect(() => m.cancel()).toThrow(/ya está desactivada/);
    });
  });

  describe('reactivate', () => {
    it('debe establecer autoRenew en true', () => {
      const m = makeActiveMembership();
      m.cancel();
      expect(m.autoRenew).toBe(false);
      m.reactivate();
      expect(m.autoRenew).toBe(true);
    });

    it('debe lanzar error si autoRenew ya es true', () => {
      const m = makeActiveMembership();
      expect(() => m.reactivate()).toThrow(AppError);
      expect(() => m.reactivate()).toThrow(/ya está activa/);
    });

    it('debe lanzar error si la membresía no está activa', () => {
      const m = makeActiveMembership({ status: 'expired' });
      expect(() => m.reactivate()).toThrow(AppError);
      expect(() => m.reactivate()).toThrow(/no está activa/);
    });
  });

  describe('expire', () => {
    it('debe cambiar status a expired', () => {
      const m = makeActiveMembership();
      m.expire();
      expect(m.status).toBe('expired');
    });
  });

  describe('create (pending)', () => {
    it('debe crear membresía con status pending', () => {
      const m = Membership.create({ userId: 'u1', createdBy: 'client', status: 'pending' });
      expect(m.status).toBe('pending');
      expect(m.isPending).toBe(true);
      expect(m.isExpired).toBe(false);
      expect(m.autoRenew).toBe(false);
    });
  });

  describe('approve', () => {
    it('debe activar membresía pendiente y registrar quién aprobó', () => {
      const m = Membership.create({ userId: 'u1', createdBy: 'client', status: 'pending' });
      m.approve('admin-1');
      expect(m.status).toBe('active');
      expect(m.approvedBy).toBe('admin-1');
      expect(m.approvedAt).toBeDefined();
      expect(m.endDate.getTime()).toBeGreaterThan(m.startDate.getTime());
    });

    it('debe lanzar error si la membresía no está pendiente', () => {
      const m = Membership.create({ userId: 'u1', createdBy: 'client' });
      expect(() => m.approve('admin-1')).toThrow(AppError);
    });
  });

  describe('redeemCoupon (pending)', () => {
    it('debe lanzar error si la membresía está pendiente', () => {
      const m = Membership.create({ userId: 'u1', createdBy: 'client', status: 'pending' });
      expect(() => m.redeemCoupon()).toThrow(AppError);
      expect(() => m.redeemCoupon()).toThrow(/pendiente/);
    });
  });

  describe('toPrimitives', () => {
    it('debe devolver un objeto con todas las propiedades', () => {
      const m = Membership.create({ userId: 'u1', createdBy: 'client' });
      const primitives = m.toPrimitives();
      expect(primitives).toHaveProperty('id');
      expect(primitives).toHaveProperty('userId', 'u1');
      expect(primitives).toHaveProperty('status', 'active');
      expect(primitives).toHaveProperty('couponsTotal');
      expect(primitives).toHaveProperty('couponsUsed', 0);
    });
  });
});
