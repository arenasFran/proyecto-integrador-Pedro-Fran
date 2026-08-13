import { Request, Response } from 'express';
import { GenerateTelegramLinkTokenUseCase } from '../../../application/use-cases/telegram/GenerateTelegramLinkTokenUseCase';
import { sendError, sendSuccess } from '../../../common/response';

export class TelegramController {
  constructor(private readonly generateTelegramLinkToken: GenerateTelegramLinkTokenUseCase) {}

  generateToken = async (req: Request, res: Response) => {
    try {
      const result = await this.generateTelegramLinkToken.execute(req.user!._id);
      return sendSuccess(res, result);
    } catch (error) {
      return sendError(res, error, 'Error al generar el token de vinculación');
    }
  };
}
