import mongoose from 'mongoose';
import { STATUS_CATEGORIES, VALID_TRANSITIONS } from '../../../domain/types/appointment';
import AppointmentModel from './models/appointment.model';
import { PaymentModel } from './models/payment.model';
import { OrderModel } from './models/order.model';
import { MembershipModel } from './models/membership.model';
import { parseLocalDate, parseLocalDateRange } from '../../../common/dateUtils';
import { Client } from './models/client.model';
import { MongoRevenueEntryRepository } from './MongoRevenueEntryRepository';
import { RevenueEntryModel } from './models/revenue-entry.model';
import { RevenueService } from '../../../domain/services/RevenueService';

const STATUS_NORMALIZE: Record<string, string> = Object.fromEntries(
  Object.keys(VALID_TRANSITIONS).map(s => [s.toLowerCase(), s])
);

export type OverviewResult = {
  totalReservas: number;
  duracionTotalMinutos: number;
  ingresosTotales: number;
  ingresosPendientes: number;
  nuevosClientes: number;
  membresiasActivas: number;
  clientesUnicos: number;
  estadisticasPorEstado: Record<string, number>;
  totalOrders: number;
  cancelledOrders: number;
};

export type HeatmapEntry = {
  fecha: string;
  cantidad: number;
  ingresos?: number;
  porOrigen?: Record<string, number>;
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
  clientPhotoUrl: string | null;
  kind: 'Registrado' | 'NoRegistrado';
  registeredAt: string;
  totalVisits: number;
  totalSpent: number;
  firstVisit: string | null;
  lastVisit: string | null;
  membershipStatus: 'active' | null;
};

export type NuevoClienteEntry = {
  clientId: string;
  name: string;
  lastname: string;
  phone?: string;
  email?: string;
  kind: 'Registrado' | 'NoRegistrado';
  registeredAt: string;
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

const REGISTERED_AT_STAGE = { $addFields: { registeredAt: { $toDate: '$_id' } } };
const REVENUE_ENTRIES_COLLECTION = RevenueEntryModel.collection.name;

export function countPaidOrdersByStatus(ordersByStatus: Record<string, number>): number {
  return (ordersByStatus.paid ?? 0) + (ordersByStatus.delivered ?? 0);
}

function endOfDayDate(hasta: string): Date {
  const date = new Date(hasta);
  if (!hasta.includes('T')) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
}

export class MongoAnalyticsRepository {
  constructor(
    private readonly revenueEntryRepo: MongoRevenueEntryRepository,
    private readonly revenueService?: RevenueService,
  ) {}

  private static revenueMatchExpr(prefix = '$'): Record<string, unknown> {
    const s = (f: string) => `${prefix}${f}`;
    return {
      $or: [
        { $in: [s('status'), STATUS_CATEGORIES.countsAsRevenue] },
        { $and: [{ $eq: [s('status'), 'Confirmado'] }, { $eq: [s('paymentStatus'), 'Pagado'] }] },
      ],
    };
  }

  private static revenueSumCond(priceField = '$servicePrice', prefix = '$'): Record<string, unknown> {
    if (prefix !== '$') {
      const s = (f: string) => `${prefix}${f}`;
      return {
        $cond: [
          {
            $or: [
              { $in: [s('status'), STATUS_CATEGORIES.countsAsRevenue] },
              { $and: [{ $eq: [s('status'), 'Confirmado'] }, { $eq: [s('paymentStatus'), 'Pagado'] }] },
            ],
          },
          priceField,
          0,
        ],
      };
    }
    return {
      $cond: [MongoAnalyticsRepository.revenueMatchExpr(), priceField, 0],
    };
  }

  private async getPendingRevenue(desde: Date, hasta: Date, dateDesde: string, dateHasta: string): Promise<number> {
    const [appointments, orders, memberships] = await Promise.all([
      AppointmentModel.aggregate([
        {
          $match: {
            date: { $gte: dateDesde, $lte: dateHasta },
            paymentStatus: 'Pendiente',
            status: { $in: STATUS_CATEGORIES.countsAsDuration },
          },
        },
        {
          $lookup: {
            from: REVENUE_ENTRIES_COLLECTION,
            let: { referenceId: { $toString: '$_id' } },
            pipeline: [{
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$source', 'appointment'] },
                    { $eq: ['$referenceId', '$$referenceId'] },
                  ],
                },
              },
            }],
            as: 'revenue',
          },
        },
        { $match: { $expr: { $eq: [{ $size: '$revenue' }, 0] } } },
        { $group: { _id: null, total: { $sum: '$servicePrice' } } },
      ] as mongoose.PipelineStage[]),
      OrderModel.aggregate([
        { $match: { createdAt: { $gte: desde, $lte: hasta }, status: 'pending' } },
        {
          $lookup: {
            from: REVENUE_ENTRIES_COLLECTION,
            let: { referenceId: { $toString: '$_id' } },
            pipeline: [{
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$source', 'product_order'] },
                    { $eq: ['$referenceId', '$$referenceId'] },
                  ],
                },
              },
            }],
            as: 'revenue',
          },
        },
        { $match: { $expr: { $eq: [{ $size: '$revenue' }, 0] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ] as mongoose.PipelineStage[]),
      MembershipModel.aggregate([
        { $match: { createdAt: { $gte: desde, $lte: hasta }, status: 'pending' } },
        {
          $lookup: {
            from: REVENUE_ENTRIES_COLLECTION,
            let: { referenceId: { $toString: '$_id' } },
            pipeline: [{
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$source', 'membership'] },
                    { $eq: ['$referenceId', '$$referenceId'] },
                  ],
                },
              },
            }],
            as: 'revenue',
          },
        },
        { $match: { $expr: { $eq: [{ $size: '$revenue' }, 0] } } },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ] as mongoose.PipelineStage[]),
    ]);

    return (appointments[0]?.total ?? 0)
      + (orders[0]?.total ?? 0)
      + (memberships[0]?.total ?? 0);
  }

  async getOverview(desde: string, hasta: string): Promise<OverviewResult> {
    const { desdeDate, hastaDate } = parseLocalDateRange(desde, hasta);

    const revenueBySource = await this.revenueEntryRepo.getTotalByDateRangeAndSource(desdeDate, hastaDate);
    const revenueMap = new Map(revenueBySource.map(r => [r.source, r.total]));

    const ingresosTotales =
      (revenueMap.get('appointment') ?? 0) +
      (revenueMap.get('membership') ?? 0) +
      (revenueMap.get('product_order') ?? 0);

    const facetPipeline = [
      { $match: { date: { $gte: desde, $lte: hasta } } },
      {
        $facet: {
          totalReservas: [{ $count: 'count' }],
          duracionTotalMinutos: [
            { $match: { status: { $in: STATUS_CATEGORIES.countsAsDuration } } },
            { $group: { _id: null, total: { $sum: '$serviceDuration' } } },
          ],
          estadisticasPorEstado: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
        },
      },
    ] as mongoose.PipelineStage[];

    const [facetResult, ingresosPendientes] = await Promise.all([
      AppointmentModel.aggregate(facetPipeline),
      this.getPendingRevenue(desdeDate, hastaDate, desde, hasta),
    ]);
    const data = facetResult[0] || { totalReservas: [], duracionTotalMinutos: [], ingresosPendientes: [], estadisticasPorEstado: [] };

    const nuevosClientesPipeline = [
      REGISTERED_AT_STAGE,
      { $match: { registeredAt: { $gte: desdeDate, $lte: endOfDayDate(hasta) } } },
      { $count: 'total' },
    ] as mongoose.PipelineStage[];

    const [nuevosClientes, membresiasActivasResult, clientesUnicosResult] = await Promise.all([
      Client.aggregate(nuevosClientesPipeline),
      MembershipModel.aggregate([
        { $match: { status: 'active', endDate: { $gte: new Date() } } },
        { $count: 'total' },
      ] as mongoose.PipelineStage[]),
      AppointmentModel.aggregate([
        DATE_CONVERSION_STAGE,
        { $match: { dateObj: { $gte: desdeDate, $lte: hastaDate }, status: { $in: STATUS_CATEGORIES.countsAsActivity } } },
        { $group: { _id: { $ifNull: ['$clientId', '$clientPhone'] } } },
        { $group: { _id: null, unique: { $sum: 1 } } },
      ] as mongoose.PipelineStage[]),
    ]);

    const estadisticasPorEstado: Record<string, number> = Object.fromEntries(
      Object.keys(VALID_TRANSITIONS).map((status) => [
        status.toLowerCase(),
        (data.estadisticasPorEstado as Array<{ _id: string; count: number }>).find((r) => r._id === status)?.count ?? 0,
      ])
    );

    const ecommerceAgg = await OrderModel.aggregate([
      { $match: { createdAt: { $gte: desdeDate, $lte: hastaDate } } },
      {
        $facet: {
          totalOrders: [{ $count: 'count' }],
          cancelledCount: [{ $match: { status: 'cancelled' } }, { $count: 'count' }],
        },
      },
    ]);

    const ecommerceData = ecommerceAgg[0] || { totalOrders: [], cancelledCount: [] };
    const totalOrders = (ecommerceData.totalOrders as Array<{ count: number }>)[0]?.count ?? 0;
    const cancelledOrdersEcom = (ecommerceData.cancelledCount as Array<{ count: number }>)[0]?.count ?? 0;

    estadisticasPorEstado['cancelled_order'] = cancelledOrdersEcom;
    estadisticasPorEstado['total_orders'] = totalOrders;

    return {
      totalReservas: (data.totalReservas as Array<{ count: number }>)[0]?.count ?? 0,
      duracionTotalMinutos: (data.duracionTotalMinutos as Array<{ total: number }>)[0]?.total ?? 0,
      ingresosTotales,
      ingresosPendientes,
      nuevosClientes: nuevosClientes[0]?.total ?? 0,
      membresiasActivas: (membresiasActivasResult as Array<{ total: number }>)[0]?.total ?? 0,
      clientesUnicos: (clientesUnicosResult as Array<{ unique: number }>)[0]?.unique ?? 0,
      estadisticasPorEstado,
      totalOrders,
      cancelledOrders: cancelledOrdersEcom,
    };
  }

  async getHeatmap(param: { year?: number; lastYear?: boolean; desde?: string; hasta?: string }): Promise<HeatmapEntry[]> {
    let dateFrom: string;
    let dateTo: string;

    if (param.desde && param.hasta) {
      dateFrom = param.desde;
      dateTo = param.hasta;
    } else if (param.lastYear) {
      const now = new Date();
      const toDateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dateFrom = toDateOnly(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
      dateTo = toDateOnly(now);
    } else {
      const year = param.year ?? new Date().getFullYear();
      dateFrom = `${year}-01-01`;
      dateTo = `${year}-12-31`;
    }

    const revenueFrom = new Date(`${dateFrom}T00:00:00.000Z`);
    const revenueTo = new Date(`${dateTo}T23:59:59.999Z`);

    const activityPipeline = [
      {
        $match: {
          date: { $gte: dateFrom, $lte: dateTo },
          status: { $in: STATUS_CATEGORIES.countsAsActivity },
        },
      },
      {
        $group: {
          _id: '$date',
          cantidad: { $sum: 1 },
        },
      },
      { $project: { _id: 0, fecha: '$_id', cantidad: 1 } },
      { $sort: { fecha: 1 } },
    ] as mongoose.PipelineStage[];

    const activity = await AppointmentModel.aggregate(activityPipeline);
    if (!param.desde || !param.hasta) return activity;

    const revenue = await this.revenueEntryRepo.getRevenueByDay(revenueFrom, revenueTo);

    const activityMap = new Map(activity.map((entry) => [entry.fecha, entry.cantidad]));
    const dates = new Set([...activityMap.keys(), ...revenue.map((entry) => entry.fecha)]);

    return [...dates].sort().map((fecha) => {
      const revenueEntry = revenue.find((entry) => entry.fecha === fecha);
      return {
        fecha,
        cantidad: activityMap.get(fecha) ?? 0,
        ingresos: revenueEntry?.ingresos ?? 0,
        porOrigen: revenueEntry?.porOrigen ?? {},
      };
    });
  }

  async getAppointmentDetails(desde: string, hasta: string): Promise<Record<string, unknown>[]> {
    const { desdeDate, hastaDate } = parseLocalDateRange(desde, hasta);
    const appointments = await AppointmentModel.aggregate([
      { $match: { date: { $gte: desde, $lte: hasta } } },
      { $sort: { date: 1, startTime: 1 } },
      { $limit: 100 },
    ] as mongoose.PipelineStage[]);

    return appointments.map((appointment) => {
      const { _id, dateObj: _dateObj, barberId, clientId, membershipId, ...rest } = appointment as Record<string, unknown> & { _id: mongoose.Types.ObjectId; barberId: mongoose.Types.ObjectId; clientId?: mongoose.Types.ObjectId; membershipId?: mongoose.Types.ObjectId };
      return {
        ...rest,
        id: _id.toString(),
        barberId: barberId.toString(),
        ...(clientId ? { clientId: clientId.toString() } : {}),
        ...(membershipId ? { membershipId: membershipId.toString() } : {}),
      };
    });
  }

  async getDistribucion(desde: string, hasta: string): Promise<DistribucionEntry[]> {
    const { desdeDate, hastaDate } = parseLocalDateRange(desde, hasta);

    const [appointmentData, barberRevenue] = await Promise.all([
      AppointmentModel.aggregate([
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
          },
        },
        { $sort: { cantidad: -1 } },
      ] as mongoose.PipelineStage[]),
      this.revenueEntryRepo.getRevenueByBarber(desdeDate, hastaDate),
    ]);

    const revenueMap = new Map(barberRevenue.map(r => [r.barberId, r.total]));
    const seenBarberIds = new Set(appointmentData.map(e => e.barberId.toString()));

    const result: DistribucionEntry[] = appointmentData.map(e => ({
      barberId: e.barberId.toString(),
      nombre: e.nombre,
      cantidad: e.cantidad,
      ingresos: revenueMap.get(e.barberId.toString()) ?? 0,
    }));

    for (const r of barberRevenue) {
      if (!seenBarberIds.has(r.barberId)) {
        result.push({
          barberId: r.barberId,
          nombre: '',
          cantidad: 0,
          ingresos: r.total,
        });
      }
    }

    result.sort((a, b) => b.cantidad - a.cantidad);
    return result;
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
    const { desdeDate, hastaDate } = parseLocalDateRange(desde, hasta);

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
    const { desdeDate, hastaDate } = parseLocalDateRange(desde, hasta);

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
    const { desdeDate, hastaDate } = parseLocalDateRange(desde, hasta);
    const pipeline = [
      DATE_CONVERSION_STAGE,
      { $match: { dateObj: { $gte: desdeDate, $lte: hastaDate }, status: { $in: STATUS_CATEGORIES.countsAsActivity } } },
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

  async getNuevosClientes(desde: string, hasta: string): Promise<NuevoClienteEntry[]> {
    const pipeline = [
      REGISTERED_AT_STAGE,
      { $match: { registeredAt: { $gte: new Date(desde), $lte: endOfDayDate(hasta) } } },
      { $sort: { registeredAt: -1 } },
      {
        $project: {
          _id: 0,
          clientId: { $toString: '$_id' },
          name: 1,
          lastname: 1,
          phone: 1,
          email: { $ifNull: ['$email', '$contactEmail'] },
          kind: { $ifNull: ['$kind', 'NoRegistrado'] },
          registeredAt: { $dateToString: { date: '$registeredAt' } },
        },
      },
    ] as mongoose.PipelineStage[];

    return Client.aggregate(pipeline);
  }

  async getIngresosPorServicio(desde: string, hasta: string): Promise<{ serviceId: string; serviceName: string; cantidad: number; ingresos: number }[]> {
    const { desdeDate, hastaDate } = parseLocalDateRange(desde, hasta);

    const [appointmentData, serviceRevenue] = await Promise.all([
      AppointmentModel.aggregate([
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
          },
        },
        {
          $project: {
            _id: 0,
            serviceId: '$_id.serviceId',
            serviceName: '$_id.serviceName',
            cantidad: 1,
          },
        },
        { $sort: { cantidad: -1 } },
      ] as mongoose.PipelineStage[]),
      this.revenueEntryRepo.getRevenueByService(desdeDate, hastaDate),
    ]);

    const revenueMap = new Map(serviceRevenue.map(r => [r.serviceId, r.total]));

    const result = appointmentData.map(e => ({
      serviceId: e.serviceId,
      serviceName: e.serviceName,
      cantidad: e.cantidad,
      ingresos: revenueMap.get(e.serviceId) ?? 0,
    }));

    result.sort((a, b) => b.ingresos - a.ingresos);
    return result;
  }

  async getClientesList(desde: string, hasta: string, search?: string): Promise<ClienteListEntry[]> {
    const { desdeDate, hastaDate } = parseLocalDateRange(desde, hasta);

    const matchStage: Record<string, unknown> = { registeredAt: { $lte: endOfDayDate(hasta) } };

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = { $regex: escaped, $options: 'i' };
      matchStage.$or = [
        { name: regex },
        { lastname: regex },
        { email: regex },
        { contactEmail: regex },
        { phone: regex },
      ];
    }

    const pipeline = [
      REGISTERED_AT_STAGE,
      { $match: matchStage },
      {
        $lookup: {
          from: 'appointments',
          let: { cid: '$_id', phone: '$phone' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$clientId', '$$cid'] },
                    {
                      $and: [
                        { $eq: [{ $type: '$clientId' }, 'missing'] },
                        { $ne: ['$$phone', null] },
                        { $eq: ['$clientPhone', '$$phone'] },
                      ],
                    },
                  ],
                },
              },
            },
            DATE_CONVERSION_STAGE,
            {
              $match: {
                $expr: {
                  $and: [
                    { $gte: ['$dateObj', desdeDate] },
                    { $lte: ['$dateObj', hastaDate] },
                    { $in: ['$status', STATUS_CATEGORIES.countsAsActivity] },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: REVENUE_ENTRIES_COLLECTION,
                let: { appointmentId: { $toString: '$_id' } },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$source', 'appointment'] },
                          { $eq: ['$referenceId', '$$appointmentId'] },
                        ],
                      },
                    },
                  },
                  { $project: { _id: 0, amount: 1 } },
                ],
                as: 'revenue',
              },
            },
            {
              $project: {
                _id: 0,
                date: 1,
                status: 1,
                servicePrice: 1,
                paymentStatus: 1,
                revenueAmount: { $ifNull: [{ $arrayElemAt: ['$revenue.amount', 0] }, 0] },
              },
            },
          ],
          as: 'turnos',
        },
      },
      {
        $lookup: {
          from: 'orders',
          let: { clientOid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', { $toString: '$$clientOid' }] }, status: { $in: ['paid', 'delivered'] } } },
            {
              $lookup: {
                from: REVENUE_ENTRIES_COLLECTION,
                let: { orderId: { $toString: '$_id' } },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$source', 'product_order'] },
                          { $eq: ['$referenceId', '$$orderId'] },
                        ],
                      },
                    },
                  },
                  { $project: { _id: 0, amount: 1 } },
                ],
                as: 'revenue',
              },
            },
            { $unwind: { path: '$revenue', preserveNullAndEmptyArrays: true } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$revenue.amount', 0] } } } },
          ],
          as: 'orderSpending',
        },
      },
      {
        $lookup: {
          from: 'memberships',
          let: { uid: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$uid'] },
                    { $eq: ['$status', 'active'] },
                    { $gte: ['$endDate', new Date()] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: 'membership',
        },
      },
      {
        $lookup: {
          from: 'memberships',
          let: { uid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$uid'] } } },
            {
              $lookup: {
                from: REVENUE_ENTRIES_COLLECTION,
                let: { membershipId: { $toString: '$_id' } },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$source', 'membership'] },
                          { $eq: ['$referenceId', '$$membershipId'] },
                        ],
                      },
                    },
                  },
                  { $project: { _id: 0, amount: 1 } },
                ],
                as: 'revenue',
              },
            },
            { $unwind: { path: '$revenue', preserveNullAndEmptyArrays: true } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$revenue.amount', 0] } } } },
          ],
          as: 'membershipSpending',
        },
      },
      {
        $project: {
          _id: 0,
          key: {
            $concat: [
              { $cond: [{ $eq: ['$kind', 'Registrado'] }, 'reg_', 'anon_'] },
              { $toString: '$_id' },
            ],
          },
          clientId: { $toString: '$_id' },
          clientName: '$name',
          clientLastname: '$lastname',
          clientPhone: '$phone',
          clientEmail: { $ifNull: ['$email', '$contactEmail'] },
          clientPhotoUrl: { $ifNull: ['$photoUrl', null] },
          kind: { $ifNull: ['$kind', 'NoRegistrado'] },
          registeredAt: { $dateToString: { date: '$registeredAt' } },
          totalVisits: { $size: '$turnos' },
          totalSpent: {
            $add: [
              {
                $sum: {
                  $map: {
                    input: '$turnos',
                    as: 't',
                    in: '$$t.revenueAmount',
                  },
                },
              },
              { $ifNull: [{ $arrayElemAt: ['$orderSpending.total', 0] }, 0] },
              { $ifNull: [{ $arrayElemAt: ['$membershipSpending.total', 0] }, 0] },
            ],
          },
          firstVisit: { $ifNull: [{ $min: '$turnos.date' }, null] },
          lastVisit: { $ifNull: [{ $max: '$turnos.date' }, null] },
          membershipStatus: {
            $cond: [{ $gt: [{ $size: '$membership' }, 0] }, 'active', null],
          },
          noShowCount: { $ifNull: ['$noShowCount', 0] },
          sancionado: { $ifNull: ['$sancionado', false] },
          fechaSancion: { $ifNull: ['$fechaSancion', null] },
          motivoSancion: { $ifNull: ['$motivoSancion', null] },
        },
      },
      { $sort: { lastVisit: -1, registeredAt: -1 } },
    ] as mongoose.PipelineStage[];

    return Client.aggregate(pipeline);
  }

  async getClientAppointments(clientKey: string): Promise<ClientAppointmentEntry[]> {
    const matchStage: Record<string, unknown> = {};
    const OBJECT_ID = /^[a-fA-F0-9]{24}$/;

    if (clientKey.startsWith('reg_')) {
      const oid = new mongoose.Types.ObjectId(clientKey.slice(4));
      matchStage.clientId = oid;
    } else if (clientKey.startsWith('anon_')) {
      const raw = clientKey.slice(5);
      if (OBJECT_ID.test(raw)) {
        const oid = new mongoose.Types.ObjectId(raw);
        const ficha = await Client.findById(oid).lean();
        matchStage.$or = [
          { clientId: oid },
          ...(ficha?.phone ? [{ clientId: { $exists: false }, clientPhone: ficha.phone }] : []),
        ];
      } else {
        matchStage.clientPhone = raw;
        matchStage.clientId = { $exists: false };
      }
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
          },
        }
      : {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$dateObj' } },
            cantidadReservas: { $sum: 1 },
          },
        };

    const pipeline = [
      DATE_CONVERSION_STAGE,
      { $match: matchStage },
      groupStage,
      { $project: { _id: 0, periodo: '$_id', cantidadReservas: 1 } },
      { $sort: { periodo: 1 } },
    ] as mongoose.PipelineStage[];

    const granularityToPeriodField: Record<string, string> = {
      diario: 'day',
      semanal: 'day',
      mensual: 'month',
      anual: 'year',
    };
    const periodField = granularityToPeriodField[filters.granularidad] ?? 'month';
    const [appointmentData, revenueByPeriod] = await Promise.all([
      AppointmentModel.aggregate(pipeline),
      this.revenueEntryRepo.getRevenueByPeriod(desdeDate, hastaDate, {
        field: periodField,
        format: dateFormat,
      }, undefined, filters.barberId),
    ]);

    const revenueMap = new Map(revenueByPeriod.map(r => [r.period, r.revenue]));
    const appointmentPeriods = new Set(appointmentData.map(e => e.periodo));

    const merged: ReservasGananciasEntry[] = appointmentData.map(entry => ({
      periodo: entry.periodo,
      cantidadReservas: entry.cantidadReservas,
      ganancias: revenueMap.get(entry.periodo) ?? 0,
    }));

    for (const r of revenueByPeriod) {
      if (!appointmentPeriods.has(r.period)) {
        merged.push({ periodo: r.period, cantidadReservas: 0, ganancias: r.revenue });
      }
    }

    merged.sort((a, b) => a.periodo.localeCompare(b.periodo));
    return merged;
  }

  async getEcommerceOverview(desde: string, hasta: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageTicket: number;
    ordersByStatus: Record<string, number>;
    paidOrders: number;
    cancelledOrders: number;
  }> {
    const { desdeDate, hastaDate } = parseLocalDateRange(desde, hasta);

    const [ordersAgg] = await Promise.all([
      OrderModel.aggregate([
        { $match: { createdAt: { $gte: desdeDate, $lte: hastaDate } } },
        {
          $facet: {
            total: [{ $count: 'count' }],
            byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          },
        },
      ]),
    ]);

    const ordersData = ordersAgg[0] || { total: [], byStatus: [] };
    const totalOrders = ordersData.total[0]?.count ?? 0;
    const byStatusArr: Array<{ _id: string; count: number }> = ordersData.byStatus || [];
    const ordersByStatus: Record<string, number> = {};
    for (const s of byStatusArr) {
      ordersByStatus[s._id] = s.count;
    }

    const paymentTotal = await this.revenueEntryRepo.getTotalByDateRange(desdeDate, hastaDate, 'product_order');
    const averageTicket = totalOrders > 0 ? Math.round(paymentTotal / totalOrders) : 0;

    return {
      totalOrders,
      totalRevenue: Math.round(paymentTotal),
      averageTicket,
      ordersByStatus,
      paidOrders: countPaidOrdersByStatus(ordersByStatus),
      cancelledOrders: ordersByStatus['cancelled'] ?? 0,
    };
  }

  async getProductPerformance(desde: string, hasta: string): Promise<{
    productId: string;
    name: string;
    totalSold: number;
    totalRevenue: number;
    timesOrdered: number;
  }[]> {
    const { desdeDate, hastaDate } = parseLocalDateRange(desde, hasta);
    return this.revenueEntryRepo.getProductPerformance(desdeDate, hastaDate);
  }

  async getMembershipRevenue(desde: string, hasta: string): Promise<ReservasGananciasEntry[]> {
    const { desdeDate, hastaDate } = parseLocalDateRange(desde, hasta);

    const entries = await this.revenueEntryRepo.getRevenueByPeriod(desdeDate, hastaDate, {
      field: 'month',
      format: '%Y-%m',
    }, 'membership', undefined, true);

    return entries.map(e => ({ periodo: e.period, ganancias: e.revenue, cantidadReservas: e.count ?? 0 }));
  }
}
