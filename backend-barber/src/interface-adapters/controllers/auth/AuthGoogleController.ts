import { Request, Response } from 'express';
import { AuthenticateWithGoogleUseCase } from '../../../application/use-cases/auth/AuthenticateWithGoogleUseCase';
import { CompleteGoogleProfileUseCase } from '../../../application/use-cases/auth/CompleteGoogleProfileUseCase';
import { sendSuccess, sendError } from '../../../common/response';
import { setRefreshCookie } from './TwoFactorController';

export class AuthGoogleController {
  constructor(
    private readonly authenticateWithGoogle: AuthenticateWithGoogleUseCase,
    private readonly completeGoogleProfileUseCase: CompleteGoogleProfileUseCase
  ) {}

  googleLogin = async (req: Request, res: Response) => {
    try {
      const result = await this.authenticateWithGoogle.execute(req.body);
      if ('refreshToken' in result) {
        setRefreshCookie(res, result.refreshToken);
      }
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al autenticar con Google');
    }
  };

  completeProfile = async (req: Request, res: Response) => {
    try {
      const result = await this.completeGoogleProfileUseCase.execute(req.body);
      if ('refreshToken' in result) {
        setRefreshCookie(res, result.refreshToken);
      }
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al completar el perfil');
    }
  };
}
