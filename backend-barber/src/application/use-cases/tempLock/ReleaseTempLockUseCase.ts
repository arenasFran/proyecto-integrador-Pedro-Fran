import { ITempLockRepository } from '../../../domain/repositories/ITempLockRepository';

export class ReleaseTempLockUseCase {
  constructor(
    private readonly tempLockRepository: ITempLockRepository
  ) {}

  async execute(tempLockId: string): Promise<void> {
    const lock = await this.tempLockRepository.findById(tempLockId);
    if (!lock) return;
    await this.tempLockRepository.deleteById(tempLockId);
  }
}