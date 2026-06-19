import { Request, Response } from 'express';
import { GetCurrentUserUseCase } from '../../../application/use-cases/user/GetCurrentUserUseCase';
import { UpdateUserUseCase } from '../../../application/use-cases/user/UpdateUserUseCase';
import { AuthPresenter } from '../../presenters/AuthPresenter';

export class UserController {
  constructor(
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly updateUser: UpdateUserUseCase
  ) {}

  getMe = async (req: Request, res: Response) => {
    try {
      const user = await this.getCurrentUser.execute(req.user!._id);
      return AuthPresenter.success(res, {
        id: user.id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone || '',
        kind: user.kind,
        photoUrl: user.photoUrl ?? null,
      });
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error al obtener perfil');
    }
  };

  updateMe = async (req: Request, res: Response) => {
    try {
      const user = await this.updateUser.execute(req.user!._id, req.body);
      return AuthPresenter.success(res, {
        id: user.id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone || '',
        kind: user.kind,
        photoUrl: user.photoUrl ?? null,
      });
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error al actualizar perfil');
    }
  };
}
