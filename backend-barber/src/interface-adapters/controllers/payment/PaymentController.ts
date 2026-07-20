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

  handleWebhook = (req: Request, res: Response) => {
    const xSignature = (req.headers['x-signature'] as string) || '';
    const xRequestId = (req.headers['x-request-id'] as string) || '';
    const dataIdFromQuery = (req.query['data.id'] as string) || '';

    console.log('[MP-DEBUG-WEBHOOK] ===== WEBHOOK RECIBIDO =====');
    console.log('[MP-DEBUG-WEBHOOK] headers:', JSON.stringify({
      'x-signature': req.headers['x-signature'],
      'x-request-id': req.headers['x-request-id'],
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
    }));
    console.log('[MP-DEBUG-WEBHOOK] query data.id:', dataIdFromQuery);
    console.log('[MP-DEBUG-WEBHOOK] body completo:', JSON.stringify(req.body, null, 2));

    res.status(200).json({ message: 'OK' });

    this.processWebhook.execute(req.body, xSignature, xRequestId, dataIdFromQuery).catch((error) => {
      console.error('[PaymentWebhook] Error en procesamiento asíncrono:', error);
    });
  };

  getByPreferenceId = async (req: Request, res: Response) => {
    try {
      const preferenceId = req.params.preferenceId as string;
      const payment = await this.paymentRepository.findByMpPreferenceId(preferenceId);
      if (!payment) {
        return sendSuccess(res, { payment: null });
      }

      const hasUser = !!req.user;
      const hasRealUserId = payment.userId !== '' && !payment.userId.startsWith('manual_');

      if (hasUser && payment.userId) {
        const isOwner = payment.userId === req.user!._id;
        const isAdmin = req.user!.kind === 'Admin';
        if (!isOwner && !isAdmin) {
          throw new AppError('No tenés permiso para ver este pago.', 403);
        }
      }

      if (!hasUser && hasRealUserId) {
        throw new AppError('Autenticación requerida.', 401);
      }

      return sendSuccess(res, {
        payment: {
          id: payment.id,
          status: payment.status,
          type: payment.type,
          amount: payment.amount,
          referenceId: payment.referenceId,
        },
      });
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

  getByReference = async (req: Request, res: Response) => {
    try {
      const referenceId = req.params.referenceId as string;
      const type = req.query.type as string;
      const payment = await this.paymentRepository.findByReference(referenceId, type);
      return sendSuccess(res, { payment: payment ? payment.toPrimitives() : null });
    } catch (error) {
      return sendError(res, error, 'Error al obtener el pago');
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const { type, status, page, limit } = req.query as Record<string, string>;
      const result = await this.paymentRepository.findAll({
        type,
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
      });
      return sendSuccess(res, {
        data: result.data.map((p) => p.toPrimitives()),
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: result.limit,
      });
    } catch (error) {
      return sendError(res, error, 'Error al listar pagos');
    }
  };
}
