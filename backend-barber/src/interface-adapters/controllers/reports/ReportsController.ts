import { Request, Response } from 'express';
import { OrderModel } from '../../../infrastructure/repositories/mongodb/models/order.model';
import { PaymentModel } from '../../../infrastructure/repositories/mongodb/models/payment.model';
import { ProductModel } from '../../../infrastructure/repositories/mongodb/models/product.model';
import { MembershipModel } from '../../../infrastructure/repositories/mongodb/models/membership.model';
import { sendError } from '../../../common/response';
import { parseLocalDateRange, parseLocalDate } from '../../../common/dateUtils';

export class ReportsController {
  exportOrdersCsv = async (req: Request, res: Response) => {
    try {
      const { desde, hasta, status } = req.query as Record<string, string | undefined>;
      const filter: Record<string, unknown> = {};
      if (desde || hasta) {
        filter.createdAt = {};
        if (desde && hasta) {
          const range = parseLocalDateRange(desde, hasta);
          (filter.createdAt as Record<string, unknown>).$gte = range.desdeDate;
          (filter.createdAt as Record<string, unknown>).$lte = range.hastaDate;
        } else if (desde) {
          (filter.createdAt as Record<string, unknown>).$gte = parseLocalDate(desde);
        } else if (hasta) {
          const d = parseLocalDate(hasta);
          d.setHours(23, 59, 59, 999);
          (filter.createdAt as Record<string, unknown>).$lte = d;
        }
      }
      if (status) filter.status = status;

      const orders = await OrderModel.find(filter).sort({ createdAt: -1 }).lean();

      const header = 'ID,Usuario,Total,Estado,Items,Creado';
      const rows = orders.map((o) =>
        [
          o._id.toString(),
          o.userId,
          o.total,
          o.status,
          o.items.map((i) => `${i.name}x${i.quantity}`).join(';'),
          o.createdAt?.toISOString() ?? '',
        ].join(',')
      );

      const csv = [header, ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ordenes.csv"');
      return res.status(200).send(csv);
    } catch (error) {
      return sendError(res, error, 'Error al exportar órdenes');
    }
  };

  exportSalesCsv = async (req: Request, res: Response) => {
    try {
      const { desde, hasta } = req.query as Record<string, string | undefined>;
      const filter: Record<string, unknown> = { status: 'approved' };
      if (desde || hasta) {
        filter.createdAt = {};
        if (desde && hasta) {
          const range = parseLocalDateRange(desde, hasta);
          (filter.createdAt as Record<string, unknown>).$gte = range.desdeDate;
          (filter.createdAt as Record<string, unknown>).$lte = range.hastaDate;
        } else if (desde) {
          (filter.createdAt as Record<string, unknown>).$gte = parseLocalDate(desde);
        } else if (hasta) {
          const d = parseLocalDate(hasta);
          d.setHours(23, 59, 59, 999);
          (filter.createdAt as Record<string, unknown>).$lte = d;
        }
      }

      const payments = await PaymentModel.find(filter).sort({ createdAt: -1 }).lean();

      const header = 'ID,Tipo,Referencia,Monto,Moneda,Usuario,Creado';
      const rows = payments.map((p) =>
        [
          p._id.toString(),
          p.type,
          p.referenceId,
          p.amount,
          p.currency,
          p.userId.toString(),
          p.createdAt?.toISOString() ?? '',
        ].join(',')
      );

      const csv = [header, ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ventas.csv"');
      return res.status(200).send(csv);
    } catch (error) {
      return sendError(res, error, 'Error al exportar ventas');
    }
  };

  exportProductsCsv = async (_req: Request, res: Response) => {
    try {
      const products = await ProductModel.find({ status: { $ne: 'deleted' } }).sort({ name: 1 }).lean();

      const header = 'ID,Nombre,Categoría,Precio,Stock,Estado';
      const rows = products.map((p) =>
        [p._id.toString(), p.name, p.category, p.price, p.stock, p.status].join(',')
      );

      const csv = [header, ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="productos.csv"');
      return res.status(200).send(csv);
    } catch (error) {
      return sendError(res, error, 'Error al exportar productos');
    }
  };

  exportMembershipsCsv = async (req: Request, res: Response) => {
    try {
      const { desde, hasta, status } = req.query as Record<string, string | undefined>;
      const filter: Record<string, unknown> = {};
      if (status) filter.status = status;
      if (desde || hasta) {
        filter.createdAt = {};
        if (desde && hasta) {
          const range = parseLocalDateRange(desde, hasta);
          (filter.createdAt as Record<string, unknown>).$gte = range.desdeDate;
          (filter.createdAt as Record<string, unknown>).$lte = range.hastaDate;
        } else if (desde) {
          (filter.createdAt as Record<string, unknown>).$gte = parseLocalDate(desde);
        } else if (hasta) {
          const d = parseLocalDate(hasta);
          d.setHours(23, 59, 59, 999);
          (filter.createdAt as Record<string, unknown>).$lte = d;
        }
      }

      const memberships = await MembershipModel.find(filter).sort({ createdAt: -1 }).lean();

      const header = 'ID,Usuario,Precio,Estado,Inicio,Fin,CuponesUsados,CuponesTotal,Creado';
      const rows = memberships.map((m) =>
        [
          m._id.toString(),
          m.userId.toString(),
          m.price,
          m.status,
          m.startDate?.toISOString() ?? '',
          m.endDate?.toISOString() ?? '',
          m.couponsUsed,
          m.couponsTotal,
          m.createdAt?.toISOString() ?? '',
        ].join(',')
      );

      const csv = [header, ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="membresias.csv"');
      return res.status(200).send(csv);
    } catch (error) {
      return sendError(res, error, 'Error al exportar membresías');
    }
  };
}