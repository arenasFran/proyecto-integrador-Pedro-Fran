import { Request, Response } from 'express';
import { AuthenticateWithGoogleUseCase } from '../../../application/use-cases/auth/AuthenticateWithGoogleUseCase';
import { AuthPresenter } from '../../presenters/AuthPresenter';

export class AuthGoogleController {
  constructor(private readonly authenticateWithGoogle: AuthenticateWithGoogleUseCase) {}

  googleLogin = async (req: Request, res: Response) => {
    try {
      const result = await this.authenticateWithGoogle.execute(req.body);
      return AuthPresenter.success(res, result, 200);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error al autenticar con Google');
    }
  };
}
