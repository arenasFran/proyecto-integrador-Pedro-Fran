import mongoose from 'mongoose';
import { STATUS_CATEGORIES, VALID_TRANSITIONS } from '../../../domain/types/appointment';
import AppointmentModel from './models/appointment.model';

const STATUS_NORMALIZE: Record<string, string> = Object.fromEntries(
  Object.keys(VALID_TRANSITIONS).map(s => [s.toLowerCase(), s])
);

export type OverviewResult = {
  totalReservas: number;
  duracionTotalMinutos: number;
  ingresosTotales: number;
  ingresosPendientes: number;
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

export type ClienteListEntry = {
  key: string;
  clientId: string | null;
  clientName: string;
  clientLastname: string;
  clientPhone?: string;
  clientEmail?: string;
  kind: 'Registrado' | 'NoRegistrado';
  totalVisits: number;
  totalSpent: number;
  firstVisit: string;
  lastVisit: string;
};

export type ClientAppointmentEntry = {
  date: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  servicePrice: number;
  status: string;
  paymentStatus: string;
  barberId: mongoose.Types.ObjectId;
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
          ingresosPendientes: [
            { $match: { paymentStatus: 'Pendiente', status: { $in: STATUS_CATEGORIES.countsAsDuration } } },
            { $group: { _id: null, total: { $sum: '$servicePrice' } } },
          ],
          estadisticasPorEstado: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
        },
      },
    ] as mongoose.PipelineStage[];

    const facetResult = await AppointmentModel.aggregate(facetPipeline);
    const data = facetResult[0] || { totalReservas: [], duracionTotalMinutos: [], ingresosTotales: [], ingresosPendientes: [], estadisticasPorEstado: [] };

    const registeredPipeline = [
      { $match: { clientId: { $exists: true } } } as mongoose.PipelineStage,
      { $group: { _id: '$clientId', primerTurno: { $min: '$date' } } },
      { $match: { primerTurno: { $gte: desde, $lte: hasta } } },
      { $count: 'total' },
    ];

    const unregisteredPipeline = [
      { $match: { clientId: { $exists: false }, clientPhone: { $exists: true, $ne: null } } } as mongoose.PipelineStage,
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
      ingresosPendientes: (data.ingresosPendientes as Array<{ total: number }>)[0]?.total ?? 0,
      nuevosClientes: (registrados[0]?.total ?? 0) + (noRegistrados[0]?.total ?? 0),
      estadisticasPorEstado,
    };
  }

  async getHeatmap(param: { year?: number; lastYear?: boolean }): Promise<HeatmapEntry[]> {
    let gte: Date;
    let lte: Date;

    if (param.lastYear) {
      const now = new Date();
      lte = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      gte = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else {
      const year = param.year ?? new Date().getFullYear();
      gte = new Date(`${year}-01-01`);
      lte = new Date(`${year}-12-31`);
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

  async getAvailableYears(): Promise<number[]> {
    const result = await AppointmentModel.aggregate([
      { $group: { _id: { $year: { $toDate: '$date' } } } },
      { $sort: { _id: -1 } },
      { $project: { _id: 0, year: '$_id' } },
    ]);
    return result.map(r => r.year);
  }

  async getHorasDistribution(desde: string, hasta: string, barberId?: string): Promise<{ hora: number; cantidad: number }[]> {
    const desdeDate = new Date(desde);
    const hastaDate = new Date(hasta);

    const matchStage: Record<string, unknown> = {
      dateObj: { $gte: desdeDate, $lte: hastaDate },
      status: { $in: STATUS_CATEGORIES.countsAsActivity },
    };
    if (barberId) matchStage.barberId = new mongoose.Types.ObjectId(barberId);

    const pipeline = [
      DATE_CONVERSION_STAGE,
      { $match: matchStage },
      {
        $group: {
          _id: { $substrCP: ['$startTime', 0, 2] },
          cantidad: { $sum: 1 },
        },
      },
      { $project: { _id: 0, hora: { $toInt: '$_id' }, cantidad: 1 } },
      { $sort: { hora: 1 } },
    ] as mongoose.PipelineStage[];

    return AppointmentModel.aggregate(pipeline);
  }

  async getDiasSemanaDistribution(desde: string, hasta: string, barberId?: string): Promise<{ dia: number; diaNombre: string; cantidad: number }[]> {
    const desdeDate = new Date(desde);
    const hastaDate = new Date(hasta);

    const matchStage: Record<string, unknown> = {
      dateObj: { $gte: desdeDate, $lte: hastaDate },
      status: { $in: STATUS_CATEGORIES.countsAsActivity },
    };
    if (barberId) matchStage.barberId = new mongoose.Types.ObjectId(barberId);

    const DIAS_NOMBRE = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const pipeline = [
      DATE_CONVERSION_STAGE,
      { $match: matchStage },
      {
        $group: {
          _id: { $dayOfWeek: '$dateObj' },
          cantidad: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          dia: '$_id',
          diaNombre: { $arrayElemAt: [DIAS_NOMBRE, { $subtract: ['$_id', 1] }] },
          cantidad: 1,
        },
      },
      { $sort: { dia: 1 } },
    ] as mongoose.PipelineStage[];

    return AppointmentModel.aggregate(pipeline);
  }

  async getClientesRecurrentes(desde: string, hasta: string): Promise<{ totalClientes: number; recurrentes: number; tasaRetorno: number; nuevos: number }> {
    const pipeline = [
      DATE_CONVERSION_STAGE,
      { $match: { dateObj: { $gte: new Date(desde), $lte: new Date(hasta) }, status: { $in: STATUS_CATEGORIES.countsAsActivity } } },
      {
        $group: {
          _id: { $ifNull: ['$clientId', '$clientPhone'] },
          visitas: { $sum: 1 },
          primerTurno: { $min: '$date' },
        },
      },
      {
        $project: {
          _id: 0,
          visitas: 1,
          esRecurrente: { $gte: ['$visitas', 2] },
          esNuevo: { $and: [{ $gte: ['$primerTurno', desde] }, { $lte: ['$primerTurno', hasta] }] },
        },
      },
      {
        $group: {
          _id: null,
          totalClientes: { $sum: 1 },
          recurrentes: { $sum: { $cond: ['$esRecurrente', 1, 0] } },
          nuevos: { $sum: { $cond: ['$esNuevo', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          totalClientes: 1,
          recurrentes: 1,
          tasaRetorno: {
            $cond: [
              { $gt: ['$totalClientes', 0] },
              { $round: [{ $multiply: [{ $divide: ['$recurrentes', '$totalClientes'] }, 100] }, 1] },
              0,
            ],
          },
          nuevos: 1,
        },
      },
    ] as mongoose.PipelineStage[];

    const result = await AppointmentModel.aggregate(pipeline);
    return result[0] ?? { totalClientes: 0, recurrentes: 0, tasaRetorno: 0, nuevos: 0 };
  }

  async getIngresosPorServicio(desde: string, hasta: string): Promise<{ serviceId: string; serviceName: string; cantidad: number; ingresos: number }[]> {
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
          _id: { serviceId: '$serviceId', serviceName: '$serviceName' },
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
        $project: {
          _id: 0,
          serviceId: '$_id.serviceId',
          serviceName: '$_id.serviceName',
          cantidad: 1,
          ingresos: 1,
        },
      },
      { $sort: { ingresos: -1 } },
    ] as mongoose.PipelineStage[];

    return AppointmentModel.aggregate(pipeline);
  }

  async getClientesList(desde: string, hasta: string): Promise<ClienteListEntry[]> {
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
          _id: {
            $cond: [
              { $ne: [{ $type: '$clientId' }, 'missing'] },
              { $concat: ['reg_', { $toString: '$clientId' }] },
              { $cond: [{ $ne: [{ $type: '$clientPhone' }, 'missing'] }, { $concat: ['anon_', '$clientPhone'] }, 'anon_unknown'] },
            ],
          },
          originalClientId: { $first: '$clientId' },
          clientName: { $first: '$clientName' },
          clientLastname: { $first: '$clientLastname' },
          clientPhone: { $first: '$clientPhone' },
          clientEmail: { $first: '$clientEmail' },
          totalVisits: { $sum: 1 },
          totalSpent: {
            $sum: {
              $cond: [{ $in: ['$status', STATUS_CATEGORIES.countsAsRevenue] }, '$servicePrice', 0],
            },
          },
          firstVisit: { $min: '$date' },
          lastVisit: { $max: '$date' },
        },
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'originalClientId',
          foreignField: '_id',
          as: 'registeredInfo',
        },
      },
      {
        $addFields: {
          clientEmail: {
            $cond: [
              { $gt: [{ $size: '$registeredInfo' }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$registeredInfo.email', 0] }, '$clientEmail'] },
              '$clientEmail',
            ],
          },
          kind: {
            $cond: [{ $ne: ['$originalClientId', null] }, 'Registrado', 'NoRegistrado'],
          },
        },
      },
      {
        $project: {
          _id: 0,
          key: '$_id',
          clientId: {
            $cond: [
              { $ne: [{ $type: '$originalClientId' }, 'missing'] },
              { $toString: '$originalClientId' },
              null,
            ],
          },
          clientName: 1,
          clientLastname: 1,
          clientPhone: 1,
          clientEmail: 1,
          kind: 1,
          totalVisits: 1,
          totalSpent: 1,
          firstVisit: 1,
          lastVisit: 1,
        },
      },
      { $sort: { lastVisit: -1 } },
    ] as mongoose.PipelineStage[];

    return AppointmentModel.aggregate(pipeline);
  }

  async getClientAppointments(clientKey: string): Promise<ClientAppointmentEntry[]> {
    const matchStage: Record<string, unknown> = {};

    if (clientKey.startsWith('reg_')) {
      const oid = new mongoose.Types.ObjectId(clientKey.slice(4));
      matchStage.clientId = oid;
    } else if (clientKey.startsWith('anon_')) {
      matchStage.clientPhone = clientKey.slice(5);
      matchStage.clientId = { $exists: false };
    } else {
      return [];
    }

    const pipeline = [
      { $match: matchStage },
      { $sort: { date: -1, startTime: -1 } },
      {
        $project: {
          _id: 0,
          date: 1,
          startTime: 1,
          endTime: 1,
          serviceName: 1,
          servicePrice: 1,
          status: 1,
          paymentStatus: 1,
          barberId: 1,
        },
      },
    ] as mongoose.PipelineStage[];

    return AppointmentModel.aggregate(pipeline);
  }

  async getReservasGanancias(filters: ReservasGananciasFilters): Promise<ReservasGananciasEntry[]> {
    const desdeDate = new Date(filters.desde);
    const hastaDate = new Date(filters.hasta);
    const dateFormat = DATE_FORMATS[filters.granularidad];

    const diffMs = hastaDate.getTime() - desdeDate.getTime();
    const isSingleDay = diffMs <= 1000 * 60 * 60 * 24;

    const matchStage: Record<string, unknown> = {
      dateObj: { $gte: desdeDate, $lte: hastaDate },
    };
    if (filters.barberId) matchStage.barberId = new mongoose.Types.ObjectId(filters.barberId);
    if (filters.serviceId) matchStage.serviceId = filters.serviceId;
    if (filters.status) {
      const normalized = STATUS_NORMALIZE[filters.status.toLowerCase()];
      if (normalized) matchStage.status = normalized;
    }

    const groupStage: mongoose.PipelineStage = isSingleDay
      ? {
          $group: {
            _id: { $concat: ['$date', ' ', '$startTime'] },
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
        }
      : {
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
        };

    const pipeline = [
      DATE_CONVERSION_STAGE,
      { $match: matchStage },
      groupStage,
      { $project: { _id: 0, periodo: '$_id', cantidadReservas: 1, ganancias: 1 } },
      { $sort: { periodo: 1 } },
    ] as mongoose.PipelineStage[];

    return AppointmentModel.aggregate(pipeline);
  }
}
