import { Payment } from '../../../domain/entities/Payment';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { IPaymentService } from '../../ports/IPaymentService';
import { getConfig } from '../../../infrastructure/config/env';

export type CreatePaymentDTO = {
  type: 'appointment' | 'membership' | 'product_order';
  referenceId: string;
  amount: number;
  userId: string;
  items: { title: string; quantity: number; unitPrice: number; id?: string }[];
  payerEmail?: string;
};

export type CreatePaymentResult = {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
  paymentId: string;
};

export class CreatePaymentUseCase {
  constructor(
    private readonly paymentRepository: MongoPaymentRepository,
    private readonly mercadoPagoService: IPaymentService
  ) {}

  async execute(dto: CreatePaymentDTO): Promise<CreatePaymentResult> {
    const config = getConfig();
    const frontendUrl = config.frontendUrl || 'http://localhost:5173';

    const payment = Payment.create({
      type: dto.type,
      referenceId: dto.referenceId,
      amount: dto.amount,
      userId: dto.userId,
    });

    const saved = await this.paymentRepository.save(payment);

    const preference = await this.mercadoPagoService.createPreference({
      items: dto.items,
      externalReference: saved.id,
      notificationUrl: config.mpNotificationUrl,
      backUrls: {
        success: `${frontendUrl}/payment/result?status=success`,
        failure: `${frontendUrl}/payment/result?status=failure`,
        pending: `${frontendUrl}/payment/result?status=pending`,
      },
      payerEmail: dto.payerEmail,
    });

    saved.assignPreference(preference.preferenceId);
    await this.paymentRepository.save(saved);

    return {
      preferenceId: preference.preferenceId,
      initPoint: preference.initPoint,
      sandboxInitPoint: preference.sandboxInitPoint,
      paymentId: saved.id,
    };
  }
}
