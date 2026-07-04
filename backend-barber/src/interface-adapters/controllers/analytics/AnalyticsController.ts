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
  return `${toISODate(date)}T23:59:59.999Z`;
}

export function resolvePreset(preset: string): { desde: string; hasta: string } {
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
    case 'year': {
      const inicioYear = new Date(today.getFullYear(), 0, 1);
      const finYear = new Date(today.getFullYear(), 11, 31);
      return { desde: startOfDay(inicioYear), hasta: endOfDay(finYear) };
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
      const { year, lastYear } = req.query as Record<string, string | undefined>;

      if (!lastYear && !year) {
        return sendError(res, new Error('Debe proporcionar "year" o "lastYear".'), 'Error al obtener heatmap');
      }

      const result = await this.repository.getHeatmap({
        year: year ? parseInt(year, 10) : undefined,
        lastYear: lastYear === 'true' ? true : undefined,
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

      const byBarber = await this.repository.getDistribucion(desde, hasta);
      return sendSuccess(res, { byBarber });
    } catch (error) {
      return sendError(res, error, 'Error al obtener distribución');
    }
  };

  getYearsHandler = async (_req: Request, res: Response) => {
    try {
      const years = await this.repository.getAvailableYears();
      return sendSuccess(res, years);
    } catch (error) {
      return sendError(res, error, 'Error al obtener años disponibles');
    }
  };

  getHorasDistributionHandler = async (req: Request, res: Response) => {
    try {
      const { desde, hasta, barberId } = req.query as Record<string, string | undefined>;
      if (!desde || !hasta) {
        return sendError(res, new Error('Debe proporcionar "desde" y "hasta".'), 'Parámetros de fecha inválidos');
      }
      const result = await this.repository.getHorasDistribution(desde, hasta, barberId);
      return sendSuccess(res, result);
    } catch (error) {
      return sendError(res, error, 'Error al obtener distribución por hora');
    }
  };

  getDiasSemanaDistributionHandler = async (req: Request, res: Response) => {
    try {
      const { desde, hasta, barberId } = req.query as Record<string, string | undefined>;
      if (!desde || !hasta) {
        return sendError(res, new Error('Debe proporcionar "desde" y "hasta".'), 'Parámetros de fecha inválidos');
      }
      const result = await this.repository.getDiasSemanaDistribution(desde, hasta, barberId);
      return sendSuccess(res, result);
    } catch (error) {
      return sendError(res, error, 'Error al obtener distribución por día de semana');
    }
  };

  getClientesRecurrentesHandler = async (req: Request, res: Response) => {
    try {
      const { desde, hasta } = req.query as Record<string, string | undefined>;
      if (!desde || !hasta) {
        return sendError(res, new Error('Debe proporcionar "desde" y "hasta".'), 'Parámetros de fecha inválidos');
      }
      const result = await this.repository.getClientesRecurrentes(desde, hasta);
      return sendSuccess(res, result);
    } catch (error) {
      return sendError(res, error, 'Error al obtener tasa de retorno de clientes');
    }
  };

  getIngresosPorServicioHandler = async (req: Request, res: Response) => {
    try {
      const { desde, hasta } = req.query as Record<string, string | undefined>;
      if (!desde || !hasta) {
        return sendError(res, new Error('Debe proporcionar "desde" y "hasta".'), 'Parámetros de fecha inválidos');
      }
      const result = await this.repository.getIngresosPorServicio(desde, hasta);
      return sendSuccess(res, result);
    } catch (error) {
      return sendError(res, error, 'Error al obtener ingresos por servicio');
    }
  };

  getClientesListHandler = async (req: Request, res: Response) => {
    try {
      const { desde, hasta } = req.query as Record<string, string | undefined>;
      if (!desde || !hasta) {
        return sendError(res, new Error('Debe proporcionar "desde" y "hasta".'), 'Parámetros de fecha inválidos');
      }
      const result = await this.repository.getClientesList(desde, hasta);
      return sendSuccess(res, result);
    } catch (error) {
      return sendError(res, error, 'Error al obtener lista de clientes');
    }
  };

  getClientAppointmentsHandler = async (req: Request, res: Response) => {
    try {
      const clientKey = req.params.clientKey as string;
      if (!clientKey) {
        return sendError(res, new Error('Debe proporcionar clientKey.'), 'Parámetros inválidos');
      }
      const result = await this.repository.getClientAppointments(clientKey);
      return sendSuccess(res, result);
    } catch (error) {
      return sendError(res, error, 'Error al obtener turnos del cliente');
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