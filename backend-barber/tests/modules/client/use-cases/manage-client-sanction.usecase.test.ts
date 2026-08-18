import { Client } from '../../../../src/domain/entities/Client';
import { AppError } from '../../../../src/domain/errors/AppError';
import { ManageClientSanctionUseCase, MIN_NOSHOW_PARA_SANCION } from '../../../../src/application/use-cases/client/ManageClientSanctionUseCase';
import { makeMockClientRepository } from '../../../test-utils/mocks';

describe('ManageClientSanctionUseCase', () => {
  const makeClient = (overrides?: Partial<Parameters<typeof Client.create>[0]>) =>
    Client.create({
      id: 'client-1',
      name: 'Juan',
      lastname: 'Perez',
      phone: '+59899123456',
      kind: 'NoRegistrado',
      ...overrides,
    });

  let clientRepository: ReturnType<typeof makeMockClientRepository>;
  let useCase: ManageClientSanctionUseCase;

  beforeEach(() => {
    clientRepository = makeMockClientRepository();
    useCase = new ManageClientSanctionUseCase(clientRepository);
  });

  describe('sancionar', () => {
    it('debe sancionar un cliente con 3 o más inasistencias', async () => {
      clientRepository.findById.mockResolvedValue(makeClient({ noShowCount: 3 }));
      clientRepository.aplicarSancion.mockResolvedValue(
        makeClient({ noShowCount: 3, sancionado: true, fechaSancion: new Date(), motivoSancion: '3 inasistencias', sancionadoPor: 'admin@test.com' })
      );

      const result = await useCase.sancionar({ clientId: 'client-1', motivo: '3 inasistencias' }, 'admin@test.com');

      expect(clientRepository.aplicarSancion).toHaveBeenCalledWith('client-1', {
        motivo: '3 inasistencias',
        sancionadoPor: 'admin@test.com',
      });
      expect(result.sancionado).toBe(true);
    });

    it('debe fallar si el cliente no existe', async () => {
      clientRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.sancionar({ clientId: 'client-1', motivo: 'Inasistencias' }, 'admin@test.com')
      ).rejects.toBeInstanceOf(AppError);
    });

    it('debe fallar si el cliente ya está sancionado', async () => {
      clientRepository.findById.mockResolvedValue(makeClient({ noShowCount: 3, sancionado: true }));

      await expect(
        useCase.sancionar({ clientId: 'client-1', motivo: 'Inasistencias' }, 'admin@test.com')
      ).rejects.toBeInstanceOf(AppError);
    });

    it(`debe fallar si el cliente no alcanzó las ${MIN_NOSHOW_PARA_SANCION} inasistencias`, async () => {
      clientRepository.findById.mockResolvedValue(makeClient({ noShowCount: 2 }));

      await expect(
        useCase.sancionar({ clientId: 'client-1', motivo: 'Inasistencias' }, 'admin@test.com')
      ).rejects.toThrow(new RegExp(`${MIN_NOSHOW_PARA_SANCION}`));
    });
  });

  describe('levantar', () => {
    it('debe levantar la sanción y resetear el contador', async () => {
      clientRepository.findById.mockResolvedValue(makeClient({ noShowCount: 3, sancionado: true }));
      clientRepository.levantarSancion.mockResolvedValue(
        makeClient({ noShowCount: 0, sancionado: false })
      );

      const result = await useCase.levantar('client-1');

      expect(clientRepository.levantarSancion).toHaveBeenCalledWith('client-1');
      expect(result.sancionado).toBe(false);
      expect(result.noShowCount).toBe(0);
    });

    it('debe fallar si el cliente no existe', async () => {
      clientRepository.findById.mockResolvedValue(null);

      await expect(useCase.levantar('client-1')).rejects.toBeInstanceOf(AppError);
    });

    it('debe fallar si el cliente no está sancionado', async () => {
      clientRepository.findById.mockResolvedValue(makeClient({ noShowCount: 2 }));

      await expect(useCase.levantar('client-1')).rejects.toBeInstanceOf(AppError);
    });
  });
});
