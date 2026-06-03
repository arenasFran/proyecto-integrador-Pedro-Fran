import { Request, Response } from 'express';
import { CreateAppointmentUseCase } from '../../../application/use-cases/appointment/CreateAppointmentUseCase';
import { GetAppointmentsUseCase } from '../../../application/use-cases/appointment/GetAppointmentsUseCase';
import { CancelAppointmentUseCase } from '../../../application/use-cases/appointment/CancelAppointmentUseCase';
import { UpdateAppointmentStatusUseCase } from '../../../application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { AuthPresenter } from '../../presenters/AuthPresenter';
import { AuthRequest } from '../../middlewares/auth.middleware';

export class AppointmentController {
  constructor(
    private readonly createAppointment: CreateAppointmentUseCase,
    private readonly getAppointments: GetAppointmentsUseCase,
    private readonly cancelAppointment: CancelAppointmentUseCase,
    private readonly updateAppointmentStatus: UpdateAppointmentStatusUseCase
  ) {}

  create = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const body = { ...req.body };

      if (authReq.user) {
        body.clientId = authReq.user._id;
        body.clientName = body.clientName || authReq.user.email;
      }

      const result = await this.createAppointment.execute(body);
      return AuthPresenter.success(res, result, 201);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error al crear el turno');
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const query: Record<string, string | undefined> = {};

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
      return AuthPresenter.success(res, result, 200);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error al obtener turnos');
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const appointments = await this.getAppointments.execute({});

      const appointment = appointments.appointments.find(
        (a) => a.id === req.params.id
      );

      if (!appointment) {
        return AuthPresenter.success(res, { error: 'Turno no encontrado' }, 404);
      }

      const isOwner = appointment.clientId === authReq.user?._id;
      const isAdminOrBarber =
        authReq.user?.kind === 'Admin' || authReq.user?.kind === 'Empleado';

      if (!isOwner && !isAdminOrBarber) {
        return AuthPresenter.success(
          res,
          { error: 'No tenés permiso para ver este turno' },
          403
        );
      }

      return AuthPresenter.success(res, { appointment: appointment.toPrimitives() }, 200);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error al obtener el turno');
    }
  };

  cancel = async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const reason = req.body.reason;

      const result = await this.cancelAppointment.execute(
        String(req.params.id),
        authReq.user!._id,
        authReq.user!.kind,
        reason
      );
      return AuthPresenter.success(res, result, 200);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error al cancelar el turno');
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const result = await this.updateAppointmentStatus.execute(String(req.params.id), req.body);
      return AuthPresenter.success(res, result, 200);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error al actualizar el estado del turno');
    }
  };
}
