import { IAnalyticsRepository } from '../../../domain/repositories/IAnalyticsRepository';
import { AppError } from '../../errors/AppError';
import { OverviewResponseDto } from '../../dto/analytics/OverviewResponseDto';

export class GetOverviewUseCase {
  constructor(private readonly analyticsRepository: IAnalyticsRepository) {}

  async execute(desde: string, hasta: string): Promise<OverviewResponseDto> {
    if (desde > hasta) {
      throw new AppError('la fecha "desde" no puede ser posterior a "hasta".', 400);
    }

    return this.analyticsRepository.getOverview(desde, hasta);
  }
}
