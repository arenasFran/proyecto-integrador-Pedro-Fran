import { Request, Response } from 'express';
import { GetOverviewUseCase } from '../../../application/use-cases/analytics/GetOverviewUseCase';
import { GetHeatmapUseCase } from '../../../application/use-cases/analytics/GetHeatmapUseCase';
import { GetDistribucionUseCase } from '../../../application/use-cases/analytics/GetDistribucionUseCase';
import { GetReservasGananciasUseCase } from '../../../application/use-cases/analytics/GetReservasGananciasUseCase';
import type { ReservasGananciasFilters } from '../../../domain/repositories/IAnalyticsRepository';
import { AnalyticsPresenter } from '../../presenters/AnalyticsPresenter';
import { AppError } from '../../../application/errors/AppError';

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): string {
  return toISODate(date);
}

function endOfDay(date: Date): string {
  return toISODate(date);
}

function resolvePreset(preset: string): { desde: string; hasta: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'hoy':
      return { desde: startOfDay(today), hasta: endOfDay(today) };
    case 'ayer': {
      const ayer = new Date(today);
      ayer.setDate(ayer.getDate() - 1);
      return { desde: startOfDay(ayer), hasta: endOfDay(ayer) };
    }
    case 'semana': {
      const diaSemana = today.getDay();
      const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
      const lunes = new Date(today);
      lunes.setDate(lunes.getDate() + diffLunes);
      const domingo = new Date(lunes);
      domingo.setDate(domingo.getDate() + 6);
      return { desde: startOfDay(lunes), hasta: endOfDay(domingo) };
    }
    case 'mes': {
      const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1);
      const finMes = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { desde: startOfDay(inicioMes), hasta: endOfDay(finMes) };
    }
    case 'año': {
      const inicioAnio = new Date(today.getFullYear(), 0, 1);
      const finAnio = new Date(today.getFullYear(), 11, 31);
      return { desde: startOfDay(inicioAnio), hasta: endOfDay(finAnio) };
    }
    default:
      throw new AppError('Preset de fecha inválido.', 400);
  }
}

export class AnalyticsController {
  constructor(
    private readonly getOverview: GetOverviewUseCase,
    private readonly getHeatmap: GetHeatmapUseCase,
    private readonly getDistribucion: GetDistribucionUseCase,
    private readonly getReservasGanancias: GetReservasGananciasUseCase,
  ) {}

  getOverviewHandler = async (req: Request, res: Response) => {
    try {
      let { desde, hasta, preset } = req.query as Record<string, string | undefined>;

      if (preset) {
        const resolved = resolvePreset(preset);
        desde = resolved.desde;
        hasta = resolved.hasta;
      }

      if (!desde || !hasta) {
        return AnalyticsPresenter.handleError(
          res,
          new AppError('Debe proporcionar preset o desde/hasta.', 400),
          'Parámetros de fecha inválidos',
        );
      }

      const diffMs = new Date(hasta).getTime() - new Date(desde).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 731) {
        return AnalyticsPresenter.handleError(
          res,
          new AppError('El rango máximo permitido es de 2 años.', 400),
          'Rango inválido',
        );
      }

      const result = await this.getOverview.execute(desde, hasta);
      return AnalyticsPresenter.success(res, result);
    } catch (error) {
      return AnalyticsPresenter.handleError(res, error, 'Error al obtener overview');
    }
  };

  getHeatmapHandler = async (req: Request, res: Response) => {
    try {
      const { anio, ultimoAño } = req.query as Record<string, string | undefined>;

      const result = await this.getHeatmap.execute({
        anio: anio ? parseInt(anio, 10) : undefined,
        ultimoAño: ultimoAño === 'true' ? true : undefined,
      });

      return AnalyticsPresenter.success(res, result);
    } catch (error) {
      return AnalyticsPresenter.handleError(res, error, 'Error al obtener heatmap');
    }
  };

  getDistribucionHandler = async (req: Request, res: Response) => {
    try {
      const { desde, hasta } = req.query as Record<string, string | undefined>;

      if (!desde || !hasta) {
        return AnalyticsPresenter.handleError(
          res,
          new AppError('Debe proporcionar "desde" y "hasta".', 400),
          'Parámetros de fecha inválidos',
        );
      }

      const diffMs = new Date(hasta).getTime() - new Date(desde).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 731) {
        return AnalyticsPresenter.handleError(
          res,
          new AppError('El rango máximo permitido es de 2 años.', 400),
          'Rango inválido',
        );
      }

      const result = await this.getDistribucion.execute(desde, hasta);
      return AnalyticsPresenter.success(res, result);
    } catch (error) {
      return AnalyticsPresenter.handleError(res, error, 'Error al obtener distribución');
    }
  };

  getReservasGananciasHandler = async (req: Request, res: Response) => {
    try {
      const { desde, hasta, granularidad, barberId, serviceId, status } = req.query as Record<string, string | undefined>;

      if (!desde || !hasta) {
        return AnalyticsPresenter.handleError(
          res,
          new AppError('Debe proporcionar "desde" y "hasta".', 400),
          'Parámetros de fecha inválidos',
        );
      }

      const diffMs = new Date(hasta).getTime() - new Date(desde).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 731) {
        return AnalyticsPresenter.handleError(
          res,
          new AppError('El rango máximo permitido es de 2 años.', 400),
          'Rango inválido',
        );
      }

      const result = await this.getReservasGanancias.execute({
        desde,
        hasta,
        granularidad: (granularidad as ReservasGananciasFilters['granularidad']) ?? 'diario',
        barberId,
        serviceId,
        status,
      });

      return AnalyticsPresenter.success(res, result);
    } catch (error) {
      return AnalyticsPresenter.handleError(res, error, 'Error al obtener reservas y ganancias');
    }
  };
}
