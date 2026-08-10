import { ApprovePendingMembershipUseCase } from '../../../../src/application/use-cases/membership/ApprovePendingMembershipUseCase';
import { Membership } from '../../../../src/domain/entities/Membership';
import { AppError } from '../../../../src/domain/errors/AppError';
import { makeMockMembershipRepository, makeMockMembershipTransactionRepository } from '../../../test-utils/mocks';

const makeMembership = (overrides: Partial<{ status: 'pending' | 'active' | 'expired'; paymentMethod: 'mercadopago' | 'local' | null }> = {}) =>
  Membership.restore({
    id: 'mem-1',
    userId: 'user-1',
    status: overrides.status ?? 'pending',
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

describe('ApprovePendingMembershipUseCase', () => {
  let membershipRepo: ReturnType<typeof makeMockMembershipRepository>;
  let transactionRepo: ReturnType<typeof makeMockMembershipTransactionRepository>;
  let revenueTracker: { trackMembership: jest.Mock };
  let useCase: ApprovePendingMembershipUseCase;

  beforeEach(() => {
    membershipRepo = makeMockMembershipRepository();
    transactionRepo = makeMockMembershipTransactionRepository();
    revenueTracker = { trackMembership: jest.fn().mockResolvedValue(undefined) };
    useCase = new ApprovePendingMembershipUseCase(membershipRepo as any, transactionRepo as any, revenueTracker as any);
  });

  it('debe lanzar 404 si la membresía no existe', async () => {
    membershipRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute({ membershipId: 'mem-1', staffId: 'admin-1' })).rejects.toThrow(/no encontrada/);
  });

  it('debe lanzar 400 si la membresía no está pendiente', async () => {
    membershipRepo.findById.mockResolvedValue(makeMembership({ status: 'active' }));
    await expect(useCase.execute({ membershipId: 'mem-1', staffId: 'admin-1' })).rejects.toThrow(/no está pendiente/);
  });

  it('debe aprobar la membresía, registrar la transacción y trackear el revenue', async () => {
    const membership = makeMembership({ status: 'pending' });
    membershipRepo.findById.mockResolvedValue(membership);
    membershipRepo.approvePending.mockResolvedValue(null);

    const result = await useCase.execute({ membershipId: 'mem-1', staffId: 'admin-1' });

    expect(result.status).toBe('active');
    expect(membershipRepo.approvePending).toHaveBeenCalledWith('mem-1', 'admin-1');
    expect(transactionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1', membershipId: 'mem-1', amount: 399, paymentMethod: 'mercadopago', createdBy: 'admin', adminId: 'admin-1',
    }));
    expect(revenueTracker.trackMembership).toHaveBeenCalledWith('mem-1', 399, expect.any(Date), expect.objectContaining({ userId: 'user-1', staffId: 'admin-1' }));
  });

  it('debe usar el registro actualizado del repositorio cuando está disponible', async () => {
    const membership = makeMembership({ status: 'pending' });
    membershipRepo.findById.mockResolvedValue(membership);
    const updated = makeMembership({ status: 'active' });
    membershipRepo.approvePending.mockResolvedValue(updated);

    const result = await useCase.execute({ membershipId: 'mem-1', staffId: 'admin-1' });

    expect(result).toEqual(updated.toPrimitives());
  });

  it('debe registrar paymentMethod local si la membresía no es de mercadopago', async () => {
    const membership = makeMembership({ status: 'pending', paymentMethod: 'local' });
    membershipRepo.findById.mockResolvedValue(membership);
    membershipRepo.approvePending.mockResolvedValue(null);

    await useCase.execute({ membershipId: 'mem-1', staffId: 'admin-1' });

    expect(transactionRepo.create).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: 'local' }));
  });
});
