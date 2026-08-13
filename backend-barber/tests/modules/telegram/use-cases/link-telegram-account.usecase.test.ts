import { LinkTelegramAccountUseCase } from '../../../../src/application/use-cases/telegram/LinkTelegramAccountUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import {
  makeMockTokenService,
  makeMockHashService,
  makeMockRefreshTokenRepository,
  makeMockTelegramLinkTokenRepository,
  makeMockTelegramLinkRepository,
  makeMockUserRepository,
} from '../../../test-utils/mocks';

describe('LinkTelegramAccountUseCase', () => {
  let tokenService: ReturnType<typeof makeMockTokenService>;
  let hashService: ReturnType<typeof makeMockHashService>;
  let refreshTokenRepository: ReturnType<typeof makeMockRefreshTokenRepository>;
  let telegramLinkTokenRepository: ReturnType<typeof makeMockTelegramLinkTokenRepository>;
  let telegramLinkRepository: ReturnType<typeof makeMockTelegramLinkRepository>;
  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let useCase: LinkTelegramAccountUseCase;

  const user = { id: 'user-1', email: 'juan@example.com', kind: 'Registrado' };

  beforeEach(() => {
    tokenService = makeMockTokenService();
    hashService = makeMockHashService();
    refreshTokenRepository = makeMockRefreshTokenRepository();
    telegramLinkTokenRepository = makeMockTelegramLinkTokenRepository();
    telegramLinkRepository = makeMockTelegramLinkRepository();
    userRepository = makeMockUserRepository();

    hashService.sha256.mockImplementation((input: string) => `hash(${input})`);
    tokenService.signRefreshToken.mockReturnValue('new-refresh-token');
    telegramLinkTokenRepository.verifyAndConsume.mockResolvedValue({ userId: user.id });
    userRepository.findById.mockResolvedValue(user);
    telegramLinkRepository.findByTelegramId.mockResolvedValue(null);
    telegramLinkRepository.findByUserId.mockResolvedValue(null);

    useCase = new LinkTelegramAccountUseCase(
      tokenService as any,
      hashService as any,
      refreshTokenRepository as any,
      telegramLinkTokenRepository as any,
      telegramLinkRepository as any,
      userRepository as any
    );
  });

  it('rechaza un token invalido o expirado', async () => {
    telegramLinkTokenRepository.verifyAndConsume.mockResolvedValue(null);

    await expect(useCase.execute({ token: 'bogus', telegramId: 123 })).rejects.toThrow(AppError);
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it('falla si el usuario del token ya no existe', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ token: 'tok', telegramId: 123 })).rejects.toThrow(AppError);
  });

  it('rechaza si ese telegramId ya esta vinculado a otro usuario', async () => {
    telegramLinkRepository.findByTelegramId.mockResolvedValue({
      userId: 'otro-usuario',
      telegramId: 123,
      refreshToken: 'x',
    });

    await expect(useCase.execute({ token: 'tok', telegramId: 123 })).rejects.toThrow(AppError);
    expect(telegramLinkRepository.upsert).not.toHaveBeenCalled();
  });

  it('rechaza si el usuario ya tiene otro telegram vinculado', async () => {
    telegramLinkRepository.findByUserId.mockResolvedValue({
      userId: user.id,
      telegramId: 999,
      refreshToken: 'x',
    });

    await expect(useCase.execute({ token: 'tok', telegramId: 123 })).rejects.toThrow(AppError);
    expect(telegramLinkRepository.upsert).not.toHaveBeenCalled();
  });

  it('permite re-vincular el mismo par usuario/telegramId (idempotente)', async () => {
    telegramLinkRepository.findByTelegramId.mockResolvedValue({
      userId: user.id,
      telegramId: 123,
      refreshToken: 'old-refresh',
    });
    telegramLinkRepository.findByUserId.mockResolvedValue({
      userId: user.id,
      telegramId: 123,
      refreshToken: 'old-refresh',
    });

    const result = await useCase.execute({ token: 'tok', telegramId: 123 });

    expect(result.message).toMatch(/vinculada/);
    expect(telegramLinkRepository.upsert).toHaveBeenCalledWith({
      userId: user.id,
      telegramId: 123,
      refreshToken: 'new-refresh-token',
    });
  });

  it('en el happy path firma, hashea y persiste el refresh token, y vincula la cuenta', async () => {
    const result = await useCase.execute({ token: 'plain-token', telegramId: 456 });

    expect(telegramLinkTokenRepository.verifyAndConsume).toHaveBeenCalledWith('hash(plain-token)');
    expect(tokenService.signRefreshToken).toHaveBeenCalledWith({
      id: user.id,
      email: user.email,
      kind: user.kind,
    });
    expect(refreshTokenRepository.create).toHaveBeenCalledWith(
      'hash(new-refresh-token)',
      user.id,
      expect.any(Date)
    );
    expect(telegramLinkRepository.upsert).toHaveBeenCalledWith({
      userId: user.id,
      telegramId: 456,
      refreshToken: 'new-refresh-token',
    });
    expect(result.message).toMatch(/vinculada/);
  });
});
