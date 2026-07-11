import { Request, Response } from 'express';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { BcryptPasswordHasher } from '../../../infrastructure/services/BcryptPasswordHasher';
import { Password } from '../../../domain/value-objects/Password';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';

export class UserController {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly passwordHasher?: BcryptPasswordHasher
  ) {}

  getMe = async (req: Request, res: Response) => {
    try {
      const user = await this.userRepository.findById(req.user!._id);
      if (!user) {
        throw new AppError('Usuario no encontrado.', 404);
      }
      return sendSuccess(res, {
        id: user.id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone || '',
        kind: user.kind,
        photoUrl: user.photoUrl ?? null,
      });
    } catch (error) {
      return sendError(res, error, 'Error al obtener perfil');
    }
  };

  updateMe = async (req: Request, res: Response) => {
    try {
      const dto = { ...req.body };

      if (dto.password) {
        Password.create(dto.password);
        dto.passwordHash = await this.passwordHasher!.hash(dto.password);
        delete dto.password;
      }

      const updated = await this.userRepository.update(req.user!._id, dto);
      if (!updated) {
        throw new AppError('Usuario no encontrado.', 404);
      }
      return sendSuccess(res, {
        id: updated.id,
        name: updated.name,
        lastname: updated.lastname,
        email: updated.email,
        phone: updated.phone || '',
        kind: updated.kind,
        photoUrl: updated.photoUrl ?? null,
      });
    } catch (error) {
      return sendError(res, error, 'Error al actualizar perfil');
    }
  };

  getClients = async (_req: Request, res: Response) => {
    try {
      const clients = await this.userRepository.findRegisteredClients();
      return sendSuccess(res, { clients: clients.map((c) => ({
        id: c.id,
        name: c.name,
        lastname: c.lastname,
        email: c.email,
        phone: c.phone || '',
        photoUrl: c.photoUrl ?? null,
      })) });
    } catch (error) {
      return sendError(res, error, 'Error al listar clientes');
    }
  };
}


