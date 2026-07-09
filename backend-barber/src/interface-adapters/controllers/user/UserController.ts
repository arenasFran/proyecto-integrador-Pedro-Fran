import { Request, Response } from 'express';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoRefreshTokenRepository } from '../../../infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { BcryptPasswordHasher } from '../../../infrastructure/services/BcryptPasswordHasher';
import { Password } from '../../../domain/value-objects/Password';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';
import { IEmailService } from '../../../application/ports/IEmailService';

export class UserController {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly passwordHasher: BcryptPasswordHasher,
    private readonly refreshTokenRepository: MongoRefreshTokenRepository,
    private readonly emailService: IEmailService
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
        dto.passwordHash = await this.passwordHasher.hash(dto.password);
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

  changePassword = async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword, newPasswordConfirmation } = req.body;

      if (newPassword !== newPasswordConfirmation) {
        throw new AppError('Las contraseñas nuevas no coinciden.', 400);
      }

      if (newPassword === currentPassword) {
        throw new AppError('La nueva contraseña debe ser diferente a la actual.', 400);
      }

      Password.create(newPassword);

      const user = await this.userRepository.findById(req.user!._id);
      if (!user) {
        throw new AppError('Usuario no encontrado.', 404);
      }

      const isCurrentPasswordValid = await this.passwordHasher.compare(
        currentPassword,
        user.passwordHash!
      );
      if (!isCurrentPasswordValid) {
        throw new AppError('Contraseña actual incorrecta.', 401);
      }

      const newPasswordHash = await this.passwordHasher.hash(newPassword);

      await this.userRepository.updatePassword(req.user!._id, newPasswordHash);
      await this.refreshTokenRepository.revokeAllByUserId(req.user!._id);

      this.emailService
        .sendMail({
          to: user.email,
          subject: 'Tu contraseña fue actualizada',
          html: `<p>Tu contraseña se cambió correctamente.</p><p>Si no fuiste vos, contactanos de inmediato.</p>`,
        })
        .catch((error) => {
          console.error('Error enviando email de cambio de contraseña:', error);
        });

      return sendSuccess(res, { message: 'Contraseña actualizada con éxito.' }, 200);
    } catch (error) {
      return sendError(res, error, 'Error al cambiar la contraseña');
    }
  };
}


