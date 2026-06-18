import { Request, Response } from 'express';
import { CreateBarberUseCase } from '../../../application/use-cases/barber/CreateBarberUseCase';
import { DeactivateBarberUseCase } from '../../../application/use-cases/barber/DeactivateBarberUseCase';
import { DeleteBarberUseCase } from '../../../application/use-cases/barber/DeleteBarberUseCase';
import { GetAllBarbersUseCase } from '../../../application/use-cases/barber/GetAllBarbersUseCase';
import { GetAvailableSlotsUseCase } from '../../../application/use-cases/barber/GetAvailableSlotsUseCase';
import { GetBarberByIdUseCase } from '../../../application/use-cases/barber/GetBarberByIdUseCase';
import { GetBarberScheduleUseCase } from '../../../application/use-cases/barber/GetBarberScheduleUseCase';
import { UpdateBarberScheduleUseCase } from '../../../application/use-cases/barber/UpdateBarberScheduleUseCase';
import { UpdateBarberUseCase } from '../../../application/use-cases/barber/UpdateBarberUseCase';
import { sendSuccess, sendError } from '../../../common/response';

export class BarberController {
  constructor(
    private readonly createBarber: CreateBarberUseCase,
    private readonly getAllBarbers: GetAllBarbersUseCase,
    private readonly getBarberById: GetBarberByIdUseCase,
    private readonly updateBarber: UpdateBarberUseCase,
    private readonly deleteBarber: DeleteBarberUseCase,
    private readonly deactivateBarber: DeactivateBarberUseCase,
    private readonly getBarberSchedule: GetBarberScheduleUseCase,
    private readonly updateBarberSchedule: UpdateBarberScheduleUseCase,
    private readonly getAvailableSlots: GetAvailableSlotsUseCase
  ) {}

  getAllPublic = async (_req: Request, res: Response) => {
    try {
      const barbers = await this.getAllBarbers.execute();
      const publicBarbers = barbers
        .filter((b) => b.isActive)
        .map((b) => ({
          id: b.id,
          name: b.name,
          lastname: b.lastname,
          services: b.services,
          photoUrl: b.photoUrl,
          isActive: b.isActive,
          slotDuration: b.slotDuration,
          maxAdvanceDays: b.maxAdvanceDays,
        }));
      return sendSuccess(res, { barbers: publicBarbers }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener barberos');
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const result = await this.createBarber.execute(req.body);
      return sendSuccess(res, result, 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear el barbero');
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const result = await this.getAllBarbers.execute();
      const isAdmin = req.user?.kind === 'Admin';
      const filtered = isAdmin
        ? result
        : result.filter((b) => b.kind !== 'Admin' && b.isActive);
      return sendSuccess(res, { barbers: filtered }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener barberos');
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const result = await this.getBarberById.execute(id);
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener barbero');
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const result = await this.updateBarber.execute(id, req.body);
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al actualizar barbero');
    }
  };

  deactivate = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const result = await this.deactivateBarber.execute(id);
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al desactivar barbero');
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const result = await this.deleteBarber.execute(id);
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al eliminar barbero');
    }
  };

  getSchedule = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const schedule = await this.getBarberSchedule.execute(id);
      return sendSuccess(res, { schedule }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener el horario');
    }
  };

  updateSchedule = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const schedule = await this.updateBarberSchedule.execute(id, req.body);
      return sendSuccess(res, { schedule }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al actualizar el horario');
    }
  };

  getSlots = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const date = String(req.query.date || '');
      const result = await this.getAvailableSlots.execute(id, date);
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener los slots');
    }
  };
}
