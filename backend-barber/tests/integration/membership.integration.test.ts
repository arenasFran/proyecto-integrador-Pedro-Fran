import { MongoMembershipRepository } from '../../src/infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoMembershipTransactionRepository } from '../../src/infrastructure/repositories/mongodb/MongoMembershipTransactionRepository';
import { MongoUserRepository } from '../../src/infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoPaymentRepository } from '../../src/infrastructure/repositories/mongodb/MongoPaymentRepository';
import { MongoOrderRepository } from '../../src/infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoProductRepository } from '../../src/infrastructure/repositories/mongodb/MongoProductRepository';
import { CreateMembershipUseCase } from '../../src/application/use-cases/membership/CreateMembershipUseCase';
import { CreateOrderUseCase } from '../../src/application/use-cases/product/CreateOrderUseCase';
import { seedRegisteredClient, seedProduct } from '../test-utils/factories';

const membershipRepo = new MongoMembershipRepository();
const transactionRepo = new MongoMembershipTransactionRepository();
const userRepo = new MongoUserRepository();
const paymentRepo = new MongoPaymentRepository();
const orderRepo = new MongoOrderRepository();
const productRepo = new MongoProductRepository();

describe('Membresía: persistencia y descuento', () => {
  it('CreateMembershipUseCase guarda la membresía con productDiscount y transacción', async () => {
    const { clientId } = await seedRegisteredClient({ email: 'mem1@test.com' });

    const createMembershipUC = new CreateMembershipUseCase(membershipRepo, userRepo, transactionRepo, paymentRepo);
    const membership = await createMembershipUC.execute({
      userId: clientId,
      couponsTotal: 4,
      productDiscount: 20,
      paymentMethod: 'local',
      price: 0,
      staffId: '000000000000000000000001',
    });

    expect(membership.productDiscount).toBe(20);
    expect(membership.status).toBe('active');
    expect(membership.couponsTotal).toBe(4);

    const active = await membershipRepo.findActiveByUser(clientId);
    expect(active).not.toBeNull();
    expect(active!.productDiscount).toBe(20);
  });

  it('CreateOrderUseCase aplica el descuento de membresía al precio del producto', async () => {
    const { clientId } = await seedRegisteredClient({ email: 'mem2@test.com' });
    const { productId } = await seedProduct({ price: 500 });

    const createMembershipUC = new CreateMembershipUseCase(membershipRepo, userRepo, transactionRepo, paymentRepo);
    await createMembershipUC.execute({
      userId: clientId,
      productDiscount: 20,
      paymentMethod: 'local',
      price: 0,
      staffId: '000000000000000000000002',
    });

    const createOrderUC = new CreateOrderUseCase(orderRepo, productRepo, membershipRepo, paymentRepo);
    const result = await createOrderUC.execute({
      userId: clientId,
      items: [{ productId, quantity: 1 }],
      paymentMethod: 'local',
    });

    const order = await orderRepo.findById(result.orderId);
    expect(order).not.toBeNull();
    expect(order!.items[0].price).toBe(400);
    expect(order!.total).toBe(400);
  });
});
