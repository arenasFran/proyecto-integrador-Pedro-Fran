import { IAnalyticsRepository } from '../../../domain/repositories/IAnalyticsRepository';
import { DistribucionResponseDto } from '../../dto/analytics/DistribucionResponseDto';
import { AppError } from '../../errors/AppError';

export class GetDistribucionUseCase {
  constructor(private readonly analyticsRepository: IAnalyticsRepository) {}

  async execute(desde: string, hasta: string): Promise<DistribucionResponseDto> {
    if (desde > hasta) {
      throw new AppError('la fecha "desde" no puede ser posterior a "hasta".', 400);
    }

    const porBarbero = await this.analyticsRepository.getDistribucion(desde, hasta);
    return { porBarbero };
  }
}
