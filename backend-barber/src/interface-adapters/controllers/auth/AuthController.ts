import { Request, Response } from 'express';
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/RefreshTokenUseCase';
import { RegisterUserUseCase } from '../../../application/use-cases/auth/RegisterUserUseCase';
import { AuthPresenter } from '../../presenters/AuthPresenter';
import { setRefreshCookie, clearRefreshCookie } from './TwoFactorController';

function getRefreshTokenFromReq(req: Request): string | null {
  if (req.body?.refreshToken) return req.body.refreshToken;
  if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)refreshToken=([^;]*)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
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

  refresh = async (req: Request, res: Response) => {
    try {
      const refreshToken = getRefreshTokenFromReq(req);
      if (!refreshToken) {
        return res.status(400).json({ error: 'refreshToken es requerido' });
      }
      const result = await this.refreshTokenUseCase.execute(refreshToken);
      if ('refreshToken' in result) {
        setRefreshCookie(res, (result as { refreshToken: string }).refreshToken);
      }
      return AuthPresenter.success(res, result, 200);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error al renovar el token');
    }
  };

  logout = async (_req: Request, res: Response) => {
    clearRefreshCookie(res);
    return AuthPresenter.success(res, { message: 'Sesión cerrada exitosamente' }, 200);
  };
}
