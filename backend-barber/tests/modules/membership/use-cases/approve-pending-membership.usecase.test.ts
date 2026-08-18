import { ApprovePendingMembershipUseCase } from '../../../../src/application/use-cases/membership/ApprovePendingMembershipUseCase';
import { Membership } from '../../../../src/domain/entities/Membership';
import { Payment } from '../../../../src/domain/entities/Payment';
import { AppError } from '../../../../src/domain/errors/AppError';
import { makeMockMembershipRepository, makeMockMembershipTransactionRepository, makeMockPaymentRepository } from '../../../test-utils/mocks';

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

const makePayment = (overrides: Partial<{ status: 'pending' | 'approved' | 'cancelled' | 'rejected' }> = {}) =>
  Payment.restore({
    id: 'pay-1',
    type: 'membership',
    referenceId: 'mem-1',
    status: overrides.status ?? 'approved',
    mpPaymentId: undefined,
    mpPreferenceId: undefined,
    amount: 399,
    currency: 'UYU',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('ApprovePendingMembershipUseCase', () => {
  let membershipRepo: ReturnType<typeof makeMockMembershipRepository>;
  let transactionRepo: ReturnType<typeof makeMockMembershipTransactionRepository>;
  let paymentRepo: ReturnType<typeof makeMockPaymentRepository>;
  let revenueTracker: { trackMembership: jest.Mock };
  let useCase: ApprovePendingMembershipUseCase;

  beforeEach(() => {
    membershipRepo = makeMockMembershipRepository();
    transactionRepo = makeMockMembershipTransactionRepository();
    paymentRepo = makeMockPaymentRepository();
    revenueTracker = { trackMembership: jest.fn().mockResolvedValue(undefined) };
    useCase = new ApprovePendingMembershipUseCase(membershipRepo as any, transactionRepo as any, paymentRepo as any, revenueTracker as any);
  });

  it('debe lanzar 404 si la membresía no existe', async () => {
    membershipRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute({ membershipId: 'mem-1', staffId: 'admin-1' })).rejects.toThrow(/no encontrada/);
  });

  it('debe lanzar 400 si la membresía no está pendiente', async () => {
    membershipRepo.findById.mockResolvedValue(makeMembership({ status: 'active' }));
    await expect(useCase.execute({ membershipId: 'mem-1', staffId: 'admin-1' })).rejects.toThrow(/no está pendiente/);
  });

  it('debe rechazar si no existe un pago aprobado asociado', async () => {
    const membership = makeMembership({ status: 'pending' });
    membershipRepo.findById.mockResolvedValue(membership);
    paymentRepo.findByReference.mockResolvedValue(null);

    await expect(useCase.execute({ membershipId: 'mem-1', staffId: 'admin-1' })).rejects.toThrow(/no tiene un pago aprobado/);

    expect(paymentRepo.findByReference).toHaveBeenCalledWith('mem-1', 'membership');
    expect(membershipRepo.approvePending).not.toHaveBeenCalled();
    expect(transactionRepo.create).not.toHaveBeenCalled();
    expect(revenueTracker.trackMembership).not.toHaveBeenCalled();
  });

  it('debe rechazar si el pago asociado no está aprobado', async () => {
    const membership = makeMembership({ status: 'pending' });
    membershipRepo.findById.mockResolvedValue(membership);
    paymentRepo.findByReference.mockResolvedValue(makePayment({ status: 'pending' }));

    await expect(useCase.execute({ membershipId: 'mem-1', staffId: 'admin-1' })).rejects.toThrow(/no tiene un pago aprobado/);

    expect(membershipRepo.approvePending).not.toHaveBeenCalled();
    expect(transactionRepo.create).not.toHaveBeenCalled();
  });

  it('debe aprobar la membresía, registrar la transacción y trackear el revenue', async () => {
    const membership = makeMembership({ status: 'pending' });
    membershipRepo.findById.mockResolvedValue(membership);
    paymentRepo.findByReference.mockResolvedValue(makePayment({ status: 'approved' }));
    membershipRepo.approvePending.mockResolvedValue(null);

    const result = await useCase.execute({ membershipId: 'mem-1', staffId: 'admin-1' });

    expect(paymentRepo.findByReference).toHaveBeenCalledWith('mem-1', 'membership');
    expect(result.status).toBe('active');
    expect(membershipRepo.approvePending).toHaveBeenCalledWith('mem-1', 'admin-1');
    expect(transactionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1', membershipId: 'mem-1', amount: 399, paymentMethod: 'mercadopago', paymentId: 'pay-1', createdBy: 'admin', adminId: 'admin-1',
    }));
    expect(revenueTracker.trackMembership).toHaveBeenCalledWith('mem-1', 399, expect.any(Date), expect.objectContaining({ userId: 'user-1', staffId: 'admin-1', paymentId: 'pay-1' }), 'pay-1');
  });

  it('debe usar el registro actualizado del repositorio cuando está disponible', async () => {
    const membership = makeMembership({ status: 'pending' });
    membershipRepo.findById.mockResolvedValue(membership);
    paymentRepo.findByReference.mockResolvedValue(makePayment({ status: 'approved' }));
    const updated = makeMembership({ status: 'active' });
    membershipRepo.approvePending.mockResolvedValue(updated);

    const result = await useCase.execute({ membershipId: 'mem-1', staffId: 'admin-1' });

    expect(result).toEqual(updated.toPrimitives());
  });

  it('debe registrar paymentMethod local si la membresía no es de mercadopago', async () => {
    const membership = makeMembership({ status: 'pending', paymentMethod: 'local' });
    membershipRepo.findById.mockResolvedValue(membership);
    paymentRepo.findByReference.mockResolvedValue(makePayment({ status: 'approved' }));
    membershipRepo.approvePending.mockResolvedValue(null);

    await useCase.execute({ membershipId: 'mem-1', staffId: 'admin-1' });

    expect(transactionRepo.create).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: 'local' }));
  });
});
