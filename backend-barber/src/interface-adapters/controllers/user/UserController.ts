import { Request, Response } from 'express';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { UpdateUserProfileUseCase } from '../../../application/use-cases/user/UpdateUserProfileUseCase';
import { ChangePasswordUseCase } from '../../../application/use-cases/user/ChangePasswordUseCase';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';
import { IEmailService } from '../../../application/ports/IEmailService';

export class UserController {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly emailService: IEmailService,
    private readonly updateUserProfile: UpdateUserProfileUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase
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
      const currentPassword = dto.currentPassword;
      delete dto.currentPassword;

      const { user: updated, oldEmail } = await this.updateUserProfile.execute(req.user!._id, {
        ...dto,
        currentPassword,
      });

      if (oldEmail) {
        this.emailService
          .sendMail({
            to: oldEmail,
            subject: 'El email de tu cuenta fue actualizado',
            html: `<p>El email de tu cuenta se cambió a ${updated.email}.</p><p>Si no fuiste vos, contactanos de inmediato.</p>`,
          })
          .catch((error) => {
            console.error('Error enviando email de cambio de email:', error);
          });
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

  changePassword = async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword, newPasswordConfirmation } = req.body;

      const { email } = await this.changePasswordUseCase.execute({
        userId: req.user!._id,
        currentPassword,
        newPassword,
        newPasswordConfirmation,
      });

      this.emailService
        .sendMail({
          to: email,
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


