import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { IPaymentService } from '../../ports/IPaymentService';

export class ReconcileMembershipsUseCase {
  constructor(
    private readonly membershipRepo: MongoMembershipRepository,
    private readonly mercadoPagoService: IPaymentService,
  ) {}

  async execute(): Promise<{ cancelled: number; alerts: number }> {
    let cancelled = 0;
    let alerts = 0;

    const localCancelled = await this.membershipRepo.findAllWithPreapprovalId();

    for (const membership of localCancelled) {
      if (!membership.mpPreapprovalId) continue;

      try {
        const mpPreapproval = await this.mercadoPagoService.getPreapproval(membership.mpPreapprovalId);

        if (mpPreapproval.status === 'authorized') {
          await this.mercadoPagoService.cancelPreapproval(membership.mpPreapprovalId);
          cancelled++;
          console.log(`[RECONCILE] Preapproval ${membership.mpPreapprovalId} cancelada en MP (estaba activa pero membresía ${membership.id} localmente cancelled)`);
        }
      } catch (error) {
        console.error(`[RECONCILE] Error verificando preapproval ${membership.mpPreapprovalId}:`, error);
        alerts++;
      }
    }

    return { cancelled, alerts };
  }
}
