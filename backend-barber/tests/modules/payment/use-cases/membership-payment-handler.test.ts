import { MembershipPaymentHandler } from '../../../../src/application/use-cases/payment/handlers/MembershipPaymentHandler';
import { RevenueTracker } from '../../../../src/application/services/RevenueTracker';
import { MongoRevenueEntryRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoRevenueEntryRepository';
import { RevenueEntryModel } from '../../../../src/infrastructure/repositories/mongodb/models/revenue-entry.model';
import { Membership } from '../../../../src/domain/entities/Membership';
import { Payment } from '../../../../src/domain/entities/Payment';
import {
  makeMockMembershipRepository,
  makeMockMembershipTransactionRepository,
} from '../../../test-utils/mocks';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

const MEMBERSHIP_ID = 'membership-1';
const USER_ID = 'user-1';

const makeMembership = (overrides: Partial<Parameters<typeof Membership.restore>[0]> = {}) =>
  Membership.restore({
    id: MEMBERSHIP_ID,
    userId: USER_ID,
    status: 'pending',
    price: 500,
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
    ...overrides,
  });

const makePayment = (id: string) =>
  Payment.restore({
    id,
    type: 'membership',
    referenceId: MEMBERSHIP_ID,
    status: 'approved',
    mpPaymentId: `mp-${id}`,
    mpPreferenceId: 'pref-1',
    amount: 500,
    currency: 'UYU',
    userId: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describeIfMongo('MembershipPaymentHandler + RevenueTracker (regresión C1)', () => {
  let membershipRepository: ReturnType<typeof makeMockMembershipRepository>;
  let transactionRepository: ReturnType<typeof makeMockMembershipTransactionRepository>;
  let revenueTracker: RevenueTracker;
  let handler: MembershipPaymentHandler;

  beforeEach(() => {
    membershipRepository = makeMockMembershipRepository();
    transactionRepository = makeMockMembershipTransactionRepository();
    membershipRepository.save.mockImplementation(async (m: any) => m);
    transactionRepository.create.mockResolvedValue(undefined);

    revenueTracker = new RevenueTracker(new MongoRevenueEntryRepository());
    handler = new MembershipPaymentHandler(membershipRepository as any, transactionRepository as any, revenueTracker);
  });

  afterEach(async () => {
    await RevenueEntryModel.deleteMany({});
  });

  it('pago inicial (pending → active) + renovación (expired → active) generan 2 revenue_entries distintos', async () => {
    const pending = makeMembership({ status: 'pending' });
    membershipRepository.findPendingByUser.mockResolvedValueOnce(pending);

    const paymentA = makePayment('payment-A');
    await handler.handleApproved(paymentA);

    let count = await RevenueEntryModel.countDocuments({ referenceId: MEMBERSHIP_ID });
    expect(count).toBe(1);

    membershipRepository.findPendingByUser.mockResolvedValueOnce(null);
    const expired = makeMembership({ status: 'expired' });
    membershipRepository.findAnyByUser.mockResolvedValueOnce(expired);

    const paymentB = makePayment('payment-B');
    await handler.handleApproved(paymentB);

    count = await RevenueEntryModel.countDocuments({ referenceId: MEMBERSHIP_ID });
    expect(count).toBe(2);
  });
});
