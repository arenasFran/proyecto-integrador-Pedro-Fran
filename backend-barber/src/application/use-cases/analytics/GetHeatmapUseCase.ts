import { IAnalyticsRepository } from '../../../domain/repositories/IAnalyticsRepository';
import { HeatmapResponseDto } from '../../dto/analytics/HeatmapResponseDto';
import { AppError } from '../../errors/AppError';

export class GetHeatmapUseCase {
  constructor(private readonly analyticsRepository: IAnalyticsRepository) {}

  async execute(param: { anio?: number; ultimoAño?: boolean }): Promise<HeatmapResponseDto> {
    if (!param.ultimoAño && !param.anio) {
      throw new AppError('Debe proporcionar "anio" o "ultimoAño".', 400);
    }

    return this.analyticsRepository.getHeatmap(param);
  }
}
