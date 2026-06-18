import { Request, Response } from 'express';
import { GetAvailableSlotsUseCase } from '../../../application/use-cases/barber/GetAvailableSlotsUseCase';
import { MongoBarberRepository } from '../../../infrastructure/repositories/mongodb/MongoBarberRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoAppointmentRepository } from '../../../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoTempLockRepository } from '../../../infrastructure/repositories/mongodb/MongoTempLockRepository';
import { BcryptPasswordHasher } from '../../../infrastructure/services/BcryptPasswordHasher';
import { NodemailerEmailService } from '../../../infrastructure/services/NodemailerEmailService';
import { Barber } from '../../../domain/entities/Barber';
import { Email } from '../../../domain/value-objects/Email';
import { Phone } from '../../../domain/value-objects/Phone';
import { Password } from '../../../domain/value-objects/Password';
import { toBarberResponse } from '../../../application/dto/barber/BarberResponseDTO';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../application/errors/AppError';

export class BarberController {
  constructor(
    private readonly barberRepository: MongoBarberRepository,
    private readonly userRepository: MongoUserRepository,
    private readonly appointmentRepository: MongoAppointmentRepository,
    private readonly tempLockRepository: MongoTempLockRepository,
    private readonly passwordHasher: BcryptPasswordHasher,
    private readonly emailService: NodemailerEmailService,
    private readonly getAvailableSlots: GetAvailableSlotsUseCase
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
      return sendSuccess(res, toBarberResponse(created), 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear el barbero');
    }
  };

  getAll = async (req: Request, res: Response) => {
    try {
      const barbers = await this.barberRepository.findAllBarbers();
      const isAdmin = req.user?.kind === 'Admin';
      const filtered = isAdmin
        ? barbers
        : barbers.filter((b) => b.kind !== 'Admin' && b.isActive);
      return sendSuccess(res, { barbers: filtered.map((b) => toBarberResponse(b)) }, 200);
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
      return sendSuccess(res, toBarberResponse(result), 200);
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

      return sendSuccess(res, toBarberResponse(updated), 200);
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
      const barber = await this.barberRepository.findBarberById(barberId);
      if (!barber) {
        throw new AppError('Barbero no encontrado.', 404);
      }

      await this.barberRepository.deactivateBarber(barberId);
      await this.tempLockRepository.deleteMany({ barberId });

      const futureAppointments = await this.appointmentRepository.findMany({
        barberId,
        dateFrom: new Date().toISOString().split('T')[0],
      });

      for (const apt of futureAppointments) {
        if (apt.status === 'Confirmado') {
          await this.appointmentRepository.updateStatus(apt.id, {
            status: 'Cancelado',
            cancelReason: 'Barbero dado de baja',
            cancelledAt: new Date(),
          });

          const clientEmail = apt.clientEmail;
          if (clientEmail) {
            this.emailService
              .sendMail({
                to: clientEmail,
                subject: 'Cancelación por baja de barbero',
                html: `<p>Tu turno del ${apt.date} a las ${apt.startTime} fue cancelado porque el barbero ${barber.name} ${barber.lastname} ya no está disponible.</p>`,
              })
              .catch((error: unknown) => {
                console.error('Error enviando email de baja:', error);
              });
          }
        }
      }

      return sendSuccess(res, { message: 'Barbero desactivado exitosamente' }, 200);
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