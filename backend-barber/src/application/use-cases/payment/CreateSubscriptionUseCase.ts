import { IPaymentService } from '../../ports/IPaymentService';
import { getConfig } from '../../../infrastructure/config/env';

export type CreateSubscriptionDTO = {
  userId: string;
  payerEmail: string;
};

export type CreateSubscriptionResult = {
  preapprovalId: string;
  initPoint: string;
};

export class CreateSubscriptionUseCase {
  constructor(
    private readonly mercadoPagoService: IPaymentService
  ) {}

  async execute(dto: CreateSubscriptionDTO): Promise<CreateSubscriptionResult> {
    const config = getConfig();
    const frontendUrl = config.frontendUrl || 'http://localhost:5173';
    const price = config.membershipPriceUyu;

    const preapproval = await this.mercadoPagoService.createPreapproval({
      externalReference: dto.userId,
      payerEmail: dto.payerEmail,
      backUrl: `${frontendUrl}/membership/subscription/success`,
      transactionAmount: price,
      reason: 'Membresía Mensual',
    });

    return {
      preapprovalId: preapproval.preapprovalId,
      initPoint: preapproval.initPoint,
    };
  }
}
