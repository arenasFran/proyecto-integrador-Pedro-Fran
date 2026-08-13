import { MongoTelegramLinkRepository } from '../../../src/infrastructure/repositories/mongodb/MongoTelegramLinkRepository';
import { RefreshTokenUseCase } from '../../../src/application/use-cases/auth/RefreshTokenUseCase';
import { getSessionForTelegramId } from '../../../src/telegram/services/accountLink.service';

/**
 * accountLink.service instancia sus dependencias como singletons a nivel de módulo,
 * así que en vez de inyectar mocks se espía el prototype de las clases reales: el
 * singleton usado internamente comparte ese prototype.
 */
describe('accountLink.service — getSessionForTelegramId (dedupe de rotacion)', () => {
  let findByTelegramId: jest.SpyInstance;
  let upsert: jest.SpyInstance;
  let execute: jest.SpyInstance;
  let executeCalls: string[];

  const link = (telegramId: number, refreshToken: string) => ({
    userId: `user-${telegramId}`,
    telegramId,
    refreshToken,
  });

  beforeEach(() => {
    executeCalls = [];

    findByTelegramId = jest.spyOn(MongoTelegramLinkRepository.prototype, 'findByTelegramId');
    upsert = jest.spyOn(MongoTelegramLinkRepository.prototype, 'upsert').mockResolvedValue(undefined);

    execute = jest.spyOn(RefreshTokenUseCase.prototype, 'execute').mockImplementation(async (refreshToken: string) => {
      executeCalls.push(refreshToken);
      // Simula latencia real de red/DB para que las llamadas concurrentes se solapen.
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        message: 'Token renovado',
        token: `access-for-${refreshToken}`,
        refreshToken: `rotated-${refreshToken}`,
      };
    });
  });

  afterEach(() => {
    findByTelegramId.mockRestore();
    upsert.mockRestore();
    execute.mockRestore();
  });

  it('devuelve null sin rotar si el telegramId no tiene cuenta vinculada', async () => {
    findByTelegramId.mockResolvedValue(null);

    const result = await getSessionForTelegramId(111);

    expect(result).toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });

  it('rota la sesion y persiste el nuevo refresh token', async () => {
    findByTelegramId.mockResolvedValue(link(222, 'refresh-222'));

    const result = await getSessionForTelegramId(222);

    expect(result).toEqual({ accessToken: 'access-for-refresh-222' });
    expect(upsert).toHaveBeenCalledWith({
      userId: 'user-222',
      telegramId: 222,
      refreshToken: 'rotated-refresh-222',
    });
  });

  it('dos pedidos concurrentes para el mismo telegramId comparten una unica rotacion', async () => {
    findByTelegramId.mockResolvedValue(link(333, 'refresh-333'));

    const [first, second] = await Promise.all([
      getSessionForTelegramId(333),
      getSessionForTelegramId(333),
    ]);

    expect(executeCalls).toEqual(['refresh-333']);
    expect(first).toEqual(second);
  });

  it('pedidos concurrentes para telegramIds distintos rotan de forma independiente', async () => {
    findByTelegramId.mockImplementation(async (telegramId: number) => link(telegramId, `refresh-${telegramId}`));

    const [a, b] = await Promise.all([
      getSessionForTelegramId(444),
      getSessionForTelegramId(555),
    ]);

    expect(executeCalls.sort()).toEqual(['refresh-444', 'refresh-555']);
    expect(a).toEqual({ accessToken: 'access-for-refresh-444' });
    expect(b).toEqual({ accessToken: 'access-for-refresh-555' });
  });

  it('libera el pedido pendiente al terminar, permitiendo una nueva rotacion despues', async () => {
    findByTelegramId.mockResolvedValue(link(666, 'refresh-666'));

    await getSessionForTelegramId(666);
    await getSessionForTelegramId(666);

    expect(executeCalls).toEqual(['refresh-666', 'refresh-666']);
  });
});
