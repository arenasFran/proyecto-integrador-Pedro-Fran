import { Request, Response } from 'express';
import { GetAvailableSlotsUseCase } from '../../../application/use-cases/barber/GetAvailableSlotsUseCase';
import { DeleteBarberUseCase } from '../../../application/use-cases/barber/DeleteBarberUseCase';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { BcryptPasswordHasher } from '../../../infrastructure/services/BcryptPasswordHasher';
import { Barber } from '../../../domain/entities/Barber';
import { Email } from '../../../domain/value-objects/Email';
import { Phone } from '../../../domain/value-objects/Phone';
import { Password } from '../../../domain/value-objects/Password';
import { BarberSchedule } from '../../../domain/entities/Barber';
import { sendSuccess, sendError } from '../../../common/response';
import { MongoBarberBlockRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberBlockRepository';
import { AppError } from '../../../domain/errors/AppError';

export class BarberController {
  private toResponse(barber: Barber) {
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
      schedule: barber.schedule as BarberSchedule,
    };
  }

  constructor(
    private readonly barberRepository: MongoBarberRepository,
    private readonly userRepository: MongoUserRepository,
    private readonly passwordHasher: BcryptPasswordHasher,
    private readonly getAvailableSlots: GetAvailableSlotsUseCase,
    private readonly deleteBarber: DeleteBarberUseCase,
    private readonly blockRepository: MongoBarberBlockRepository
  ) {}

  getAllPublic = async (_req: Request, res: Response) => {
    try {
      const barbers = await this.barberRepository.findAllBarbers();
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
      const dto = req.body;
      const email = Email.create(dto.email).getValue();
      const phone = Phone.create(dto.phone).getValue();
      Password.create(dto.password);

      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new AppError('Email en uso.', 409);
      }

      const existingPhone = await this.userRepository.findByPhone(phone);
      if (existingPhone) {
        throw new AppError('Teléfono en uso.', 409);
      }

      const passwordHash = await this.passwordHasher.hash(dto.password);

      const barber = Barber.create({
        id: '',
        email,
        name: dto.name,
        lastname: dto.lastname,
        phone,
        kind: 'Empleado',
        services: dto.services || [],
        age: dto.age,
        photoUrl: dto.photoUrl ?? null,
        isActive: true,
        slotDuration: dto.slotDuration ?? 30,
        maxAdvanceDays: dto.maxAdvanceDays ?? 30,
        schedule: dto.schedule,
        passwordHash,
      });

      const created = await this.barberRepository.createBarber(barber);
      return sendSuccess(res, this.toResponse(created), 201);
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
      const current = await this.barberRepository.findBarberById(barberId);
      if (!current) {
        throw new AppError('Barbero no encontrado.', 404);
      }

      const dto = req.body;
      const update: {
        email?: string;
        name?: string;
        lastname?: string;
        phone?: string;
        services?: string[];
        age?: number | null;
        photoUrl?: string | null;
        isActive?: boolean;
        slotDuration?: number;
        maxAdvanceDays?: number;
        passwordHash?: string;
      } = {};

      if (dto.email) {
        const email = Email.create(dto.email).getValue();
        const existing = await this.userRepository.findByEmail(email);
        if (existing && existing.id !== current.id) {
          throw new AppError('Email en uso.', 409);
        }
        update.email = email;
      }

      if (dto.phone) {
        const phone = Phone.create(dto.phone).getValue();
        const existing = await this.userRepository.findByPhone(phone);
        if (existing && existing.id !== current.id) {
          throw new AppError('Teléfono en uso.', 409);
        }
        update.phone = phone;
      }

      if (dto.password) {
        Password.create(dto.password);
        update.passwordHash = await this.passwordHasher.hash(dto.password);
      }

      if (dto.name) update.name = dto.name;
      if (dto.lastname) update.lastname = dto.lastname;
      if (dto.services) update.services = dto.services;
      if (dto.age !== undefined) update.age = dto.age;
      if (dto.photoUrl !== undefined) update.photoUrl = dto.photoUrl;
      if (dto.isActive !== undefined) update.isActive = dto.isActive;
      if (dto.slotDuration !== undefined) update.slotDuration = dto.slotDuration;
      if (dto.maxAdvanceDays !== undefined) update.maxAdvanceDays = dto.maxAdvanceDays;

      const updated = await this.barberRepository.updateBarber(barberId, update);
      if (!updated) {
        throw new AppError('Barbero no encontrado.', 404);
      }

      return sendSuccess(res, this.toResponse(updated), 200);
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
      const { schedule: scheduleData, ...profileData } = req.body;

      const updated = await this.barberRepository.updateBarber(id, profileData);

      if (scheduleData && updated) {
        await this.barberRepository.updateSchedule(id, scheduleData);
      }

      if (!updated) {
        throw new AppError('Barbero no encontrado.', 404);
      }

      return sendSuccess(res, this.toResponse(updated), 200);
    } catch (error) {
      return sendError(res, error, 'Error al actualizar perfil');
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

      if (req.user?.kind !== 'Admin' && id !== req.user?._id) {
        throw new AppError('No podés bloquear el horario de otro barbero.', 403);
      }

      const { date, startTime, endTime } = req.body;

      const block = await this.blockRepository.create({
        barberId: id,
        date,
        startTime,
        endTime,
        createdBy: req.user?._id,
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
}

