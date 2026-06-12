import { ITempLockRepository } from '../../../domain/repositories/ITempLockRepository';
import { AppError } from '../../errors/AppError';

export type CreateTempLockDTO = {
  barberId: string;
  date: string;
  startTime: string;
  clientId?: string;
};

export class CreateTempLockUseCase {
  constructor(
    private readonly tempLockRepository: ITempLockRepository
  ) {}

  async execute(dto: CreateTempLockDTO): Promise<{ message: string; tempLockId: string }> {
    try {
      const tempLockId = await this.tempLockRepository.create(dto);
      return { message: 'Slot apartado temporalmente', tempLockId };
    } catch (error: any) {
      if (error?.message?.includes('ya fue apartado')) {
        throw new AppError('El horario ya fue apartado por otro usuario.', 409);
      }
      throw error;
    }
  }
}