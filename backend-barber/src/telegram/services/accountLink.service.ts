import { RefreshTokenUseCase } from '../../application/use-cases/auth/RefreshTokenUseCase';
import { LinkTelegramAccountUseCase } from '../../application/use-cases/telegram/LinkTelegramAccountUseCase';
import { MongoRefreshTokenRepository } from '../../infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { MongoTelegramLinkRepository } from '../../infrastructure/repositories/mongodb/MongoTelegramLinkRepository';
import { MongoTelegramLinkTokenRepository } from '../../infrastructure/repositories/mongodb/MongoTelegramLinkTokenRepository';
import { MongoUserRepository } from '../../infrastructure/repositories/mongodb/MongoUserRepository';
import { HashService } from '../../infrastructure/services/HashService';
import { buildTokenService } from '../../wiring/auth';

const hashService = new HashService();
const tokenService = buildTokenService();
const userRepository = new MongoUserRepository();
const refreshTokenRepository = new MongoRefreshTokenRepository();
const telegramLinkTokenRepository = new MongoTelegramLinkTokenRepository();
const telegramLinkRepository = new MongoTelegramLinkRepository();

const linkUseCase = new LinkTelegramAccountUseCase(
  tokenService,
  hashService,
  refreshTokenRepository,
  telegramLinkTokenRepository,
  telegramLinkRepository,
  userRepository
);

const refreshUseCase = new RefreshTokenUseCase(tokenService, refreshTokenRepository, hashService);

export async function linkTelegramAccount(token: string, telegramId: number): Promise<{ message: string }> {
  return linkUseCase.execute({ token, telegramId });
}

/**
 * Dos pedidos de sesión para el mismo telegramId al mismo tiempo rotarían el mismo
 * refresh token en paralelo: el segundo vería el token del primero ya revocado y
 * dispararía la detección de reuso (revoca TODO el historial). Esta cola evita que
 * dos rotaciones para el mismo telegramId corran a la vez.
 */
const pendingSessionRequests = new Map<number, Promise<{ accessToken: string } | null>>();

async function rotateSession(telegramId: number): Promise<{ accessToken: string } | null> {
  const link = await telegramLinkRepository.findByTelegramId(telegramId);
  if (!link) return null;

  const result = await refreshUseCase.execute(link.refreshToken);

  await telegramLinkRepository.upsert({
    userId: link.userId,
    telegramId,
    refreshToken: result.refreshToken,
  });

  return { accessToken: result.token };
}

export function getSessionForTelegramId(telegramId: number): Promise<{ accessToken: string } | null> {
  const pending = pendingSessionRequests.get(telegramId);
  if (pending) return pending;

  const promise = rotateSession(telegramId).finally(() => {
    pendingSessionRequests.delete(telegramId);
  });
  pendingSessionRequests.set(telegramId, promise);
  return promise;
}
