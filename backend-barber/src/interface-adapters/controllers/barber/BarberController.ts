import { Request, Response } from 'express';
import { GetAvailableSlotsUseCase } from '../../../application/use-cases/barber/GetAvailableSlotsUseCase';
import { DeleteBarberUseCase } from '../../../application/use-cases/barber/DeleteBarberUseCase';
import { CreateBarberUseCase } from '../../../application/use-cases/barber/CreateBarberUseCase';
import { UpdateBarberUseCase } from '../../../application/use-cases/barber/UpdateBarberUseCase';
import { UpdateBarberMeUseCase, UpdateBarberMeResult } from '../../../application/use-cases/barber/UpdateBarberMeUseCase';
import { GetBarberOccupancyUseCase } from '../../../application/use-cases/barber/GetBarberOccupancyUseCase';
import { CreateBarberBlockUseCase } from '../../../application/use-cases/barber/CreateBarberBlockUseCase';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { Barber, BarberSchedule, BarberProps } from '../../../domain/entities/Barber';
import { sendSuccess, sendError } from '../../../common/response';
import { MongoBarberBlockRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberBlockRepository';
import { AppError } from '../../../domain/errors/AppError';
import { IEmailService } from '../../../application/ports/IEmailService';
import { getNowInTimezone } from '../../../domain/utils/time';

const buildBookingDateRange = (maxAdvanceDays: number): string[] => {
  const { date: today } = getNowInTimezone();
  const currentDate = new Date(`${today}T12:00:00Z`);
  const dates: string[] = [];

  for (let offset = 0; offset <= maxAdvanceDays; offset += 1) {
    const date = new Date(currentDate);
    date.setUTCDate(currentDate.getUTCDate() + offset);
    dates.push(date.toISOString().slice(0, 10));
  }

  return dates;
};

export class BarberController {
  private toResponse(barber: Barber) {
    return this.toResponseProps(barber.toPrimitives());
  }
  private toResponseProps(barber: BarberProps) {
    return {
      id: barber.id,
      name: barber.name,
      lastname: barber.lastname,
      email: barber.email,
      phone: barber.phone,
      kind: barber.kind,
      services: barber.services,
      age: barber.age,
      photoUrl: barber.photoUrl ?? null,
      isActive: barber.isActive,
      slotDuration: barber.slotDuration,
      maxAdvanceDays: barber.maxAdvanceDays,
      schedule: barber.schedule,
    };
  }

  constructor(
    private readonly barberRepository: MongoBarberRepository,
    private readonly getAvailableSlots: GetAvailableSlotsUseCase,
    private readonly deleteBarber: DeleteBarberUseCase,
    private readonly blockRepository: MongoBarberBlockRepository,
    private readonly emailService: IEmailService,
    private readonly createBarber: CreateBarberUseCase,
    private readonly updateBarber: UpdateBarberUseCase,
    private readonly updateBarberMe: UpdateBarberMeUseCase,
    private readonly getBarberOccupancy: GetBarberOccupancyUseCase,
    private readonly createBarberBlock: CreateBarberBlockUseCase
  ) {}

  private async hasBookableSlot(barber: Barber): Promise<boolean> {
    const dates = buildBookingDateRange(barber.maxAdvanceDays);

    for (const date of dates) {
      const result = await this.getAvailableSlots.execute(barber.id, date);
      if (result.slots.length > 0) return true;
    }

    return false;
  }

  getAllPublic = async (_req: Request, res: Response) => {
    try {
      const barbers = await this.barberRepository.findAllBarbers();
      const activeBarbers = barbers.filter((b) => b.isActive);
      const availabilityResults = await Promise.allSettled(
        activeBarbers.map(async (barber) => ({
          barber,
          hasBookableSlot: await this.hasBookableSlot(barber),
        }))
      );
      const availability = availabilityResults.flatMap((result, index) => {
        if (result.status === 'fulfilled') return [result.value];
        console.error(`[BarberController] No se pudo consultar disponibilidad de ${activeBarbers[index].id}:`, result.reason);
        return [];
      });

      if (activeBarbers.length > 0 && availability.length === 0) {
        throw new Error('No se pudo consultar la disponibilidad de los barberos');
      }

      const publicBarbers = availability
        .filter(({ hasBookableSlot }) => hasBookableSlot)
        .map(({ barber: b }) => ({
          id: b.id,
          name: b.name,
          lastname: b.lastname,
          services: b.services,
          photoUrl: b.photoUrl,
          isActive: b.isActive,
          slotDuration: b.slotDuration,
          maxAdvanceDays: b.maxAdvanceDays,
          schedule: b.schedule as BarberSchedule,
        }));
      return sendSuccess(res, { barbers: publicBarbers }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener barberos');
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const result = await this.createBarber.execute(req.body);
      return sendSuccess(res, this.toResponseProps(result), 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear el barbero');
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      if (req.user?.kind === 'Admin' && page !== undefined && limit !== undefined) {
        const search = req.query.search as string | undefined;
        const result = await this.barberRepository.findAllBarbersPaginated(page, limit, search);
        return sendSuccess(res, {
          barbers: result.data.map((b) => this.toResponse(b)),
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: result.limit,
        }, 200);
      }

      const barbers = await this.barberRepository.findAllBarbers();
      const isAdmin = req.user?.kind === 'Admin';
      const filtered = isAdmin
        ? barbers
        : barbers.filter((b) => b.kind !== 'Admin' && b.isActive);
      return sendSuccess(res, { barbers: filtered.map((b) => this.toResponse(b)) }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener barberos');
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const result = await this.barberRepository.findBarberById(id);
      if (!result) {
        throw new AppError('Barbero no encontrado.', 404);
      }
      return sendSuccess(res, this.toResponse(result), 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener barbero');
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const barberId = String(req.params.id);
      const result = await this.updateBarber.execute(barberId, req.body);
      return sendSuccess(res, this.toResponseProps(result), 200);
    } catch (error) {
      return sendError(res, error, 'Error al actualizar barbero');
    }
  };

  deactivate = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const barber = await this.barberRepository.findBarberById(id);
      if (!barber) {
        throw new AppError('Barbero no encontrado.', 404);
      }
      await this.barberRepository.deactivateBarber(id);
      return sendSuccess(res, { message: 'Barbero desactivado' }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al desactivar barbero');
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const barberId = String(req.params.id);
      const result = await this.deleteBarber.execute(barberId);
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al eliminar barbero');
    }
  };

  getSchedule = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const barber = await this.barberRepository.findBarberById(id);
      if (!barber) {
        throw new AppError('Barbero no encontrado.', 404);
      }
      return sendSuccess(res, { schedule: barber.schedule }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener el horario');
    }
  };

  updateSchedule = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const updated = await this.barberRepository.updateSchedule(id, req.body);
      if (!updated) {
        throw new AppError('Barbero no encontrado.', 404);
      }
      return sendSuccess(res, { schedule: updated.schedule }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al actualizar el horario');
    }
  };

  updateMe = async (req: Request, res: Response) => {
    try {
      const id = req.user!._id;
      const { oldEmail, barber } = await this.updateBarberMe.execute(id, req.body);

      if (oldEmail) {
        this.emailService
          .sendMail({
            to: oldEmail,
            subject: 'El email de tu cuenta fue actualizado',
            html: `<p>El email de tu cuenta se cambió a ${barber.email}.</p><p>Si no fuiste vos, contactanos de inmediato.</p>`,
          })
          .catch((error) => {
            console.error('Error enviando email de cambio de email:', error);
          });
      }

      return sendSuccess(res, this.toResponseProps(barber), 200);
    } catch (error) {
      return sendError(res, error, 'Error al actualizar perfil');
    }
  };

  getSlots = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const date = String(req.query.date || '');
      const excludeAppointmentId = req.query.excludeAppointmentId as string | undefined;
      const result = await this.getAvailableSlots.execute(id, date, excludeAppointmentId);
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener los slots');
    }
  };

  getBlocks = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const { dateFrom, dateTo } = req.query as { dateFrom: string; dateTo: string };
      const blocks = await this.blockRepository.findByBarberAndDateRange(id, dateFrom, dateTo);
      return sendSuccess(res, { blocks }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener bloques');
    }
  };

  createBlock = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const { date, startTime, endTime } = req.body;

      const block = await this.createBarberBlock.execute({
        barberId: id,
        date,
        startTime,
        endTime,
        actorId: req.user?._id,
        actorKind: req.user?.kind,
      });

      return sendSuccess(res, { block }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear bloque');
    }
  };

  getAllBlocks = async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo } = req.query as { dateFrom: string; dateTo: string };
      const blocks = await this.blockRepository.findByDateRange(dateFrom, dateTo);
      return sendSuccess(res, { blocks }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener bloques');
    }
  };

  deleteBlock = async (req: Request, res: Response) => {
    try {
      const blockId = String(req.params.blockId);

      const block = await this.blockRepository.findById(blockId);
      if (!block) {
        throw new AppError('Bloque no encontrado.', 404);
      }

      const isAdmin = req.user?.kind === 'Admin';
      const isOwner = req.user?._id === block.createdBy;
      const isSelfBarber = block.barberId === req.user?._id;

      if (!isAdmin && !isOwner && !isSelfBarber) {
        throw new AppError('No tenés permiso para eliminar este bloque.', 403);
      }

      await this.blockRepository.deleteById(blockId);
      return sendSuccess(res, { message: 'Bloque eliminado' }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al eliminar bloque');
    }
  };

  getOccupancy = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const date = String(req.query.date || '');

      const result = await this.getBarberOccupancy.execute({ barberId: id, date });

      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al obtener ocupación');
    }
  };
}

