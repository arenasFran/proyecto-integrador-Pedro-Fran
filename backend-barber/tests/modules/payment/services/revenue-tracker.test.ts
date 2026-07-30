import { RevenueTracker } from '../../../../src/application/services/RevenueTracker';
import { makeMockRevenueEntryRepository } from '../../../test-utils/mocks';

describe('RevenueTracker — trackMembership', () => {
  let revenueEntryRepo: ReturnType<typeof makeMockRevenueEntryRepository>;
  let tracker: RevenueTracker;

  beforeEach(() => {
    revenueEntryRepo = makeMockRevenueEntryRepository();
    revenueEntryRepo.findByPaymentId.mockResolvedValue(null);
    revenueEntryRepo.findByReferenceId.mockResolvedValue(null);
    revenueEntryRepo.create.mockImplementation(async (entry: any) => entry);
    tracker = new RevenueTracker(revenueEntryRepo as any);
  });

  it('con paymentId: crea el entry si no existe ya un entry para ese paymentId', async () => {
    await tracker.trackMembership('membership-1', 500, new Date(), { userId: 'user-1' }, 'payment-1');

    expect(revenueEntryRepo.findByPaymentId).toHaveBeenCalledWith('payment-1');
    expect(revenueEntryRepo.findByReferenceId).not.toHaveBeenCalled();
    expect(revenueEntryRepo.create).toHaveBeenCalledTimes(1);
  });

  it('con paymentId: no crea un segundo entry si ya existe uno para ese paymentId', async () => {
    revenueEntryRepo.findByPaymentId.mockResolvedValue({ id: 'existing-entry' });

    await tracker.trackMembership('membership-1', 500, new Date(), { userId: 'user-1' }, 'payment-1');

    expect(revenueEntryRepo.create).not.toHaveBeenCalled();
  });

  it('sin paymentId: cae al fallback por referenceId (comportamiento legacy)', async () => {
    await tracker.trackMembership('membership-1', 500, new Date(), { userId: 'user-1' });

    expect(revenueEntryRepo.findByReferenceId).toHaveBeenCalledWith('membership-1');
    expect(revenueEntryRepo.findByPaymentId).not.toHaveBeenCalled();
    expect(revenueEntryRepo.create).toHaveBeenCalledTimes(1);
  });

  it('sin paymentId: no crea un segundo entry si ya existe uno para ese referenceId', async () => {
    revenueEntryRepo.findByReferenceId.mockResolvedValue({ id: 'existing-entry' });

    await tracker.trackMembership('membership-1', 500, new Date(), { userId: 'user-1' });

    expect(revenueEntryRepo.create).not.toHaveBeenCalled();
  });

  it('regresión C1: mismo membershipId con dos paymentId distintos (pago inicial + renovación) crea 2 entries', async () => {
    await tracker.trackMembership('membership-1', 500, new Date(), { userId: 'user-1' }, 'payment-1');
    await tracker.trackMembership('membership-1', 500, new Date(), { userId: 'user-1' }, 'payment-2');

    expect(revenueEntryRepo.create).toHaveBeenCalledTimes(2);
  });
});
