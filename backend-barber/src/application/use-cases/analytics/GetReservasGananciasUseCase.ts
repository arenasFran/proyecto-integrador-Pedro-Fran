import { IAnalyticsRepository, ReservasGananciasFilters } from '../../../domain/repositories/IAnalyticsRepository';
import { ReservasGananciasResponseDto } from '../../dto/analytics/ReservasGananciasResponseDto';
import { AppError } from '../../errors/AppError';

export class GetReservasGananciasUseCase {
  constructor(private readonly analyticsRepository: IAnalyticsRepository) {}

  async execute(filters: ReservasGananciasFilters): Promise<ReservasGananciasResponseDto> {
    if (filters.desde > filters.hasta) {
      throw new AppError('la fecha "desde" no puede ser posterior a "hasta".', 400);
    }

    return this.analyticsRepository.getReservasGanancias(filters);
  }
}
