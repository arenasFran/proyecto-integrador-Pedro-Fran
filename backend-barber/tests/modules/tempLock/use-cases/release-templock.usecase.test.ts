import { ReleaseTempLockUseCase } from '../../../../src/application/use-cases/tempLock/ReleaseTempLockUseCase';
import { ITempLockRepository } from '../../../../src/domain/repositories/ITempLockRepository';

describe('ReleaseTempLockUseCase', () => {
  let tempLockRepository: jest.Mocked<ITempLockRepository>;
  let useCase: ReleaseTempLockUseCase;

  beforeEach(() => {
    tempLockRepository = {
      create: jest.fn(),
      deleteMany: jest.fn(),
      deleteOne: jest.fn(),
      deleteById: jest.fn(),
      findByBarberAndDate: jest.fn(),
      findById: jest.fn(),
    };
    useCase = new ReleaseTempLockUseCase(tempLockRepository);
  });

  it('debe eliminar el tempLock si existe', async () => {
    tempLockRepository.findById.mockResolvedValue({
      id: 'temp-1',
      barberId: 'barber-1',
      date: '2026-06-20',
      startTime: '10:00',
    });

    await useCase.execute('temp-1');

    expect(tempLockRepository.findById).toHaveBeenCalledWith('temp-1');
    expect(tempLockRepository.deleteById).toHaveBeenCalledWith('temp-1');
  });

  it('debe no hacer nada si el tempLock no existe', async () => {
    tempLockRepository.findById.mockResolvedValue(null);

    await useCase.execute('inexistente');

    expect(tempLockRepository.findById).toHaveBeenCalledWith('inexistente');
    expect(tempLockRepository.deleteById).not.toHaveBeenCalled();
  });
});
