import { Request, Response } from 'express';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';
import { assertOwnershipOrAdmin } from '../../../common/ownership';
import type { PaymentType } from '../../../domain/types/payment.types';
export class PaymentController {
  constructor(private readonly paymentRepository: MongoPaymentRepository) {}

  getById = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const payment = await this.paymentRepository.findById(id);
      if (!payment) {
        throw new AppError('Pago no encontrado.', 404);
      }

      assertOwnershipOrAdmin(payment.userId, req.user!._id, req.user!.kind, 'pago');

      return sendSuccess(res, { payment: payment.toPrimitives() });
    } catch (error) {
      return sendError(res, error, 'Error al obtener el pago');
    }
  };

  getByReference = async (req: Request, res: Response) => {
    try {
      const referenceId = req.params.referenceId as string;
      const type = req.query.type as PaymentType;
      const payment = await this.paymentRepository.findByReference(referenceId, type);
      if (payment) {
        assertOwnershipOrAdmin(payment.userId, req.user!._id, req.user!.kind, 'pago');
      }
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
