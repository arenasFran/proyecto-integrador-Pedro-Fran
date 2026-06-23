import mongoose from 'mongoose';
import { STATUS_CATEGORIES, VALID_TRANSITIONS } from '../../../domain/types/appointment';
import AppointmentModel from './models/appointment.model';

export type OverviewResult = {
  totalReservas: number;
  duracionTotalMinutos: number;
  ingresosTotales: number;
  nuevosClientes: number;
  estadisticasPorEstado: Record<string, number>;
};

export type HeatmapEntry = {
  fecha: string;
  cantidad: number;
};

export type DistribucionEntry = {
  barberId: string;
  nombre: string;
  cantidad: number;
  ingresos: number;
};

export type ReservasGananciasEntry = {
  periodo: string;
  cantidadReservas: number;
  ganancias: number;
};

export type ReservasGananciasFilters = {
  desde: string;
  hasta: string;
  granularidad: 'diario' | 'semanal' | 'mensual' | 'anual';
  barberId?: string;
  serviceId?: string;
  status?: string;
};

const DATE_FORMATS: Record<string, string> = {
  diario: '%Y-%m-%d',
  semanal: '%G-%V',
  mensual: '%Y-%m',
  anual: '%Y',
};

const DATE_CONVERSION_STAGE = { $addFields: { dateObj: { $toDate: '$date' } } };

export class MongoAnalyticsRepository {
  async getOverview(desde: string, hasta: string): Promise<OverviewResult> {
    const desdeDate = new Date(desde);
    const hastaDate = new Date(hasta);

    const facetPipeline = [
      DATE_CONVERSION_STAGE,
      { $match: { dateObj: { $gte: desdeDate, $lte: hastaDate } } },
      {
        $facet: {
          totalReservas: [{ $count: 'count' }],
          duracionTotalMinutos: [
            { $match: { status: { $in: STATUS_CATEGORIES.countsAsDuration } } },
            { $group: { _id: null, total: { $sum: '$serviceDuration' } } },
          ],
          ingresosTotales: [
            { $match: { status: { $in: STATUS_CATEGORIES.countsAsRevenue } } },
            { $group: { _id: null, total: { $sum: '$servicePrice' } } },
          ],
          estadisticasPorEstado: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
        },
      },
    ] as mongoose.PipelineStage[];

    const facetResult = await AppointmentModel.aggregate(facetPipeline);
    const data = facetResult[0] || { totalReservas: [], duracionTotalMinutos: [], ingresosTotales: [], estadisticasPorEstado: [] };

    const registeredPipeline = [
      { $match: { clientId: { $exists: true } } as any },
      { $group: { _id: '$clientId', primerTurno: { $min: '$date' } } },
      { $match: { primerTurno: { $gte: desde, $lte: hasta } } },
      { $count: 'total' },
    ];

    const unregisteredPipeline = [
      { $match: { clientId: { $exists: false }, clientPhone: { $exists: true, $ne: null } } as any },
      { $group: { _id: '$clientPhone', primerTurno: { $min: '$date' } } },
      { $match: { primerTurno: { $gte: desde, $lte: hasta } } },
      { $count: 'total' },
    ];

    const [registrados, noRegistrados] = await Promise.all([
      AppointmentModel.aggregate(registeredPipeline),
      AppointmentModel.aggregate(unregisteredPipeline),
    ]);

    const estadisticasPorEstado: Record<string, number> = Object.fromEntries(
      Object.keys(VALID_TRANSITIONS).map((status) => [
        status.toLowerCase(),
        (data.estadisticasPorEstado as Array<{ _id: string; count: number }>).find((r) => r._id === status)?.count ?? 0,
      ])
    );

    return {
      totalReservas: (data.totalReservas as Array<{ count: number }>)[0]?.count ?? 0,
      duracionTotalMinutos: (data.duracionTotalMinutos as Array<{ total: number }>)[0]?.total ?? 0,
      ingresosTotales: (data.ingresosTotales as Array<{ total: number }>)[0]?.total ?? 0,
      nuevosClientes: (registrados[0]?.total ?? 0) + (noRegistrados[0]?.total ?? 0),
      estadisticasPorEstado,
    };
  }

  async getHeatmap(param: { anio?: number; ultimoAño?: boolean }): Promise<HeatmapEntry[]> {
    let gte: Date;
    let lte: Date;

    if (param.ultimoAño) {
      const now = new Date();
      lte = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      gte = new Date(lte);
      gte.setFullYear(gte.getFullYear() - 1);
      gte.setDate(gte.getDate() + 1);
    } else {
      const anio = param.anio ?? new Date().getFullYear();
      gte = new Date(`${anio}-01-01`);
      lte = new Date(`${anio}-12-31`);
    }

    const pipeline = [
      DATE_CONVERSION_STAGE,
      {
        $match: {
          dateObj: { $gte: gte, $lte: lte },
          status: { $in: STATUS_CATEGORIES.countsAsActivity },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$dateObj' } },
          cantidad: { $sum: 1 },
        },
      },
      { $project: { _id: 0, fecha: '$_id', cantidad: 1 } },
      { $sort: { fecha: 1 } },
    ] as mongoose.PipelineStage[];

    return AppointmentModel.aggregate(pipeline);
  }

  async getDistribucion(desde: string, hasta: string): Promise<DistribucionEntry[]> {
    const desdeDate = new Date(desde);
    const hastaDate = new Date(hasta);

    const pipeline = [
      DATE_CONVERSION_STAGE,
      {
        $match: {
          dateObj: { $gte: desdeDate, $lte: hastaDate },
          status: { $in: STATUS_CATEGORIES.countsAsActivity },
        },
      },
      {
        $group: {
          _id: '$barberId',
          cantidad: { $sum: 1 },
          ingresos: {
            $sum: {
              $cond: [
                { $in: ['$status', STATUS_CATEGORIES.countsAsRevenue] },
                '$servicePrice',
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'barbers',
          localField: '_id',
          foreignField: '_id',
          as: 'barber',
        },
      },
      { $unwind: '$barber' },
      {
        $project: {
          _id: 0,
          barberId: '$_id',
          nombre: { $concat: ['$barber.name', ' ', '$barber.lastname'] },
          cantidad: 1,
          ingresos: 1,
        },
      },
      { $sort: { cantidad: -1 } },
    ] as mongoose.PipelineStage[];

    return AppointmentModel.aggregate(pipeline);
  }

  async getReservasGanancias(filters: ReservasGananciasFilters): Promise<ReservasGananciasEntry[]> {
    const desdeDate = new Date(filters.desde);
    const hastaDate = new Date(filters.hasta);
    const dateFormat = DATE_FORMATS[filters.granularidad];

    const matchStage: Record<string, unknown> = {
      dateObj: { $gte: desdeDate, $lte: hastaDate },
    };
    if (filters.barberId) matchStage.barberId = new mongoose.Types.ObjectId(filters.barberId);
    if (filters.serviceId) matchStage.serviceId = filters.serviceId;
    if (filters.status) matchStage.status = filters.status;

    const pipeline = [
      DATE_CONVERSION_STAGE,
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$dateObj' } },
          cantidadReservas: { $sum: 1 },
          ganancias: {
            $sum: {
              $cond: [
                { $in: ['$status', STATUS_CATEGORIES.countsAsRevenue] },
                '$servicePrice',
                0,
              ],
            },
          },
        },
      },
      { $project: { _id: 0, periodo: '$_id', cantidadReservas: 1, ganancias: 1 } },
      { $sort: { periodo: 1 } },
    ] as mongoose.PipelineStage[];

    return AppointmentModel.aggregate(pipeline);
  }
}
