import { Request, Response } from 'express';
import { CreateAppointmentUseCase } from '../../../application/use-cases/appointment/CreateAppointmentUseCase';
import { GetAppointmentsUseCase } from '../../../application/use-cases/appointment/GetAppointmentsUseCase';
import { GetAppointmentByIdUseCase } from '../../../application/use-cases/appointment/GetAppointmentByIdUseCase';
import { CancelAppointmentUseCase } from '../../../application/use-cases/appointment/CancelAppointmentUseCase';
import { UpdateAppointmentStatusUseCase } from '../../../application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { RescheduleAppointmentUseCase } from '../../../application/use-cases/appointment/RescheduleAppointmentUseCase';
import { GetAppointmentsAnonymousUseCase } from '../../../application/use-cases/appointment/GetAppointmentsAnonymousUseCase';
import { AppointmentPresenter } from '../../presenters/AppointmentPresenter';
import { AuthRequest } from '../../middlewares/auth.middleware';

export class AppointmentController {
  constructor(
    private readonly createAppointment: CreateAppointmentUseCase,
    private readonly getAppointments: GetAppointmentsUseCase,
    private readonly getAppointmentById: GetAppointmentByIdUseCase,
    private readonly cancelAppointment: CancelAppointmentUseCase,
    private readonly updateAppointmentStatus: UpdateAppointmentStatusUseCase,
    private readonly rescheduleAppointment: RescheduleAppointmentUseCase,
    private readonly getAppointmentsAnonymous: GetAppointmentsAnonymousUseCase
  ) {}

  create = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const body = { ...req.body };

      // RN11 — Asignación de clientId según rol
      if (authReq.user) {
        if (authReq.user.kind === 'Admin' || authReq.user.kind === 'Empleado') {
          // Respetar clientId enviado, o dejarlo undefined para que aplique RN10
          body.clientName = body.clientName || authReq.user.email;
        } else {
          // Cliente registrado: auto-asignación
          body.clientId = authReq.user._id;
          body.clientName = body.clientName || authReq.user.email;
        }
      }

      const result = await this.createAppointment.execute(body);
      return AppointmentPresenter.success(res, result, 201);
    } catch (error) {
      return AppointmentPresenter.handleError(res, error, 'Error al crear el turno');
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const query: { barberId?: string; clientId?: string; date?: string; dateFrom?: string; dateTo?: string } = {};

      if (authReq.user?.kind === 'Admin' || authReq.user?.kind === 'Empleado') {
        if (req.query.barberId) query.barberId = req.query.barberId as string;
        if (req.query.clientId) query.clientId = req.query.clientId as string;
      } else {
        query.clientId = authReq.user?._id;
      }

      if (req.query.date) query.date = req.query.date as string;
      if (req.query.dateFrom) query.dateFrom = req.query.dateFrom as string;
      if (req.query.dateTo) query.dateTo = req.query.dateTo as string;

      const result = await this.getAppointments.execute(query);
      return AppointmentPresenter.success(res, result, 200);
    } catch (error) {
      return AppointmentPresenter.handleError(res, error, 'Error al obtener turnos');
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const id = req.params.id as string;
      const result = await this.getAppointmentById.execute(
        id,
        authReq.user!._id,
        authReq.user!.kind
      );
      return AppointmentPresenter.success(res, result, 200);
    } catch (error) {
      return AppointmentPresenter.handleError(res, error, 'Error al obtener el turno');
    }
  };

  cancel = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const id = req.params.id as string;
      const reason = req.body.reason;

      const result = await this.cancelAppointment.execute(
        id,
        authReq.user!._id,
        authReq.user!.kind,
        reason
      );
      return AppointmentPresenter.success(res, result, 200);
    } catch (error) {
      return AppointmentPresenter.handleError(res, error, 'Error al cancelar el turno');
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const id = req.params.id as string;
      const result = await this.updateAppointmentStatus.execute(
        id,
        req.body,
        authReq.user!._id,
        authReq.user!.kind
      );
      return AppointmentPresenter.success(res, result, 200);
    } catch (error) {
      return AppointmentPresenter.handleError(res, error, 'Error al actualizar el estado del turno');
    }
  };

  getAnonymous = async (req: Request, res: Response) => {
    try {
      const result = await this.getAppointmentsAnonymous.execute({
        clientEmail: req.query.email as string | undefined,
        clientPhone: req.query.phone as string | undefined,
        date: req.query.date as string | undefined,
      });
      return AppointmentPresenter.success(res, result, 200);
    } catch (error) {
      return AppointmentPresenter.handleError(res, error, 'Error al obtener turnos');
    }
  };

  reschedule = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const id = req.params.id as string;
      const result = await this.rescheduleAppointment.execute(
        id,
        req.body,
        authReq.user!._id,
        authReq.user!.kind
      );
      return AppointmentPresenter.success(res, result, 200);
    } catch (error) {
      return AppointmentPresenter.handleError(res, error, 'Error al reagendar el turno');
    }
  };
}
