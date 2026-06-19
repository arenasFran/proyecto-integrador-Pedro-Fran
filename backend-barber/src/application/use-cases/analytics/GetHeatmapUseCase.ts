import { IAnalyticsRepository } from '../../../domain/repositories/IAnalyticsRepository';
import { HeatmapResponseDto } from '../../dto/analytics/HeatmapResponseDto';
import { AppError } from '../../errors/AppError';

export class GetHeatmapUseCase {
  constructor(private readonly analyticsRepository: IAnalyticsRepository) {}

  async execute(param: { anio?: number; ultimoAnio?: boolean }): Promise<HeatmapResponseDto> {
    if (!param.ultimoAnio && !param.anio) {
      throw new AppError('Debe proporcionar "anio" o "ultimoAnio".', 400);
    }

    return this.analyticsRepository.getHeatmap(param);
  }
}
