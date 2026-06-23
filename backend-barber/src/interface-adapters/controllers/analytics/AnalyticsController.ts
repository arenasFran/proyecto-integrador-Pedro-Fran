import { Request, Response } from 'express';
import { MongoAnalyticsRepository } from '../../../infrastructure/repositories/mongodb/MongoAnalyticsRepository';
import { sendSuccess, sendError } from '../../../common/response';

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
      return { desde: '', hasta: '' };
  }
}

export class AnalyticsController {
  constructor(private readonly repository: MongoAnalyticsRepository) {}

  getOverviewHandler = async (req: Request, res: Response) => {
    try {
      let { desde, hasta, preset } = req.query as Record<string, string | undefined>;

      if (preset) {
        const resolved = resolvePreset(preset);
        desde = resolved.desde;
        hasta = resolved.hasta;
      }

      if (!desde || !hasta) {
        return sendError(res, new Error('Debe proporcionar preset o desde/hasta.'), 'Parámetros de fecha inválidos');
      }

      const result = await this.repository.getOverview(desde, hasta);
      return sendSuccess(res, result);
    } catch (error) {
      return sendError(res, error, 'Error al obtener overview');
    }
  };

  getHeatmapHandler = async (req: Request, res: Response) => {
    try {
      const { anio, ultimoAño } = req.query as Record<string, string | undefined>;

      if (!ultimoAño && !anio) {
        return sendError(res, new Error('Debe proporcionar "anio" o "ultimoAño".'), 'Error al obtener heatmap');
      }

      const result = await this.repository.getHeatmap({
        anio: anio ? parseInt(anio, 10) : undefined,
        ultimoAño: ultimoAño === 'true' ? true : undefined,
      });

      return sendSuccess(res, result);
    } catch (error) {
      return sendError(res, error, 'Error al obtener heatmap');
    }
  };

  getDistribucionHandler = async (req: Request, res: Response) => {
    try {
      const { desde, hasta } = req.query as Record<string, string | undefined>;

      if (!desde || !hasta) {
        return sendError(res, new Error('Debe proporcionar "desde" y "hasta".'), 'Parámetros de fecha inválidos');
      }

      const porBarbero = await this.repository.getDistribucion(desde, hasta);
      return sendSuccess(res, { porBarbero });
    } catch (error) {
      return sendError(res, error, 'Error al obtener distribución');
    }
  };

  getReservasGananciasHandler = async (req: Request, res: Response) => {
    try {
      const { desde, hasta, granularidad, barberId, serviceId, status } = req.query as Record<string, string | undefined>;

      if (!desde || !hasta) {
        return sendError(res, new Error('Debe proporcionar "desde" y "hasta".'), 'Parámetros de fecha inválidos');
      }

      const result = await this.repository.getReservasGanancias({
        desde,
        hasta,
        granularidad: (granularidad as 'diario' | 'semanal' | 'mensual' | 'anual') ?? 'diario',
        barberId,
        serviceId,
        status,
      });

      return sendSuccess(res, result);
    } catch (error) {
      return sendError(res, error, 'Error al obtener reservas y ganancias');
    }
  };
}