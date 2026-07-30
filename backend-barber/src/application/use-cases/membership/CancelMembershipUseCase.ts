import { AppError } from '../../../domain/errors/AppError';
import { MembershipProps } from '../../../domain/entities/Membership';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';

export interface CancelMembershipDTO {
  membershipId: string;
  actorId: string;
  actorKind: string;
}

export class CancelMembershipUseCase {
  constructor(
    private readonly membershipRepo: MongoMembershipRepository,
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

    membership.cancel();
    await this.membershipRepo.save(membership);

    return membership.toPrimitives();
  }
}
