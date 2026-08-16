import { Request, Response } from 'express';
import { CancelAppointmentUseCase } from '../../../application/use-cases/appointment/CancelAppointmentUseCase';
import { ChangeBarberUseCase } from '../../../application/use-cases/appointment/ChangeBarberUseCase';
import { CreateAppointmentUseCase } from '../../../application/use-cases/appointment/CreateAppointmentUseCase';
import { RescheduleAppointmentUseCase } from '../../../application/use-cases/appointment/RescheduleAppointmentUseCase';
import { SendReminderUseCase } from '../../../application/use-cases/appointment/SendReminderUseCase';
import { UpdateAppointmentStatusUseCase } from '../../../application/use-cases/appointment/UpdateAppointmentStatusUseCase';
import { UpdatePaymentStatusUseCase } from '../../../application/use-cases/appointment/UpdatePaymentStatusUseCase';
import { sendError, sendSuccess } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';
import type { AppointmentStatus, PaymentStatus } from '../../../domain/types/appointment';
import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoClientRepository } from '../../../infrastructure/repositories/mongodb/MongoClientRepository';

export class AppointmentController {
  constructor(
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly barberRepository: MongoBarberRepository,
    private readonly clientRepository: MongoClientRepository,
    private readonly createAppointment: CreateAppointmentUseCase,
    private readonly cancelAppointment: CancelAppointmentUseCase,
    private readonly updateAppointmentStatus: UpdateAppointmentStatusUseCase,
    private readonly rescheduleAppointment: RescheduleAppointmentUseCase,
    private readonly updatePaymentStatus: UpdatePaymentStatusUseCase,
    private readonly sendReminder: SendReminderUseCase,
    private readonly changeBarberUseCase: ChangeBarberUseCase
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
        // Sin sesión: nunca confiar en un clientId enviado por el cliente
        // (evitaría IDOR sobre turnos/membresías de terceros, ver auditoría 2026-07-09).
        body.clientId = undefined;
        body.createdBy = { type: 'anonymous' };
      }

      const result = await this.createAppointment.execute(body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear el turno');
    }
  };

  searchClients = async (req: Request, res: Response) => {
    try {
      const q = req.query.q as string;
      const clients = await this.clientRepository.searchRegistered(q);
      return sendSuccess(res, clients.map((c) => ({
        id: c.id,
        name: c.name,
        lastname: c.lastname,
        phone: c.phone,
        contactEmail: c.contactEmail,
        photoUrl: c.photoUrl,
      })));
    } catch (error) {
      return sendError(res, error, 'Error al buscar clientes');
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const query: { barberId?: string; clientId?: string; date?: string; dateFrom?: string; dateTo?: string; status?: AppointmentStatus; paymentMethod?: string; paymentStatus?: PaymentStatus; searchTerm?: string; page?: number; limit?: number; sortBy?: 'date' | 'startTime'; sortDir?: 'asc' | 'desc' } = {};

      if (req.user?.kind === 'Admin') {
        if (req.query.barberId) query.barberId = req.query.barberId as string;
        if (req.query.clientId) query.clientId = req.query.clientId as string;
      } else if (req.user?.kind === 'Empleado') {
        // El barbero solo ve los turnos propios: ignorar cualquier barberId enviado.
        query.barberId = req.user._id;
        if (req.query.clientId) query.clientId = req.query.clientId as string;
      } else {
        query.clientId = req.user?._id;
      }

      if (req.query.date) query.date = req.query.date as string;
      if (req.query.dateFrom) query.dateFrom = req.query.dateFrom as string;
      if (req.query.dateTo) query.dateTo = req.query.dateTo as string;
      if (req.query.status) query.status = req.query.status as AppointmentStatus;
      if (req.query.paymentMethod) query.paymentMethod = req.query.paymentMethod as string;
      if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus as PaymentStatus;
      if (req.query.searchTerm) query.searchTerm = req.query.searchTerm as string;
      if (req.query.sortBy === 'date' || req.query.sortBy === 'startTime') query.sortBy = req.query.sortBy;
      if (req.query.sortDir === 'asc' || req.query.sortDir === 'desc') query.sortDir = req.query.sortDir;

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

      if (req.query.includeClient === 'true') {
        const clientIds = [...new Set(appointments.map((a) => a.clientId).filter((id): id is string => !!id))];
        const clients = await this.clientRepository.findByIds(clientIds);
        const clientMap = new Map(clients.map((c) => [c.id, { photoUrl: c.photoUrl, registeredAt: c.registeredAt }]));
        appointments = appointments.map((a) => ({
          ...a,
          clientPhotoUrl: a.clientId ? clientMap.get(a.clientId)?.photoUrl ?? undefined : undefined,
          clientRegisteredAt: a.clientId ? clientMap.get(a.clientId)?.registeredAt ?? undefined : undefined,
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

  getSummary = async (req: Request, res: Response) => {
    try {
      const query: { barberId?: string; clientId?: string; date?: string; dateFrom?: string; dateTo?: string; status?: AppointmentStatus; paymentMethod?: string; paymentStatus?: PaymentStatus; searchTerm?: string } = {};

      if (req.user?.kind === 'Admin') {
        if (req.query.barberId) query.barberId = req.query.barberId as string;
        if (req.query.clientId) query.clientId = req.query.clientId as string;
      } else if (req.user?.kind === 'Empleado') {
        query.barberId = req.user._id;
        if (req.query.clientId) query.clientId = req.query.clientId as string;
      } else {
        query.clientId = req.user?._id;
      }

      if (req.query.date) query.date = req.query.date as string;
      if (req.query.dateFrom) query.dateFrom = req.query.dateFrom as string;
      if (req.query.dateTo) query.dateTo = req.query.dateTo as string;
      if (req.query.status) query.status = req.query.status as AppointmentStatus;
      if (req.query.paymentMethod) query.paymentMethod = req.query.paymentMethod as string;
      if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus as PaymentStatus;
      if (req.query.searchTerm) query.searchTerm = req.query.searchTerm as string;

      const result = await this.appointmentRepository.getSummary(query as any);

      return sendSuccess(res, {
        total: result.total,
        countsByStatus: result.byStatus,
      }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener resumen de turnos');
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
      const isAdmin = req.user!.kind === 'Admin';
      const isBarberOwner = req.user!.kind === 'Empleado' && appointment.barberId === req.user!._id;
      if (!isOwner && !isAdmin && !isBarberOwner) {
        throw new AppError('No tenés permiso para ver este turno.', 403);
      }

      let result = appointment.toPrimitives();

      if (req.query.includeBarber === 'true') {
        const barbers = await this.barberRepository.findAllBarbers();
        const barberMap = new Map(barbers.map((b) => [b.id, { name: b.name, lastname: b.lastname, photoUrl: b.photoUrl }]));
        const barber = barberMap.get(result.barberId);
        if (barber) {
          (result as any).barberName = `${barber.name} ${barber.lastname}`;
          (result as any).barberPhotoUrl = barber.photoUrl ?? undefined;
        }
      }

      if (req.query.includeClient === 'true' && result.clientId) {
        const clients = await this.clientRepository.findByIds([result.clientId]);
        const client = clients[0];
        if (client) {
          (result as any).clientPhotoUrl = client.photoUrl ?? undefined;
          (result as any).clientKind = client.kind;
          (result as any).clientRegisteredAt = client.registeredAt instanceof Date ? client.registeredAt.toISOString() : client.registeredAt;
        }
      }

      return sendSuccess(res, { appointment: result }, 200);
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
      const clientEmail = req.query.email as string;
      const clientPhone = req.query.phone as string;
      const date = req.query.date as string | undefined;

      // Ownership: exigir email Y teléfono (no uno solo) para evitar que alcance
      // con un solo dato filtrado/adivinado para ver turnos ajenos.
      const appointments = await this.appointmentRepository.findByContact(clientEmail, clientPhone);
      const filtered = date ? appointments.filter((a) => a.date === date) : appointments;

      return sendSuccess(res, { appointments: filtered.map((a) => a.toPrimitives()) }, 200);
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

  markAsPaid = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const result = await this.updatePaymentStatus.execute(
        id,
        req.user!._id,
        req.user!.kind
      );
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al registrar el pago');
    }
  };

  sendReminderEmail = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const result = await this.sendReminder.execute(
        id,
        req.user!._id,
        req.user!.kind
      );
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al enviar recordatorio');
    }
  };

  changeBarberHandler = async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { barberId } = req.body;
      const result = await this.changeBarberUseCase.execute(
        id,
        barberId,
        req.user!._id,
        req.user!.kind
      );
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al cambiar el barbero');
    }
  };
}


