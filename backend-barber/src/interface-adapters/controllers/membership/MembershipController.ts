import { Request, Response } from 'express';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoMembershipTransactionRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipTransactionRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';
import { CreatePaymentUseCase } from '../../../application/use-cases/payment/CreatePaymentUseCase';
import { CreateSubscriptionUseCase } from '../../../application/use-cases/payment/CreateSubscriptionUseCase';
import { CreateMembershipUseCase } from '../../../application/use-cases/membership/CreateMembershipUseCase';
import { CancelMembershipUseCase } from '../../../application/use-cases/membership/CancelMembershipUseCase';
import { InitiateMembershipPaymentUseCase } from '../../../application/use-cases/membership/InitiateMembershipPaymentUseCase';
import { ApprovePendingMembershipUseCase } from '../../../application/use-cases/membership/ApprovePendingMembershipUseCase';
import { RetryMembershipPaymentUseCase } from '../../../application/use-cases/membership/RetryMembershipPaymentUseCase';
import { CreateMembershipSubscriptionUseCase } from '../../../application/use-cases/membership/CreateMembershipSubscriptionUseCase';
import { IPaymentService } from '../../../application/ports/IPaymentService';
import { getConfig } from '../../../infrastructure/config/env';
import type { PaymentMethod } from '../../../domain/types/membership';

export class MembershipController {
  constructor(
    private readonly membershipRepo: MongoMembershipRepository,
    private readonly userRepo: MongoUserRepository,
    private readonly transactionRepo: MongoMembershipTransactionRepository,
    private readonly createPaymentUseCase?: CreatePaymentUseCase,
    private readonly paymentRepository?: MongoPaymentRepository,
    private readonly createSubscriptionUseCase?: CreateSubscriptionUseCase,
    private readonly mercadoPagoService?: IPaymentService,
    private readonly createMembershipUseCase?: CreateMembershipUseCase,
    private readonly cancelMembershipUseCase?: CancelMembershipUseCase,
    private readonly initiateMembershipPaymentUseCase?: InitiateMembershipPaymentUseCase,
    private readonly approvePendingMembershipUseCase?: ApprovePendingMembershipUseCase,
    private readonly retryMembershipPaymentUseCase?: RetryMembershipPaymentUseCase,
    private readonly createMembershipSubscriptionUseCase?: CreateMembershipSubscriptionUseCase,
  ) {}

  private async buildMembershipSummary(userId: string) {
    const active = await this.membershipRepo.findActiveByUser(userId);
    const pending = await this.membershipRepo.findPendingByUser(userId);
    const history = await this.membershipRepo.findByUser(userId);
    return {
      active: active ? active.toPrimitives() : null,
      pending: pending ? pending.toPrimitives() : null,
      history: history.map((m) => m.toPrimitives()),
    };
  }

  getMyMembership = async (req: Request, res: Response) => {
    try {
      const summary = await this.buildMembershipSummary(req.user!._id);
      return sendSuccess(res, summary);
    } catch (error) {
      return sendError(res, error, 'Error al obtener membresía');
    }
  };

  getByUserId = async (req: Request, res: Response) => {
    try {
      const summary = await this.buildMembershipSummary(req.params.userId as string);
      return sendSuccess(res, summary);
    } catch (error) {
      return sendError(res, error, 'Error al obtener membresía');
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { userId, couponsTotal, productDiscount, paymentMethod, price, durationDays, billingCycle } = req.body;

      const isStaff = req.user!.kind === 'Admin' || req.user!.kind === 'Empleado';
      if (!isStaff) {
        throw new AppError('Solo el personal puede crear membresías manualmente.', 403);
      }

      if (!this.createMembershipUseCase) {
        throw new AppError('Servicio no disponible.', 500);
      }

      const saved = await this.createMembershipUseCase.execute({
        userId,
        couponsTotal,
        productDiscount,
        paymentMethod,
        price,
        durationDays,
        billingCycle,
        staffId: req.user!._id,
      });

      return sendSuccess(res, saved.toPrimitives(), 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear membresía');
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const { status, search } = req.query as { status?: string; search?: string };
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const result = await this.membershipRepo.findAllEntityView({ status, search, page, limit });

      const userIds = result.data.map((m) => m.userId);
      const userMap = await this.userRepo.findByIds(userIds);

      const data = result.data.map((m) => {
        const user = userMap.get(m.userId);
        return {
          ...m.toPrimitives(),
          user: user
            ? { id: user.id, name: user.name, lastname: user.lastname, email: user.email }
            : null,
        };
      });

      return sendSuccess(res, { data, total: result.total, page: result.page, totalPages: result.totalPages, limit: result.limit });
    } catch (error) {
      return sendError(res, error, 'Error al listar membresías');
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const membership = await this.membershipRepo.findById(req.params.id as string);
      if (!membership) {
        throw new AppError('Membresía no encontrada.', 404);
      }
      return sendSuccess(res, membership.toPrimitives());
    } catch (error) {
      return sendError(res, error, 'Error al obtener membresía');
    }
  };

  createSubscription = async (req: Request, res: Response) => {
    try {
      const { userId, email } = req.body;

      if (!this.createMembershipSubscriptionUseCase) {
        throw new AppError('MercadoPago no está configurado.', 500);
      }

      const result = await this.createMembershipSubscriptionUseCase.execute({
        userId,
        email,
        actorId: req.user!._id,
        actorKind: req.user!.kind,
      });

      return sendSuccess(res, {
        preapprovalId: result.preapprovalId,
        initPoint: result.initPoint,
        membershipId: result.membershipId,
      }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear suscripción');
    }
  };

  cancel = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      if (!this.cancelMembershipUseCase) {
        throw new AppError('Servicio no disponible.', 500);
      }

      await this.cancelMembershipUseCase.execute({
        membershipId: id,
        actorId: req.user!._id,
        actorKind: req.user!.kind,
      });

      return sendSuccess(res, { message: 'Membresía cancelada exitosamente.' });
    } catch (error) {
      return sendError(res, error, 'Error al cancelar membresía');
    }
  };

  initiatePayment = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (!this.initiateMembershipPaymentUseCase) {
        throw new AppError('MercadoPago no está configurado.', 500);
      }

      const result = await this.initiateMembershipPaymentUseCase.execute({
        userId,
        actorId: req.user!._id,
        actorKind: req.user!.kind,
        payerEmail: req.user!.email,
      });

      return sendSuccess(res, {
        preferenceId: result.preferenceId,
        initPoint: result.initPoint,
        sandboxInitPoint: result.sandboxInitPoint,
        paymentId: result.paymentId,
        membershipId: result.membershipId,
      }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al iniciar pago de membresía');
    }
  };

  approvePending = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      if (!this.approvePendingMembershipUseCase) {
        throw new AppError('Servicio no disponible.', 500);
      }

      const result = await this.approvePendingMembershipUseCase.execute({
        membershipId: id,
        staffId: req.user!._id,
      });

      return sendSuccess(res, result);
    } catch (error) {
      return sendError(res, error, 'Error al aprobar membresía');
    }
  };

  retryPayment = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (!this.retryMembershipPaymentUseCase) {
        throw new AppError('MercadoPago no está configurado.', 500);
      }

      const result = await this.retryMembershipPaymentUseCase.execute({
        userId,
        actorId: req.user!._id,
        actorKind: req.user!.kind,
        payerEmail: req.user!.email,
      });

      return sendSuccess(res, {
        preferenceId: result.preferenceId,
        initPoint: result.initPoint,
        sandboxInitPoint: result.sandboxInitPoint,
        paymentId: result.paymentId,
        membershipId: result.membershipId,
      }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al reintentar pago de membresía');
    }
  };

  redeemCoupon = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      const membership = await this.membershipRepo.findActiveByUser(userId);
      if (!membership) {
        throw new AppError('El usuario no tiene una membresía activa.', 400);
      }

      membership.redeemCoupon();
      const updated = await this.membershipRepo.incrementCouponsUsed(membership.id, 1);
      if (!updated) {
        throw new AppError('No quedan cupones disponibles.', 409);
      }

      return sendSuccess(res, {
        remainingCoupons: updated.remainingCoupons,
        couponsUsed: updated.couponsUsed,
      });
    } catch (error) {
      return sendError(res, error, 'Error al canjear cupón');
    }
  };

  getTransactions = async (req: Request, res: Response) => {
    try {
      const { membershipId, userId, desde, hasta, paymentMethod, page, limit } = req.query as Record<string, string | undefined>;

      if (membershipId) {
        const result = await this.transactionRepo.findByMembershipId(membershipId, {
          page: page ? parseInt(page, 10) : undefined,
          limit: limit ? parseInt(limit, 10) : undefined,
        });
        return sendSuccess(res, result);
      }

      const result = await this.transactionRepo.findAll({
        desde,
        hasta,
        paymentMethod,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      if (userId) {
        const userResult = await this.transactionRepo.findByUser(userId, {
          desde,
          hasta,
          paymentMethod,
          page: page ? parseInt(page, 10) : undefined,
          limit: limit ? parseInt(limit, 10) : undefined,
        });
        return sendSuccess(res, userResult);
      }

      return sendSuccess(res, result);
    } catch (error) {
      return sendError(res, error, 'Error al obtener transacciones');
    }
  };

  getPending = async (_req: Request, res: Response) => {
    try {
      const pending = await this.membershipRepo.findPendingAll();
      const userIds = pending.map((m) => m.userId);
      const userMap = await this.userRepo.findByIds(userIds);

      const data = pending.map((m) => {
        const user = userMap.get(m.userId);
        return {
          ...m.toPrimitives(),
          user: user
            ? { id: user.id, name: user.name, lastname: user.lastname, email: user.email }
            : null,
        };
      });

      return sendSuccess(res, { data });
    } catch (error) {
      return sendError(res, error, 'Error al obtener membresías pendientes');
    }
  };

  getExpiringSoon = async (req: Request, res: Response) => {
    try {
      const days = parseInt((req.query.days as string) || '5', 10);
      const expiring = await this.membershipRepo.findExpiringSoon(days);
      const userIds = expiring.map((m) => m.userId);
      const userMap = await this.userRepo.findByIds(userIds);

      const data = expiring.map((m) => {
        const user = userMap.get(m.userId);
        return {
          ...m.toPrimitives(),
          user: user
            ? { id: user.id, name: user.name, lastname: user.lastname, email: user.email }
            : null,
          daysLeft: Math.max(0, Math.ceil((new Date(m.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        };
      });

      return sendSuccess(res, { data, days });
    } catch (error) {
      return sendError(res, error, 'Error al obtener membresías por vencer');
    }
  };

  getCouponHistory = async (req: Request, res: Response) => {
    try {
      const membershipId = req.params.id as string;
      const membership = await this.membershipRepo.findById(membershipId);
      if (!membership) {
        throw new AppError('Membresía no encontrada.', 404);
      }

      const appointments = await this.membershipRepo.findCouponAppointments(membershipId);

      const history = appointments.map((a: Record<string, any>) => ({
        appointmentId: a._id.toString(),
        date: a.date,
        startTime: a.startTime,
        serviceName: a.serviceName,
        servicePrice: a.servicePrice,
        status: a.status,
        couponRestored: a.status === 'Cancelado',
        restoredAt: a.couponRestoredAt || null,
      }));

      return sendSuccess(res, {
        membershipId,
        couponsTotal: membership.couponsTotal,
        couponsUsed: membership.couponsUsed,
        remainingCoupons: membership.remainingCoupons,
        history,
      });
    } catch (error) {
      return sendError(res, error, 'Error al obtener historial de cupones');
    }
  };

  addCouponsToMembership = async (req: Request, res: Response) => {
    try {
      const membershipId = req.params.id as string;
      const { count } = req.body as { count: number };

      if (!count || count <= 0 || !Number.isInteger(count)) {
        throw new AppError('La cantidad de cupones debe ser un número entero positivo.', 400);
      }

      if (req.user!.kind !== 'Admin') {
        throw new AppError('Solo administradores pueden agregar cupones.', 403);
      }

      const membership = await this.membershipRepo.findById(membershipId);
      if (!membership) {
        throw new AppError('Membresía no encontrada.', 404);
      }

      const updated = await this.membershipRepo.addCouponsTotal(membershipId, count);
      if (!updated) {
        throw new AppError('Error al agregar cupones.', 500);
      }

      return sendSuccess(res, {
        membershipId: updated.id,
        couponsTotal: updated.couponsTotal,
        couponsUsed: updated.couponsUsed,
        remainingCoupons: updated.remainingCoupons,
      });
    } catch (error) {
      return sendError(res, error, 'Error al agregar cupones');
    }
  };
}
