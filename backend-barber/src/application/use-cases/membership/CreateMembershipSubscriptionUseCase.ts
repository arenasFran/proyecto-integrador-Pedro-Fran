import { AppError } from '../../../domain/errors/AppError';
import { Membership } from '../../../domain/entities/Membership';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { CreateSubscriptionUseCase } from '../payment/CreateSubscriptionUseCase';
import { getConfig } from '../../../infrastructure/config/env';

export interface CreateMembershipSubscriptionDTO {
  userId: string;
  actorId: string;
  actorKind: string;
  email: string;
}

export interface CreateMembershipSubscriptionResult {
  preapprovalId: string;
  initPoint: string;
  membershipId: string;
}

export class CreateMembershipSubscriptionUseCase {
  constructor(
    private readonly membershipRepo: MongoMembershipRepository,
    private readonly userRepo: MongoUserRepository,
    private readonly createSubscriptionUseCase: CreateSubscriptionUseCase,
  ) {}

  async execute(dto: CreateMembershipSubscriptionDTO): Promise<CreateMembershipSubscriptionResult> {
    if (dto.actorId !== dto.userId && dto.actorKind !== 'Admin') {
      throw new AppError('No podés crear suscripción para otro usuario.', 403);
    }

    const user = await this.userRepo.findById(dto.userId);
    if (!user) {
      throw new AppError('Usuario no encontrado.', 404);
    }

    const existingActive = await this.membershipRepo.findActiveByUser(dto.userId);
    if (existingActive) {
      throw new AppError('El usuario ya tiene una membresía activa.', 400);
    }

    const existing = await this.membershipRepo.findAnyByUser(dto.userId);
    let membership: Membership;

    if (existing && (existing.status === 'expired' || existing.status === 'pending')) {
      membership = existing;
    } else {
      membership = Membership.create({
        userId: dto.userId,
        createdBy: 'client',
        status: 'pending',
        price: getConfig().membershipPriceUyu,
        paymentMethod: 'mercadopago',
        billingCycle: 'monthly',
      });
      await this.membershipRepo.save(membership);
    }

    const result = await this.createSubscriptionUseCase.execute({
      userId: dto.userId,
      payerEmail: dto.email,
    });

    return {
      preapprovalId: result.preapprovalId,
      initPoint: result.initPoint,
      membershipId: membership.id,
    };
  }
}
