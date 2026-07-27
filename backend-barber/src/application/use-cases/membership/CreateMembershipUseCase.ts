import { AppError } from '../../../domain/errors/AppError';
import { Membership } from '../../../domain/entities/Membership';
import { Payment } from '../../../domain/entities/Payment';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoMembershipTransactionRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipTransactionRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { getConfig } from '../../../infrastructure/config/env';
import { RevenueTracker } from '../../services/RevenueTracker';
import type { PaymentMethod, BillingCycle } from '../../../domain/types/membership';

export interface CreateMembershipDTO {
  userId: string;
  couponsTotal?: number;
  productDiscount?: number;
  paymentMethod?: PaymentMethod;
  price?: number;
  durationDays?: number;
  billingCycle?: BillingCycle;
  staffId: string;
}

export class CreateMembershipUseCase {
  constructor(
    private readonly membershipRepo: MongoMembershipRepository,
    private readonly userRepo: MongoUserRepository,
    private readonly transactionRepo: MongoMembershipTransactionRepository,
    private readonly paymentRepo: MongoPaymentRepository,
    private readonly revenueTracker?: RevenueTracker
  ) {}

  async execute(dto: CreateMembershipDTO): Promise<Membership> {
    const user = await this.userRepo.findById(dto.userId);
    if (!user) {
      throw new AppError('Usuario no encontrado.', 404);
    }

    const payment: PaymentMethod = dto.paymentMethod || 'local';
    const finalPrice = dto.price ?? getConfig().membershipPriceUyu;

    const existingActive = await this.membershipRepo.findActiveByUser(dto.userId);
    if (existingActive) {
      throw new AppError('El usuario ya tiene una membresía activa.', 400);
    }

    const existingPending = await this.membershipRepo.findPendingByUser(dto.userId);
    if (existingPending) {
      throw new AppError('El usuario ya tiene una membresía pendiente de pago.', 400);
    }

    const existing = await this.membershipRepo.findAnyByUser(dto.userId);
    let membership: Membership;

    if (existing && existing.status === 'expired') {
      existing.reactivate(finalPrice, payment, dto.durationDays);
      membership = existing;
    } else if (existing && existing.status === 'pending') {
      existing.approve(dto.staffId);
      membership = existing;
    } else {
      membership = Membership.create({
        userId: dto.userId,
        createdBy: 'admin',
        adminId: dto.staffId,
        couponsTotal: dto.couponsTotal ?? undefined,
        productDiscount: dto.productDiscount ?? undefined,
        durationDays: dto.durationDays ?? undefined,
        billingCycle: dto.billingCycle ?? undefined,
        price: finalPrice,
        status: 'active',
        paymentMethod: payment || 'local',
      });
    }

    const saved = await this.membershipRepo.save(membership);

    await this.transactionRepo.create({
      userId: dto.userId,
      membershipId: saved.id,
      amount: finalPrice,
      paymentMethod: payment || 'local',
      createdBy: 'admin',
      adminId: dto.staffId,
    });

    let paymentId: string | undefined;
    if (finalPrice > 0) {
      try {
        const paymentDoc = Payment.create({
          type: 'membership',
          referenceId: saved.id,
          amount: finalPrice,
          userId: dto.userId,
        });
        paymentDoc.approve('admin_manual');
        const savedPayment = await this.paymentRepo.save(paymentDoc);
        paymentId = savedPayment.id;
      } catch (err) {
        console.error('[CreateMembershipUseCase] Error creating PaymentModel for manual membership:', err);
      }
    }

    await this.revenueTracker?.trackMembership(saved.id, finalPrice, new Date(), {
      userId: dto.userId,
      staffId: dto.staffId,
    }, paymentId);

    return saved;
  }
}
