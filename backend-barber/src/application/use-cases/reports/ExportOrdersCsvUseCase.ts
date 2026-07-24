import { OrderModel } from '../../../infrastructure/repositories/mongodb/models/order.model';
import { parseLocalDateRange, parseLocalDate } from '../../../common/dateUtils';

export interface ExportOrdersCsvDTO {
  desde?: string;
  hasta?: string;
  status?: string;
}

export class ExportOrdersCsvUseCase {
  async execute(dto: ExportOrdersCsvDTO): Promise<string> {
    const filter: Record<string, unknown> = {};
    if (dto.desde || dto.hasta) {
      filter.createdAt = {};
      if (dto.desde && dto.hasta) {
        const range = parseLocalDateRange(dto.desde, dto.hasta);
        (filter.createdAt as Record<string, unknown>).$gte = range.desdeDate;
        (filter.createdAt as Record<string, unknown>).$lte = range.hastaDate;
      } else if (dto.desde) {
        (filter.createdAt as Record<string, unknown>).$gte = parseLocalDate(dto.desde);
      } else if (dto.hasta) {
        const d = parseLocalDate(dto.hasta);
        d.setHours(23, 59, 59, 999);
        (filter.createdAt as Record<string, unknown>).$lte = d;
      }
    }
    if (dto.status) filter.status = dto.status;

    const orders = await OrderModel.find(filter).sort({ createdAt: -1 }).lean();

    const header = 'ID,Usuario,Total,Estado,Items,Creado';
    const rows = orders.map((o) =>
      [
        o._id.toString(),
        o.userId,
        o.total,
        o.status,
        o.items.map((i: { name: string; quantity: number }) => `${i.name}x${i.quantity}`).join(';'),
        o.createdAt?.toISOString() ?? '',
      ].join(',')
    );

    return [header, ...rows].join('\n');
  }
}
