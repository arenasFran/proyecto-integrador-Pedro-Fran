import { GenerateTelegramLinkTokenUseCase } from '../application/use-cases/telegram/GenerateTelegramLinkTokenUseCase';
import { MongoTelegramLinkTokenRepository } from '../infrastructure/repositories/mongodb/MongoTelegramLinkTokenRepository';
import { HashService } from '../infrastructure/services/HashService';
import { getConfig } from '../infrastructure/config/env';
import { TelegramController } from '../interface-adapters/controllers/telegram/TelegramController';
import { createTelegramRouter } from '../interface-adapters/routes/telegram.routes';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';

export const buildTelegramRouter = (deps: { authenticate: ReturnType<typeof createAuthenticate> }) => {
  const config = getConfig();
  const hashService = new HashService();
  const telegramLinkTokenRepository = new MongoTelegramLinkTokenRepository();

  const generateTelegramLinkToken = new GenerateTelegramLinkTokenUseCase(
    telegramLinkTokenRepository,
    hashService,
    config.telegram.botUsername
  );

  const telegramController = new TelegramController(generateTelegramLinkToken);

  return createTelegramRouter({ telegramController, authenticate: deps.authenticate });
};
