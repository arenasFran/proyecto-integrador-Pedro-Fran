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
      console.log('[MP-DEBUG-WEBHOOK] ===== WEBHOOK RECIBIDO =====');
      console.log('[MP-DEBUG-WEBHOOK] headers:', JSON.stringify({
        'x-signature': req.headers['x-signature'],
        'x-request-id': req.headers['x-request-id'],
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
      }));
      console.log('[MP-DEBUG-WEBHOOK] body completo:', JSON.stringify(req.body, null, 2));

      const xSignature = (req.headers['x-signature'] as string) || '';
      const xRequestId = (req.headers['x-request-id'] as string) || '';

      await this.processWebhook.execute(req.body, xSignature, xRequestId);

      return sendSuccess(res, { message: 'OK' }, 200);
    } catch (error) {
      console.error('[PaymentWebhook] Error:', error);
      return sendError(res, error, 'Error al procesar webhook');
    }
  };

  getByPreferenceId = async (req: Request, res: Response) => {
    try {
      const preferenceId = req.params.preferenceId as string;
      const payment = await this.paymentRepository.findByMpPreferenceId(preferenceId);
      if (!payment) {
        return sendSuccess(res, { payment: null });
      }
      return sendSuccess(res, { payment: payment.toPrimitives() });
    } catch (error) {
      return sendError(res, error, 'Error al obtener el pago por preferencia');
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
