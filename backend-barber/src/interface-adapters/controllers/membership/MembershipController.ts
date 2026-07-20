import { Request, Response } from 'express';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoMembershipTransactionRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipTransactionRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoPaymentRepository } from '../../../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { Membership } from '../../../domain/entities/Membership';
import { Payment } from '../../../domain/entities/Payment';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';
import { CreatePaymentUseCase } from '../../../application/use-cases/payment/CreatePaymentUseCase';
import { CreateSubscriptionUseCase } from '../../../application/use-cases/payment/CreateSubscriptionUseCase';
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
    private readonly mercadoPagoService?: IPaymentService
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

      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new AppError('Usuario no encontrado.', 404);
      }

      const payment: PaymentMethod = paymentMethod || 'local';
      const finalPrice = price ?? getConfig().membershipPriceUyu;

      const existingActive = await this.membershipRepo.findActiveByUser(userId);
      if (existingActive) {
        throw new AppError('El usuario ya tiene una membresía activa.', 400);
      }

      const existingPending = await this.membershipRepo.findPendingByUser(userId);
      if (existingPending) {
        throw new AppError('El usuario ya tiene una membresía pendiente de pago.', 400);
      }

      const existing = await this.membershipRepo.findAnyByUser(userId);
      let membership: Membership;

      if (existing && existing.status === 'expired') {
        existing.reactivate(finalPrice, payment, durationDays);
        membership = existing;
      } else if (existing && existing.status === 'pending') {
        existing.approve(req.user!._id);
        membership = existing;
      } else {
        membership = Membership.create({
          userId,
          createdBy: 'admin',
          adminId: req.user!._id,
          couponsTotal: couponsTotal ?? undefined,
          productDiscount: productDiscount ?? undefined,
          durationDays: durationDays ?? undefined,
          billingCycle: billingCycle ?? undefined,
          price: finalPrice,
          status: 'active',
        paymentMethod: payment || 'local',
        });
      }

      const saved = await this.membershipRepo.save(membership);

      await this.transactionRepo.create({
        userId,
        membershipId: saved.id,
        amount: finalPrice,
        paymentMethod: payment || 'local',
        createdBy: 'admin',
        adminId: req.user!._id,
      });

      if (finalPrice > 0 && this.paymentRepository) {
        try {
          const paymentDoc = Payment.create({
            type: 'membership',
            referenceId: saved.id,
            amount: finalPrice,
            userId,
          });
          paymentDoc.approve('admin_manual');
          await this.paymentRepository.save(paymentDoc);
        } catch (err) {
          console.error('[MembershipController] Error creating PaymentModel for manual membership:', err);
        }
      }

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

      if (req.user!._id !== userId && req.user!.kind !== 'Admin') {
        throw new AppError('No podés crear suscripción para otro usuario.', 403);
      }

      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new AppError('Usuario no encontrado.', 404);
      }

      const existingActive = await this.membershipRepo.findActiveByUser(userId);
      if (existingActive) {
        throw new AppError('El usuario ya tiene una membresía activa.', 400);
      }

      if (!this.createSubscriptionUseCase) {
        throw new AppError('MercadoPago no está configurado.', 500);
      }

      const existing = await this.membershipRepo.findAnyByUser(userId);
      let membership: Membership;

      if (existing && (existing.status === 'expired' || existing.status === 'pending')) {
        membership = existing;
      } else {
        membership = Membership.create({
          userId,
          createdBy: 'client',
          status: 'pending',
          price: getConfig().membershipPriceUyu,
          paymentMethod: 'mercadopago',
        });
        await this.membershipRepo.save(membership);
      }

      const result = await this.createSubscriptionUseCase.execute({
        userId,
        payerEmail: email,
      });

      return sendSuccess(res, {
        preapprovalId: result.preapprovalId,
        initPoint: result.initPoint,
        membershipId: membership.id,
      }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear suscripción');
    }
  };

  cancelSubscription = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const membership = await this.membershipRepo.findById(id);
      if (!membership) {
        throw new AppError('Membresía no encontrada.', 404);
      }

      const isOwner = membership.userId === req.user!._id;
      const isAdmin = req.user!.kind === 'Admin';
      if (!isOwner && !isAdmin) {
        throw new AppError('No tenés permiso para cancelar esta membresía.', 403);
      }

      if (!membership.mpPreapprovalId) {
        throw new AppError('Esta membresía no tiene una suscripción activa en MercadoPago.', 400);
      }

      if (this.mercadoPagoService) {
        try {
          await this.mercadoPagoService.cancelPreapproval(membership.mpPreapprovalId);
        } catch {
          throw new AppError(
            'No se pudo cancelar la suscripción en MercadoPago. Reintentá en unos minutos.',
            502
          );
        }
      }

      membership.cancel();
      await this.membershipRepo.save(membership);

      return sendSuccess(res, { message: 'Suscripción cancelada exitosamente.' });
    } catch (error) {
      return sendError(res, error, 'Error al cancelar suscripción');
    }
  };

  initiatePayment = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (req.user!._id !== userId && req.user!.kind !== 'Admin') {
        throw new AppError('No podés iniciar pago para otro usuario.', 403);
      }

      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new AppError('Usuario no encontrado.', 404);
      }

      const existingActive = await this.membershipRepo.findActiveByUser(userId);
      if (existingActive) {
        throw new AppError('Ya tenés una membresía activa.', 400);
      }

      if (!this.createPaymentUseCase) {
        throw new AppError('MercadoPago no está configurado.', 500);
      }

      const existing = await this.membershipRepo.findAnyByUser(userId);
      let membership: Membership;

      if (existing && (existing.status === 'expired' || existing.status === 'pending')) {
        membership = existing;
        if (existing.status === 'expired') {
          existing.status as any; // keep as expired until webhook approves
        }
      } else {
        membership = Membership.create({
          userId,
          createdBy: 'client',
          status: 'pending',
          price: getConfig().membershipPriceUyu,
          paymentMethod: 'mercadopago',
        });
        await this.membershipRepo.save(membership);
      }

      const config = getConfig();
      const membershipPrice = config.membershipPriceUyu;

      const result = await this.createPaymentUseCase.execute({
        type: 'membership',
        referenceId: membership.id,
        amount: membershipPrice,
        userId,
        items: [{ title: 'Membresía Mensual', quantity: 1, unitPrice: membershipPrice }],
        payerEmail: req.user!.email,
      });

      return sendSuccess(res, {
        preferenceId: result.preferenceId,
        initPoint: result.initPoint,
        sandboxInitPoint: result.sandboxInitPoint,
        paymentId: result.paymentId,
        membershipId: membership.id,
      }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al iniciar pago de membresía');
    }
  };

  approvePending = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const membership = await this.membershipRepo.findById(id);
      if (!membership) {
        throw new AppError('Membresía no encontrada.', 404);
      }

      if (!membership.isPending) {
        throw new AppError('La membresía no está pendiente de pago.', 400);
      }

      const staffId = req.user!._id;
      membership.approve(staffId);
      const updated = await this.membershipRepo.approvePending(id, staffId);
      const result = updated ?? membership;

      await this.transactionRepo.create({
        userId: result.userId,
        membershipId: result.id,
        amount: result.price,
        paymentMethod: result.paymentMethod === 'mercadopago' ? 'mercadopago' : 'local',
        createdBy: 'admin',
        adminId: staffId,
      });

      return sendSuccess(res, result.toPrimitives());
    } catch (error) {
      return sendError(res, error, 'Error al aprobar membresía');
    }
  };

  retryPayment = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;

      if (req.user!._id !== userId && req.user!.kind !== 'Admin') {
        throw new AppError('No podés reintentar el pago para otro usuario.', 403);
      }

      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new AppError('Usuario no encontrado.', 404);
      }

      const pending = await this.membershipRepo.findPendingByUser(userId);
      if (!pending) {
        throw new AppError('No tenés una membresía pendiente de pago.', 400);
      }

      if (pending.paymentMethod !== 'mercadopago') {
        throw new AppError('Esta membresía no está asociada a un pago por MercadoPago.', 400);
      }

      if (!this.createPaymentUseCase) {
        throw new AppError('MercadoPago no está configurado.', 500);
      }

      if (this.paymentRepository) {
        const existingPayment = await this.paymentRepository.findByReference(pending.id, 'membership');
        if (existingPayment && existingPayment.status === 'pending') {
          existingPayment.cancel();
          await this.paymentRepository.save(existingPayment);
        }
      }

      const config = getConfig();
      const membershipPrice = config.membershipPriceUyu;

      const result = await this.createPaymentUseCase.execute({
        type: 'membership',
        referenceId: pending.id,
        amount: membershipPrice,
        userId,
        items: [{ title: 'Membresía Mensual', quantity: 1, unitPrice: membershipPrice }],
        payerEmail: req.user!.email,
      });

      return sendSuccess(res, {
        preferenceId: result.preferenceId,
        initPoint: result.initPoint,
        sandboxInitPoint: result.sandboxInitPoint,
        paymentId: result.paymentId,
        membershipId: pending.id,
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
}
