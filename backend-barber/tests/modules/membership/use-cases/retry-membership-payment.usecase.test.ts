jest.mock('../../../../src/infrastructure/config/env', () => ({
  getConfig: jest.fn().mockReturnValue({ membershipPriceUyu: 399 }),
}));

import { RetryMembershipPaymentUseCase } from '../../../../src/application/use-cases/membership/RetryMembershipPaymentUseCase';
import { Membership } from '../../../../src/domain/entities/Membership';
import { Payment } from '../../../../src/domain/entities/Payment';
import { makeMockUserRepository, makeMockMembershipRepository, makeMockPaymentRepository } from '../../../test-utils/mocks';

const makeMembership = (overrides: Partial<{ paymentMethod: 'mercadopago' | 'local' | null }> = {}) =>
  Membership.restore({
    id: 'mem-1',
    userId: 'user-1',
    status: 'pending',
    price: 399,
    startDate: new Date(),
    endDate: new Date(),
    couponsTotal: 4,
    couponsUsed: 0,
    productDiscount: 10,
    durationDays: 30,
    billingCycle: 'onetime',
    createdBy: 'client',
    paymentMethod: overrides.paymentMethod ?? 'mercadopago',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const makePayment = (overrides: Partial<{ status: 'pending' | 'approved' }> = {}) =>
  Payment.restore({
    id: 'pay-old',
    type: 'membership',
    referenceId: 'mem-1',
    status: overrides.status ?? 'pending',
    mpPaymentId: undefined,
    mpPreferenceId: 'pref-old',
    amount: 399,
    currency: 'UYU',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('RetryMembershipPaymentUseCase', () => {
  let membershipRepo: ReturnType<typeof makeMockMembershipRepository>;
  let userRepo: ReturnType<typeof makeMockUserRepository>;
  let createPaymentUseCase: { execute: jest.Mock };
  let paymentRepository: ReturnType<typeof makeMockPaymentRepository>;
  let useCase: RetryMembershipPaymentUseCase;

  beforeEach(() => {
    membershipRepo = makeMockMembershipRepository();
    userRepo = makeMockUserRepository();
    createPaymentUseCase = { execute: jest.fn() };
    paymentRepository = makeMockPaymentRepository();
    useCase = new RetryMembershipPaymentUseCase(membershipRepo as any, userRepo as any, createPaymentUseCase as any, paymentRepository as any);

    userRepo.findById.mockResolvedValue({ id: 'user-1', email: 'user@test.com' });
    membershipRepo.findPendingByUser.mockResolvedValue(makeMembership());
    paymentRepository.findByReference.mockResolvedValue(null);
    createPaymentUseCase.execute.mockResolvedValue({
      preferenceId: 'pref-new', initPoint: 'https://mp/init', sandboxInitPoint: 'https://mp/sandbox', paymentId: 'pay-new',
    });
  });

  it('debe rechazar si el actor intenta reintentar el pago de otro usuario sin ser Admin', async () => {
    await expect(
      useCase.execute({ userId: 'user-1', actorId: 'otro-user', actorKind: 'Registrado', payerEmail: 'x@test.com' }),
    ).rejects.toThrow(/otro usuario/);
  });

  it('debe lanzar 404 si el usuario no existe', async () => {
    userRepo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ userId: 'user-1', actorId: 'user-1', actorKind: 'Registrado', payerEmail: 'x@test.com' }),
    ).rejects.toThrow(/Usuario no encontrado/);
  });

  it('debe lanzar 400 si no hay membresía pendiente', async () => {
    membershipRepo.findPendingByUser.mockResolvedValue(null);
    await expect(
      useCase.execute({ userId: 'user-1', actorId: 'user-1', actorKind: 'Registrado', payerEmail: 'x@test.com' }),
    ).rejects.toThrow(/no tenés una membresía pendiente/i);
  });

  it('debe lanzar 400 si la membresía pendiente no es de mercadopago', async () => {
    membershipRepo.findPendingByUser.mockResolvedValue(makeMembership({ paymentMethod: 'local' }));
    await expect(
      useCase.execute({ userId: 'user-1', actorId: 'user-1', actorKind: 'Registrado', payerEmail: 'x@test.com' }),
    ).rejects.toThrow(/no está asociada a un pago por MercadoPago/);
  });

  it('debe cancelar el payment pendiente anterior antes de generar uno nuevo', async () => {
    const oldPayment = makePayment({ status: 'pending' });
    paymentRepository.findByReference.mockResolvedValue(oldPayment);

    await useCase.execute({ userId: 'user-1', actorId: 'user-1', actorKind: 'Registrado', payerEmail: 'user@test.com' });

    expect(paymentRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
  });

  it('no debe tocar un payment anterior que ya no está pending', async () => {
    const oldPayment = makePayment({ status: 'approved' });
    paymentRepository.findByReference.mockResolvedValue(oldPayment);

    await useCase.execute({ userId: 'user-1', actorId: 'user-1', actorKind: 'Registrado', payerEmail: 'user@test.com' });

    expect(paymentRepository.save).not.toHaveBeenCalled();
  });

  it('debe generar una nueva preferencia de pago para la membresía pendiente', async () => {
    const result = await useCase.execute({ userId: 'user-1', actorId: 'user-1', actorKind: 'Registrado', payerEmail: 'user@test.com' });

    expect(createPaymentUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
      type: 'membership', referenceId: 'mem-1', amount: 399, userId: 'user-1',
    }));
    expect(result).toEqual({
      preferenceId: 'pref-new', initPoint: 'https://mp/init', sandboxInitPoint: 'https://mp/sandbox', paymentId: 'pay-new', membershipId: 'mem-1',
    });
  });

  it('funciona sin paymentRepository inyectado (no intenta cancelar nada)', async () => {
    useCase = new RetryMembershipPaymentUseCase(membershipRepo as any, userRepo as any, createPaymentUseCase as any);

    const result = await useCase.execute({ userId: 'user-1', actorId: 'user-1', actorKind: 'Registrado', payerEmail: 'user@test.com' });

    expect(result.membershipId).toBe('mem-1');
  });
});
