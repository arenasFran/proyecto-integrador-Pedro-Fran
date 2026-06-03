import { Request, Response } from 'express';
import { CreateEmployeeBarberUseCase } from '../../../application/use-cases/barber/CreateEmployeeBarberUseCase';
import { DeleteBarberUseCase } from '../../../application/use-cases/barber/DeleteBarberUseCase';
import { GetAllEmployeesUseCase } from '../../../application/use-cases/barber/GetAllEmployeesUseCase';
import { GetAvailableSlotsUseCase } from '../../../application/use-cases/barber/GetAvailableSlotsUseCase';
import { GetBarberByIdUseCase } from '../../../application/use-cases/barber/GetBarberByIdUseCase';
import { GetBarberScheduleUseCase } from '../../../application/use-cases/barber/GetBarberScheduleUseCase';
import { UpdateBarberScheduleUseCase } from '../../../application/use-cases/barber/UpdateBarberScheduleUseCase';
import { UpdateBarberUseCase } from '../../../application/use-cases/barber/UpdateBarberUseCase';
import { BarberPresenter } from '../../presenters/BarberPresenter';

export class BarberController {
  constructor(
    private readonly createBarber: CreateEmployeeBarberUseCase,
    private readonly getAllBarbers: GetAllEmployeesUseCase,
    private readonly getBarberById: GetBarberByIdUseCase,
    private readonly updateBarber: UpdateBarberUseCase,
    private readonly deleteBarber: DeleteBarberUseCase,
    private readonly getBarberSchedule: GetBarberScheduleUseCase,
    private readonly updateBarberSchedule: UpdateBarberScheduleUseCase,
    private readonly getAvailableSlots: GetAvailableSlotsUseCase
  ) {}

  create = async (req: Request, res: Response) => {
    try {
      const result = await this.createBarber.execute(req.body);
      return BarberPresenter.success(res, result, 201);
    } catch (error) {
      return BarberPresenter.handleError(res, error, 'Error al crear el barbero');
    }
  };

  getAll = async (_req: Request, res: Response) => {
    try {
      const result = await this.getAllBarbers.execute();
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
