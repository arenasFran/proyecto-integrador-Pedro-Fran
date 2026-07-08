import { Request, Response } from 'express';
import { ProcessWebhookUseCase } from '../../../application/use-cases/payment/ProcessWebhookUseCase';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';

export class PaymentController {
  constructor(
    private readonly processWebhook: ProcessWebhookUseCase,
    private readonly paymentRepository: MongoPaymentRepository
  ) {}

  handleWebhook = async (req: Request, res: Response) => {
    try {
      const xSignature = (req.headers['x-signature'] as string) || '';
      const xRequestId = (req.headers['x-request-id'] as string) || '';

      await this.processWebhook.execute(req.body, xSignature, xRequestId);

      return sendSuccess(res, { message: 'OK' }, 200);
    } catch (error) {
      console.error('[PaymentWebhook] Error:', error);
      return sendSuccess(res, { message: 'OK' }, 200);
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const payment = await this.paymentRepository.findById(id);
      if (!payment) {
        throw new AppError('Pago no encontrado.', 404);
      }

      const isOwner = payment.userId === req.user!._id;
      const isAdmin = req.user!.kind === 'Admin';
      if (!isOwner && !isAdmin) {
        throw new AppError('No tenés permiso para ver este pago.', 403);
      }

      return sendSuccess(res, { payment: payment.toPrimitives() });
    } catch (error) {
      return sendError(res, error, 'Error al obtener el pago');
    }
  };
}
