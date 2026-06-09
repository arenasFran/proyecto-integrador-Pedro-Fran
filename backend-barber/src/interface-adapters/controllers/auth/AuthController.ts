import { Request, Response } from 'express';
import { LoginUserUseCase } from '../../../application/use-cases/auth/LoginUserUseCase';
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/RefreshTokenUseCase';
import { RegisterUserUseCase } from '../../../application/use-cases/auth/RegisterUserUseCase';
import { AuthPresenter } from '../../presenters/AuthPresenter';

export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase
  ) {}

  register = async (req: Request, res: Response) => {
    try {
      const result = await this.registerUser.execute(req.body);
      return AuthPresenter.success(res, result, 201);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error al registrar al usuario');
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const result = await this.loginUser.execute(req.body);
      if ('requiresTwoFactor' in result) {
        return AuthPresenter.success(res, result, 200);
      }
      return AuthPresenter.success(res, result, 200);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error interno del servidor.');
    }
  };

  refresh = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'refreshToken es requerido' });
      }
      const result = await this.refreshTokenUseCase.execute(refreshToken);
      return AuthPresenter.success(res, result, 200);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error al renovar el token');
    }
  };
}
