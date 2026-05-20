import { Request, Response } from 'express';
import { SendTwoFactorCodeUseCase } from '../../../application/use-cases/auth/SendTwoFactorCodeUseCase';
import { VerifyTwoFactorUseCase } from '../../../application/use-cases/auth/VerifyTwoFactorUseCase';
import { AuthPresenter } from '../../presenters/AuthPresenter';

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
      return AuthPresenter.success(res, result, 200);
    } catch (error) {
      return AuthPresenter.handleError(res, error, 'Error interno del servidor.');
    }
  };
}
