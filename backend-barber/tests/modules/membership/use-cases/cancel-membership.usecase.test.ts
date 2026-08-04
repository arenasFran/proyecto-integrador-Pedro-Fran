import { CancelMembershipUseCase } from '../../../../src/application/use-cases/membership/CancelMembershipUseCase';
import { Membership } from '../../../../src/domain/entities/Membership';
import { makeMockMembershipRepository } from '../../../test-utils/mocks';

const makeMembership = (overrides: Partial<{ status: 'pending' | 'active' | 'expired' | 'cancelled'; userId: string }> = {}) =>
  Membership.restore({
    id: 'mem-1',
    userId: overrides.userId ?? 'user-1',
    status: overrides.status ?? 'active',
    price: 399,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

describe('CancelMembershipUseCase', () => {
  let membershipRepo: ReturnType<typeof makeMockMembershipRepository>;
  let useCase: CancelMembershipUseCase;

  beforeEach(() => {
    membershipRepo = makeMockMembershipRepository();
    useCase = new CancelMembershipUseCase(membershipRepo as any);
  });

  it('debe lanzar 404 si la membresía no existe', async () => {
    membershipRepo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ membershipId: 'mem-1', actorId: 'user-1', actorKind: 'Registrado' }),
    ).rejects.toThrow(/no encontrada/);
  });

  it('debe lanzar 400 si la membresía no está activa', async () => {
    membershipRepo.findById.mockResolvedValue(makeMembership({ status: 'expired' }));
    await expect(
      useCase.execute({ membershipId: 'mem-1', actorId: 'user-1', actorKind: 'Registrado' }),
    ).rejects.toThrow(/No se puede cancelar/);
  });

  it('debe lanzar 403 si el actor no es el dueño ni admin', async () => {
    membershipRepo.findById.mockResolvedValue(makeMembership({ userId: 'user-1' }));
    await expect(
      useCase.execute({ membershipId: 'mem-1', actorId: 'otro-user', actorKind: 'Registrado' }),
    ).rejects.toThrow(/permiso/);
  });

  it('el dueño puede cancelar su propia membresía', async () => {
    const membership = makeMembership({ userId: 'user-1' });
    membershipRepo.findById.mockResolvedValue(membership);

    const result = await useCase.execute({ membershipId: 'mem-1', actorId: 'user-1', actorKind: 'Registrado' });

    expect(result.status).toBe('cancelled');
    expect(membershipRepo.save).toHaveBeenCalledWith(membership);
  });

  it('un admin puede cancelar la membresía de otro usuario', async () => {
    const membership = makeMembership({ userId: 'user-1' });
    membershipRepo.findById.mockResolvedValue(membership);

    const result = await useCase.execute({ membershipId: 'mem-1', actorId: 'admin-1', actorKind: 'Admin' });

    expect(result.status).toBe('cancelled');
  });
});
