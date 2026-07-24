import { AppError } from '../../../domain/errors/AppError';
import { Membership } from '../../../domain/entities/Membership';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { CreatePaymentUseCase } from '../payment/CreatePaymentUseCase';
import { getConfig } from '../../../infrastructure/config/env';

export interface InitiateMembershipPaymentDTO {
  userId: string;
  actorId: string;
  actorKind: string;
  payerEmail: string;
}

export interface InitiateMembershipPaymentResult {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
  paymentId: string;
  membershipId: string;
}

export class InitiateMembershipPaymentUseCase {
  constructor(
    private readonly membershipRepo: MongoMembershipRepository,
    private readonly userRepo: MongoUserRepository,
    private readonly createPaymentUseCase: CreatePaymentUseCase,
  ) {}

  async execute(dto: InitiateMembershipPaymentDTO): Promise<InitiateMembershipPaymentResult> {
    if (dto.actorId !== dto.userId && dto.actorKind !== 'Admin') {
      throw new AppError('No podés iniciar pago para otro usuario.', 403);
    }

    const user = await this.userRepo.findById(dto.userId);
    if (!user) {
      throw new AppError('Usuario no encontrado.', 404);
    }

    const existingActive = await this.membershipRepo.findActiveByUser(dto.userId);
    if (existingActive) {
      throw new AppError('Ya tenés una membresía activa.', 400);
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
        billingCycle: 'onetime',
      });
      await this.membershipRepo.save(membership);
    }

    const config = getConfig();
    const membershipPrice = config.membershipPriceUyu;

    const result = await this.createPaymentUseCase.execute({
      type: 'membership',
      referenceId: membership.id,
      amount: membershipPrice,
      userId: dto.userId,
      items: [{ title: 'Membresía Mensual', quantity: 1, unitPrice: membershipPrice }],
      payerEmail: dto.payerEmail,
    });

    return {
      preferenceId: result.preferenceId,
      initPoint: result.initPoint,
      sandboxInitPoint: result.sandboxInitPoint,
      paymentId: result.paymentId,
      membershipId: membership.id,
    };
  }
}
