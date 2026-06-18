import { Request, Response } from 'express';
import { GetCurrentUserUseCase } from '../../../application/use-cases/user/GetCurrentUserUseCase';
import { sendSuccess, sendError } from '../../../common/response';

export class UserController {
  constructor(private readonly getCurrentUser: GetCurrentUserUseCase) {}

  getMe = async (req: Request, res: Response) => {
    try {
      const user = await this.getCurrentUser.execute(req.user!._id);
      return sendSuccess(res, {
        id: user.id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone || '',
        kind: user.kind,
        photoUrl: null,
      });
    } catch (error) {
      return sendError(res, error, 'Error al obtener perfil');
    }
  };
}
