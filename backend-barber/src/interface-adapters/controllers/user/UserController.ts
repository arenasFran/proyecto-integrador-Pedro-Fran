import { Request, Response } from 'express';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../application/errors/AppError';

export class UserController {
  constructor(private readonly userRepository: MongoUserRepository) {}

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
      const updated = await this.userRepository.update(req.user!._id, req.body);
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
}
