import { Request, Response } from 'express';
import { CreateAppointmentUseCase } from '../../../application/use-cases/appointment/CreateAppointmentUseCase';
import { CancelAppointmentUseCase } from '../../../application/use-cases/appointment/CancelAppointmentUseCase';
import { UpdateAppointmentStatusUseCase } from '../../../application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { RescheduleAppointmentUseCase } from '../../../application/use-cases/appointment/RescheduleAppointmentUseCase';
import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';
import type { AppointmentStatus } from '../../../domain/types/appointment';

export class AppointmentController {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly barberRepository: MongoBarberRepository,
    private readonly createAppointment: CreateAppointmentUseCase,
    private readonly cancelAppointment: CancelAppointmentUseCase,
    private readonly updateAppointmentStatus: UpdateAppointmentStatusUseCase,
    private readonly rescheduleAppointment: RescheduleAppointmentUseCase
  ) {}

  create = async (req: Request, res: Response) => {
    try {
      const body = { ...req.body };

      if (req.user) {
        if (req.user.kind === 'Admin' || req.user.kind === 'Empleado') {
          body.clientName = body.clientName || req.user.email;
          body.createdBy = { type: 'staff', userId: req.user._id };
        } else {
          body.clientId = req.user._id;
          body.clientName = body.clientName || req.user.email;
          body.createdBy = { type: 'registered', userId: req.user._id };
        }
      } else {
        body.createdBy = { type: 'anonymous' };
      }

      const result = await this.createAppointment.execute(body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear el turno');
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const query: { barberId?: string; clientId?: string; date?: string; dateFrom?: string; dateTo?: string; status?: AppointmentStatus; paymentMethod?: string; page?: number; limit?: number } = {};

      if (req.user?.kind === 'Admin' || req.user?.kind === 'Empleado') {
        if (req.query.barberId) query.barberId = req.query.barberId as string;
        if (req.query.clientId) query.clientId = req.query.clientId as string;
      } else {
        query.clientId = req.user?._id;
      }

      if (req.query.date) query.date = req.query.date as string;
      if (req.query.dateFrom) query.dateFrom = req.query.dateFrom as string;
      if (req.query.dateTo) query.dateTo = req.query.dateTo as string;
      if (req.query.status) query.status = req.query.status as AppointmentStatus;
      if (req.query.paymentMethod) query.paymentMethod = req.query.paymentMethod as string;

      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      if (page !== undefined) query.page = page;
      if (limit !== undefined) query.limit = limit;

      const result = await this.appointmentRepository.findMany(query);
      let appointments = result.data.map((a) => a.toPrimitives());

      if (req.query.includeBarber === 'true') {
        const barbers = await this.barberRepository.findAllBarbers();
        const barberMap = new Map(
          barbers.map((b) => [b.id, { name: b.name, lastname: b.lastname, photoUrl: b.photoUrl }])
        );
        appointments = appointments.map((a) => ({
          ...a,
          barberName: barberMap.has(a.barberId)
            ? `${barberMap.get(a.barberId)!.name} ${barberMap.get(a.barberId)!.lastname}`
            : undefined,
          barberPhotoUrl: barberMap.get(a.barberId)?.photoUrl ?? undefined,
        }));
      }

      return sendSuccess(res, {
        appointments,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: result.limit,
      }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener turnos');
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const appointment = await this.appointmentRepository.findById(id);
      if (!appointment) {
        throw new AppError('Turno no encontrado.', 404);
      }
      const isOwner = appointment.clientId === req.user!._id;
      const isAdminOrBarber = req.user!.kind === 'Admin' || req.user!.kind === 'Empleado';
      if (!isOwner && !isAdminOrBarber) {
        throw new AppError('No tenés permiso para ver este turno.', 403);
      }
      return sendSuccess(res, { appointment: appointment.toPrimitives() }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener el turno');
    }
  };

  cancel = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const reason = req.body.reason;

      const result = await this.cancelAppointment.execute(
        id,
        req.user!._id,
        req.user!.kind,
        reason
      );
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al cancelar el turno');
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const result = await this.updateAppointmentStatus.execute(
        id,
        req.body,
        req.user!._id,
        req.user!.kind
      );
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al actualizar el estado del turno');
    }
  };

  getAnonymous = async (req: Request, res: Response) => {
    try {
      const clientEmail = req.query.email as string | undefined;
      const clientPhone = req.query.phone as string | undefined;
      if (!clientEmail && !clientPhone) {
        throw new AppError('Debe proporcionar email o teléfono.', 400);
      }
      const result = await this.appointmentRepository.findMany({
        clientEmail,
        clientPhone,
        date: req.query.date as string | undefined,
      });
      return sendSuccess(res, { appointments: result.data.map((a) => a.toPrimitives()) }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener turnos');
    }
  };

  reschedule = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const result = await this.rescheduleAppointment.execute(
        id,
        req.body,
        req.user!._id,
        req.user!.kind
      );
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al reagendar el turno');
    }
  };
}


