import { AppError } from '../../../domain/errors/AppError';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { CreatePaymentUseCase } from '../payment/CreatePaymentUseCase';
import { MembershipResolver } from '../../services/MembershipResolver';
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
    private readonly membershipResolver: MembershipResolver,
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

    const membership = await this.membershipResolver.findOrCreatePending(dto.userId, 'onetime');

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
