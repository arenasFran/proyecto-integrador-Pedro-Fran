import { Request, Response } from 'express';
import { RequestPasswordResetUseCase } from '../../../application/use-cases/password/RequestPasswordResetUseCase';
import { VerifyPasswordResetCodeUseCase } from '../../../application/use-cases/password/VerifyPasswordResetCodeUseCase';
import { ResetPasswordUseCase } from '../../../application/use-cases/password/ResetPasswordUseCase';
import { sendSuccess, sendError } from '../../../common/response';

export class PasswordRecoveryController {
  constructor(
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly verifyPasswordResetCodeUseCase: VerifyPasswordResetCodeUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase
  ) {}

  requestReset = async (req: Request, res: Response) => {
    try {
      const result = await this.requestPasswordResetUseCase.execute(req.body);
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error procesando la solicitud');
    }
  };

  verifyCode = async (req: Request, res: Response) => {
    try {
      const result = await this.verifyPasswordResetCodeUseCase.execute(req.body);
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al verificar el código');
    }
  };

  resetPassword = async (req: Request, res: Response) => {
    try {
      const result = await this.resetPasswordUseCase.execute(req.body);
      return sendSuccess(res, result, 200);
    } catch (error) {
      return sendError(res, error, 'Error al restablecer la contraseña');
    }
  };
}
