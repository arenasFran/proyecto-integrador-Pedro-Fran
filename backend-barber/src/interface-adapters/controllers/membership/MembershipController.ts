import { Request, Response } from 'express';
import { MongoMembershipRepository } from '../../../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { Membership } from '../../../domain/entities/Membership';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';
import { CreatePaymentUseCase } from '../../../application/use-cases/payment/CreatePaymentUseCase';
import { getConfig } from '../../../infrastructure/config/env';

export class MembershipController {
  constructor(
    private readonly membershipRepo: MongoMembershipRepository,
    private readonly userRepo: MongoUserRepository,
    private readonly createPaymentUseCase?: CreatePaymentUseCase
  ) {}

  getMyMembership = async (req: Request, res: Response) => {
    try {
      const membership = await this.membershipRepo.findActiveByUser(req.user!._id);

      if (!membership) {
        const history = await this.membershipRepo.findByUser(req.user!._id);
        return sendSuccess(res, { active: null, history: history.map((m) => m.toPrimitives()) });
      }

      const history = await this.membershipRepo.findByUser(req.user!._id);
      return sendSuccess(res, {
        active: membership.toPrimitives(),
        history: history.map((m) => m.toPrimitives()),
      });
    } catch (error) {
      return sendError(res, error, 'Error al obtener membresía');
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { userId, couponsTotal, productDiscount } = req.body;

      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new AppError('Usuario no encontrado.', 404);
      }

      const alreadyActive = await this.membershipRepo.hasActiveMembership(userId);
      if (alreadyActive) {
        throw new AppError('El usuario ya tiene una membresía activa.', 400);
      }

      const createdBy = req.user!._id === userId ? 'client' as const : 'admin' as const;

      const membership = Membership.create({
        userId,
        createdBy,
        adminId: createdBy === 'admin' ? req.user!._id : undefined,
        couponsTotal,
        productDiscount,
      });

      const saved = await this.membershipRepo.save(membership);

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

      const result = await this.membershipRepo.findAll({ status, search, page, limit });

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

      const alreadyActive = await this.membershipRepo.hasActiveMembership(userId);
      if (alreadyActive) {
        throw new AppError('El usuario ya tiene una membresía activa.', 400);
      }

      if (!this.createPaymentUseCase) {
        throw new AppError('MercadoPago no está configurado.', 500);
      }

      const config = getConfig();
      const membershipPrice = config.membershipPriceUyu;

      const result = await this.createPaymentUseCase.execute({
        type: 'membership',
        referenceId: userId,
        amount: membershipPrice,
        userId,
        items: [{ title: 'Membresía Mensual', quantity: 1, unitPrice: membershipPrice }],
      });

      return sendSuccess(res, {
        preferenceId: result.preferenceId,
        initPoint: result.initPoint,
        paymentId: result.paymentId,
      }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al iniciar pago de membresía');
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
      await this.membershipRepo.save(membership);

      return sendSuccess(res, {
        remainingCoupons: membership.remainingCoupons,
        couponsUsed: membership.couponsUsed,
      });
    } catch (error) {
      return sendError(res, error, 'Error al canjear cupón');
    }
  };
}
