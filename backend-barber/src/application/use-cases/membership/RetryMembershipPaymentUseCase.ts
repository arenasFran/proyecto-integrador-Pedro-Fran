import { AppError } from '../../../domain/errors/AppError';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { CreatePaymentUseCase } from '../payment/CreatePaymentUseCase';
import { getConfig } from '../../../infrastructure/config/env';

export interface RetryMembershipPaymentDTO {
  userId: string;
  actorId: string;
  actorKind: string;
  payerEmail: string;
}

export interface RetryMembershipPaymentResult {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
  paymentId: string;
  membershipId: string;
}

export class RetryMembershipPaymentUseCase {
  constructor(
    private readonly membershipRepo: MongoMembershipRepository,
    private readonly userRepo: MongoUserRepository,
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly paymentRepository?: MongoPaymentRepository,
  ) {}

  async execute(dto: RetryMembershipPaymentDTO): Promise<RetryMembershipPaymentResult> {
    if (dto.actorId !== dto.userId && dto.actorKind !== 'Admin') {
      throw new AppError('No podés reintentar el pago para otro usuario.', 403);
    }

    const user = await this.userRepo.findById(dto.userId);
    if (!user) {
      throw new AppError('Usuario no encontrado.', 404);
    }

    const pending = await this.membershipRepo.findPendingByUser(dto.userId);
    if (!pending) {
      throw new AppError('No tenés una membresía pendiente de pago.', 400);
    }

    if (pending.paymentMethod !== 'mercadopago') {
      throw new AppError('Esta membresía no está asociada a un pago por MercadoPago.', 400);
    }

    if (this.paymentRepository) {
      const existingPayment = await this.paymentRepository.findByReference(pending.id, 'membership');
      if (existingPayment && existingPayment.status === 'pending') {
        existingPayment.cancel();
        await this.paymentRepository.save(existingPayment);
      }
    }

    const config = getConfig();
    const membershipPrice = config.membershipPriceUyu;

    const result = await this.createPaymentUseCase.execute({
      type: 'membership',
      referenceId: pending.id,
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
      membershipId: pending.id,
    };
  }
}
