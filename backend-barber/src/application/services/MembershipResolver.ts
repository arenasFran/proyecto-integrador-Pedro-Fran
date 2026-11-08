import { AppError } from '../../domain/errors/AppError';
import { Membership } from '../../domain/entities/Membership';
import { BillingCycle } from '../../domain/types/membership';
import { MongoMembershipRepository } from '../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { getConfig } from '../../infrastructure/config/env';

export class MembershipResolver {
  constructor(
    private readonly membershipRepo: MongoMembershipRepository,
  ) {}

  async findOrCreatePending(userId: string, billingCycle: BillingCycle): Promise<Membership> {
    const existingActive = await this.membershipRepo.findActiveByUser(userId);
    if (existingActive) {
      throw new AppError('Ya tenés una membresía activa.', 400);
    }

    const existingPending = await this.membershipRepo.findPendingByUser(userId);
    if (existingPending) return existingPending;

    const membership = Membership.create({
      userId,
      createdBy: 'client',
      status: 'pending',
      price: getConfig().membershipPriceUyu,
      paymentMethod: 'local',
      billingCycle,
    });
    const saved = await this.membershipRepo.save(membership);

    return saved;
  }
}
