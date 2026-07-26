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

    const existing = await this.membershipRepo.findAnyByUser(userId);

    if (existing && (existing.status === 'expired' || existing.status === 'pending')) {
      return existing;
    }

    const membership = Membership.create({
      userId,
      createdBy: 'client',
      status: 'pending',
      price: getConfig().membershipPriceUyu,
      paymentMethod: 'mercadopago',
      billingCycle,
    });
    await this.membershipRepo.save(membership);

    return membership;
  }
}
