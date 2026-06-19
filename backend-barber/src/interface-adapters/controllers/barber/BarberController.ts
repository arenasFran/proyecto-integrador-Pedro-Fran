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
import { BarberPresenter } from '../../presenters/BarberPresenter';
import { AuthKind } from '../../../domain/types/auth';

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
      return BarberPresenter.success(res, { barbers: publicBarbers }, 200);
    } catch (error) {
      return BarberPresenter.handleError(res, error, 'Error al obtener barberos');
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const result = await this.createBarber.execute(req.body);
      return BarberPresenter.success(res, result, 201);
    } catch (error) {
      return BarberPresenter.handleError(res, error, 'Error al crear el barbero');
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const result = await this.getAllBarbers.execute(req.user?.kind as AuthKind | undefined);
      return BarberPresenter.success(res, { barbers: result }, 200);
    } catch (error) {
      return BarberPresenter.handleError(res, error, 'Error al obtener barberos');
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const result = await this.getBarberById.execute(id);
      return BarberPresenter.success(res, result, 200);
    } catch (error) {
      return BarberPresenter.handleError(res, error, 'Error al obtener barbero');
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const result = await this.updateBarber.execute(id, req.body);
      return BarberPresenter.success(res, result, 200);
    } catch (error) {
      return BarberPresenter.handleError(res, error, 'Error al actualizar barbero');
    }
  };

  deactivate = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const result = await this.deactivateBarber.execute(id);
      return BarberPresenter.success(res, result, 200);
    } catch (error) {
      return BarberPresenter.handleError(res, error, 'Error al desactivar barbero');
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const result = await this.deleteBarber.execute(id);
      return BarberPresenter.success(res, result, 200);
    } catch (error) {
      return BarberPresenter.handleError(res, error, 'Error al eliminar barbero');
    }
  };

  getSchedule = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const schedule = await this.getBarberSchedule.execute(id);
      return BarberPresenter.success(res, { schedule }, 200);
    } catch (error) {
      return BarberPresenter.handleError(res, error, 'Error al obtener el horario');
    }
  };

  updateSchedule = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const schedule = await this.updateBarberSchedule.execute(id, req.body);
      return BarberPresenter.success(res, { schedule }, 200);
    } catch (error) {
      return BarberPresenter.handleError(res, error, 'Error al actualizar el horario');
    }
  };

  updateMe = async (req: Request, res: Response) => {
    try {
      const id = req.user!._id;
      const { schedule: scheduleData, ...profileData } = req.body;

      const updated = await this.updateBarber.execute(id, profileData);

      if (scheduleData) {
        await this.updateBarberSchedule.execute(id, scheduleData);
      }

      return BarberPresenter.success(res, updated, 200);
    } catch (error) {
      return BarberPresenter.handleError(res, error, 'Error al actualizar perfil');
    }
  };

  getSlots = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const date = String(req.query.date || '');
      const result = await this.getAvailableSlots.execute(id, date);
      return BarberPresenter.success(res, result, 200);
    } catch (error) {
      return BarberPresenter.handleError(res, error, 'Error al obtener los slots');
    }
  };
}
