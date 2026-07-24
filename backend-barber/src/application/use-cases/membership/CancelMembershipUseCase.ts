import { AppError } from '../../../domain/errors/AppError';
import { MembershipProps } from '../../../domain/entities/Membership';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { IPaymentService } from '../../ports/IPaymentService';

export interface CancelMembershipDTO {
  membershipId: string;
  actorId: string;
  actorKind: string;
}

export class CancelMembershipUseCase {
  constructor(
    private readonly membershipRepo: MongoMembershipRepository,
    private readonly mercadoPagoService?: IPaymentService,
  ) {}

  async execute(dto: CancelMembershipDTO): Promise<MembershipProps> {
    const membership = await this.membershipRepo.findById(dto.membershipId);
    if (!membership) {
      throw new AppError('Membresía no encontrada.', 404);
    }

    if (membership.status !== 'active') {
      throw new AppError(`No se puede cancelar una membresía en estado ${membership.status}.`, 400);
    }

    const isOwner = membership.userId === dto.actorId;
    const isAdmin = dto.actorKind === 'Admin';
    if (!isOwner && !isAdmin) {
      throw new AppError('No tenés permiso para cancelar esta membresía.', 403);
    }

    if (membership.mpPreapprovalId && this.mercadoPagoService) {
      try {
        await this.mercadoPagoService.cancelPreapproval(membership.mpPreapprovalId);
      } catch {
        throw new AppError(
          'No se pudo cancelar la suscripción en MercadoPago. Reintentá en unos minutos.',
          502
        );
      }
    }

    membership.cancel();
    await this.membershipRepo.save(membership);

    return membership.toPrimitives();
  }
}
