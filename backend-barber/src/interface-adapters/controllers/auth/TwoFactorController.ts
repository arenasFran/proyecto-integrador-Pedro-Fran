import { Request, Response } from 'express';
import { SendTwoFactorCodeUseCase } from '../../../application/use-cases/auth/SendTwoFactorCodeUseCase';
import { VerifyTwoFactorUseCase } from '../../../application/use-cases/auth/VerifyTwoFactorUseCase';
import { AuthPresenter } from '../../presenters/AuthPresenter';

const isProduction = process.env.NODE_ENV === 'production';

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie('refreshToken', { path: '/auth' });
}

export { setRefreshCookie, clearRefreshCookie };

export class TwoFactorController {
  constructor(
    private readonly sendTwoFactorCodeUseCase: SendTwoFactorCodeUseCase,
    private readonly verifyTwoFactorUseCase: VerifyTwoFactorUseCase
  ) {}

  sendTwoFactorCode = async (req: Request, res: Response) => {
    try {
      const result = await this.sendTwoFactorCodeUseCase.execute(req.body);
      return AuthPresenter.success(res, result, 200);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error interno del servidor.');
    }
  };

  verifyTwoFactorCode = async (req: Request, res: Response) => {
    try {
      const result = await this.verifyTwoFactorUseCase.execute(req.body);
      if ('refreshToken' in result) {
        setRefreshCookie(res, (result as { refreshToken: string }).refreshToken);
      }
      return AuthPresenter.success(res, result, 200);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error interno del servidor.');
    }
  };
}
