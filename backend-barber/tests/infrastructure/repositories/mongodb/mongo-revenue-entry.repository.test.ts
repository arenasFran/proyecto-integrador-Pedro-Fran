import { MongoRevenueEntryRepository } from '../../../../src/infrastructure/repositories/mongodb/MongoRevenueEntryRepository';
import { RevenueEntryModel } from '../../../../src/infrastructure/repositories/mongodb/models/revenue-entry.model';
import { RevenueEntry } from '../../../../src/domain/entities/RevenueEntry';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('MongoRevenueEntryRepository — índices de referenceId/paymentId', () => {
  let repository: MongoRevenueEntryRepository;

  beforeEach(() => {
    repository = new MongoRevenueEntryRepository();
  });

  afterEach(async () => {
    await RevenueEntryModel.deleteMany({});
  });

  it('permite dos entries con el mismo referenceId (membresía con renovaciones) si tienen paymentId distinto', async () => {
    await repository.create(RevenueEntry.create({
      source: 'membership',
      amount: 500,
      referenceId: 'membership-1',
      paymentId: 'payment-1',
    }));

    await repository.create(RevenueEntry.create({
      source: 'membership',
      amount: 500,
      referenceId: 'membership-1',
      paymentId: 'payment-2',
    }));

    const count = await RevenueEntryModel.countDocuments({ referenceId: 'membership-1' });
    expect(count).toBe(2);
  });

  it('rechaza dos entries con el mismo paymentId (índice único real)', async () => {
    await repository.create(RevenueEntry.create({
      source: 'membership',
      amount: 500,
      referenceId: 'membership-1',
      paymentId: 'payment-dup',
    }));

    await expect(repository.create(RevenueEntry.create({
      source: 'membership',
      amount: 500,
      referenceId: 'membership-2',
      paymentId: 'payment-dup',
    }))).rejects.toThrow();
  });

  it('permite múltiples entries sin paymentId (índice sparse no colisiona por ausencia del campo)', async () => {
    await repository.create(RevenueEntry.create({
      source: 'membership',
      amount: 500,
      referenceId: 'membership-3',
    }));

    await repository.create(RevenueEntry.create({
      source: 'membership',
      amount: 500,
      referenceId: 'membership-4',
    }));

    const count = await RevenueEntryModel.countDocuments({ paymentId: { $exists: false } });
    expect(count).toBe(2);
  });

  it('findByPaymentId encuentra el entry correcto', async () => {
    await repository.create(RevenueEntry.create({
      source: 'appointment',
      amount: 300,
      referenceId: 'appointment-1',
      paymentId: 'payment-find-me',
    }));

    const found = await repository.findByPaymentId('payment-find-me');
    expect(found).not.toBeNull();
    expect(found!.referenceId).toBe('appointment-1');
  });
});
