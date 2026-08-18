import { AppError } from '../../../domain/errors/AppError';
import { MembershipProps } from '../../../domain/entities/Membership';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoMembershipTransactionRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipTransactionRepository';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { RevenueTracker } from '../../services/RevenueTracker';

export interface ApprovePendingMembershipDTO {
  membershipId: string;
  staffId: string;
}

export class ApprovePendingMembershipUseCase {
  constructor(
    private readonly membershipRepo: MongoMembershipRepository,
    private readonly transactionRepo: MongoMembershipTransactionRepository,
    private readonly paymentRepo: MongoPaymentRepository,
    private readonly revenueTracker?: RevenueTracker,
  ) {}

  async execute(dto: ApprovePendingMembershipDTO): Promise<MembershipProps> {
    const membership = await this.membershipRepo.findById(dto.membershipId);
    if (!membership) {
      throw new AppError('Membresía no encontrada.', 404);
    }

    if (!membership.isPending) {
      throw new AppError('La membresía no está pendiente de pago.', 400);
    }

    const payment = await this.paymentRepo.findByReference(membership.id, 'membership');
    if (!payment || payment.status !== 'approved') {
      throw new AppError('La membresía no tiene un pago aprobado asociado.', 400);
    }

    membership.approve(dto.staffId);
    const updated = await this.membershipRepo.approvePending(dto.membershipId, dto.staffId);
    const result = updated ?? membership;

    await this.transactionRepo.create({
      userId: result.userId,
      membershipId: result.id,
      amount: result.price,
      paymentMethod: result.paymentMethod === 'mercadopago' ? 'mercadopago' : 'local',
      paymentId: payment.id,
      createdBy: 'admin',
      adminId: dto.staffId,
    });

    // Con paymentId se registra la trazabilidad del pago aprobado que habilita la
    // aprobación. El fallback por membershipId en RevenueTracker.trackMembership
    // sigue siendo la protección real contra duplicados concurrentes — no reemplazar.
    await this.revenueTracker?.trackMembership(result.id, result.price, new Date(), {
      userId: result.userId,
      staffId: dto.staffId,
      paymentId: payment.id,
    }, payment.id);

    return result.toPrimitives();
  }
}
