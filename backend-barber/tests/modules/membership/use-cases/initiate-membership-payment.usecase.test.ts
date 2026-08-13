jest.mock('../../../../src/infrastructure/config/env', () => ({
  getConfig: jest.fn().mockReturnValue({ membershipPriceUyu: 399 }),
}));

import { InitiateMembershipPaymentUseCase } from '../../../../src/application/use-cases/membership/InitiateMembershipPaymentUseCase';
import { Membership } from '../../../../src/domain/entities/Membership';
import { makeMockUserRepository } from '../../../test-utils/mocks';

const makeMembership = () =>
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
    paymentMethod: 'mercadopago',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('InitiateMembershipPaymentUseCase', () => {
  let membershipResolver: { findOrCreatePending: jest.Mock };
  let userRepo: ReturnType<typeof makeMockUserRepository>;
  let createPaymentUseCase: { execute: jest.Mock };
  let useCase: InitiateMembershipPaymentUseCase;

  beforeEach(() => {
    membershipResolver = { findOrCreatePending: jest.fn() };
    userRepo = makeMockUserRepository();
    createPaymentUseCase = { execute: jest.fn() };
    useCase = new InitiateMembershipPaymentUseCase(membershipResolver as any, userRepo as any, createPaymentUseCase as any);

    userRepo.findById.mockResolvedValue({ id: 'user-1', email: 'user@test.com' });
    membershipResolver.findOrCreatePending.mockResolvedValue(makeMembership());
    createPaymentUseCase.execute.mockResolvedValue({
      preferenceId: 'pref-1', initPoint: 'https://mp/init', sandboxInitPoint: 'https://mp/sandbox', paymentId: 'pay-1',
    });
  });

  it('debe rechazar si el actor intenta iniciar el pago de otro usuario sin ser Admin', async () => {
    await expect(
      useCase.execute({ userId: 'user-1', actorId: 'otro-user', actorKind: 'Registrado', payerEmail: 'x@test.com' }),
    ).rejects.toThrow(/otro usuario/);
  });

  it('un Admin puede iniciar el pago para otro usuario', async () => {
    const result = await useCase.execute({ userId: 'user-1', actorId: 'admin-1', actorKind: 'Admin', payerEmail: 'x@test.com' });
    expect(result.membershipId).toBe('mem-1');
  });

  it('debe lanzar 404 si el usuario no existe', async () => {
    userRepo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ userId: 'user-1', actorId: 'user-1', actorKind: 'Registrado', payerEmail: 'x@test.com' }),
    ).rejects.toThrow(/Usuario no encontrado/);
  });

  it('debe crear/resolver la membresía pendiente y generar la preferencia de pago', async () => {
    const result = await useCase.execute({ userId: 'user-1', actorId: 'user-1', actorKind: 'Registrado', payerEmail: 'user@test.com' });

    expect(membershipResolver.findOrCreatePending).toHaveBeenCalledWith('user-1', 'onetime');
    expect(createPaymentUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
      type: 'membership', referenceId: 'mem-1', amount: 399, userId: 'user-1', payerEmail: 'user@test.com',
    }));
    expect(result).toEqual({
      preferenceId: 'pref-1', initPoint: 'https://mp/init', sandboxInitPoint: 'https://mp/sandbox', paymentId: 'pay-1', membershipId: 'mem-1',
    });
  });

  it('debe propagar el error si no se puede resolver la membresía (ej. ya tiene una activa)', async () => {
    membershipResolver.findOrCreatePending.mockRejectedValue(new Error('Ya tenés una membresía activa.'));
    await expect(
      useCase.execute({ userId: 'user-1', actorId: 'user-1', actorKind: 'Registrado', payerEmail: 'x@test.com' }),
    ).rejects.toThrow('Ya tenés una membresía activa.');
  });
});
