import { AppError } from '../../../domain/errors/AppError';
import { MembershipProps } from '../../../domain/entities/Membership';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoMembershipTransactionRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipTransactionRepository';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { RevenueTracker } from '../../services/RevenueTracker';
import { Payment } from '../../../domain/entities/Payment';

export interface ApprovePendingMembershipDTO {
  membershipId: string;
  staffId: string;
}

export class ApprovePendingMembershipUseCase {
  constructor(
    private readonly membershipRepo: MongoMembershipRepository,
    private readonly transactionRepo: MongoMembershipTransactionRepository,
    private readonly paymentRepo: MongoPaymentRepository,
    private readonly revenueTracker?: RevenueTracker,
  ) {}

  async execute(dto: ApprovePendingMembershipDTO): Promise<MembershipProps> {
    const membership = await this.membershipRepo.findById(dto.membershipId);
    if (!membership) {
      throw new AppError('Membresía no encontrada.', 404);
    }

    if (!membership.isPending) {
      throw new AppError('La membresía no está pendiente de pago.', 400);
    }

    const existingPayment = await this.paymentRepo.findByReference(membership.id, 'membership');
    const paymentMethod = 'local' as const;
    let paymentId: string | undefined;
    if (existingPayment?.status === 'approved') {
      paymentId = existingPayment.id;
    } else {
      const payment = existingPayment?.status === 'pending'
        ? existingPayment
        : Payment.create({ type: 'membership', referenceId: membership.id, amount: membership.price, userId: membership.userId });
      payment.approve();
      paymentId = (await this.paymentRepo.save(payment)).id;
    }

    membership.approve(dto.staffId);
    const updated = await this.membershipRepo.approvePending(dto.membershipId, dto.staffId);
    const result = updated ?? membership;
    if (paymentId) {
      result.assignPayment(paymentId);
      await this.membershipRepo.save(result);
    }

    await this.transactionRepo.create({
      userId: result.userId,
      membershipId: result.id,
      amount: result.price,
      paymentMethod,
      paymentId,
      createdBy: 'admin',
      adminId: dto.staffId,
    });

    await this.revenueTracker?.trackMembership(result.id, result.price, new Date(), {
      userId: result.userId,
      staffId: dto.staffId,
      paymentId,
    }, paymentId);

    return result.toPrimitives();
  }
}
