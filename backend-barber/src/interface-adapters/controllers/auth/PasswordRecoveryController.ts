import { Request, Response } from 'express';
import { RequestPasswordResetUseCase } from '../../../application/use-cases/password/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '../../../application/use-cases/password/ResetPasswordUseCase';
import { AuthPresenter } from '../../presenters/AuthPresenter';

export class PasswordRecoveryController {
  constructor(
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase
  ) {}

  requestReset = async (req: Request, res: Response) => {
    try {
      const result = await this.requestPasswordResetUseCase.execute(req.body);
      return AuthPresenter.success(res, result, 200);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error procesando la solicitud');
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const result = await this.resetPasswordUseCase.execute(req.body);
      return AuthPresenter.success(res, result, 200);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error al restablecer la contraseña');
    }
  };
}
