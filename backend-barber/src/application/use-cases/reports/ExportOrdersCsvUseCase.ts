import { OrderModel } from '../../../infrastructure/repositories/mongodb/models/order.model';
import { buildDateRangeFilter } from '../../../common/dateUtils';

export interface ExportOrdersCsvDTO {
  desde?: string;
  hasta?: string;
  status?: string;
}

export class ExportOrdersCsvUseCase {
  async execute(dto: ExportOrdersCsvDTO): Promise<string> {
    const filter: Record<string, unknown> = {};
    Object.assign(filter, buildDateRangeFilter(dto.desde, dto.hasta));
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
