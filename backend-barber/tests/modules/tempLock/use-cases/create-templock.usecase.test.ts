import { CreateTempLockUseCase, CreateTempLockDTO } from '../../../../src/application/use-cases/tempLock/CreateTempLockUseCase';
import { ITempLockRepository } from '../../../../src/domain/repositories/ITempLockRepository';
import { AppError } from '../../../../src/application/errors/AppError';

describe('CreateTempLockUseCase', () => {
  let tempLockRepository: jest.Mocked<ITempLockRepository>;
  let useCase: CreateTempLockUseCase;

  const dto: CreateTempLockDTO = {
    barberId: 'barber-1',
    date: '2026-06-20',
    startTime: '10:00',
  };

  beforeEach(() => {
    tempLockRepository = {
      create: jest.fn(),
      deleteMany: jest.fn(),
      deleteOne: jest.fn(),
      deleteById: jest.fn(),
      findByBarberAndDate: jest.fn(),
      findById: jest.fn(),
    };
    useCase = new CreateTempLockUseCase(tempLockRepository);
  });

  it('debe crear un tempLock y devolver mensaje + id', async () => {
    tempLockRepository.create.mockResolvedValue('temp-1');

    const result = await useCase.execute(dto);

    expect(tempLockRepository.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: 'Slot apartado temporalmente', tempLockId: 'temp-1' });
  });

  it('debe lanzar AppError 409 si el horario ya fue apartado', async () => {
    tempLockRepository.create.mockRejectedValue(new Error('El horario ya fue apartado por otro usuario.'));

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(AppError);
    await expect(useCase.execute(dto)).rejects.toMatchObject({
      statusCode: 409,
      message: 'El horario ya fue apartado por otro usuario.',
    });
  });

  it('debe relanzar errores desconocidos', async () => {
    const unknownError = new Error('DB error');
    tempLockRepository.create.mockRejectedValue(unknownError);

    await expect(useCase.execute(dto)).rejects.toThrow('DB error');
  });
});
