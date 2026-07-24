import { PaymentModel } from '../../../infrastructure/repositories/mongodb/models/payment.model';
import { parseLocalDateRange, parseLocalDate } from '../../../common/dateUtils';

export interface ExportSalesCsvDTO {
  desde?: string;
  hasta?: string;
}

export class ExportSalesCsvUseCase {
  async execute(dto: ExportSalesCsvDTO): Promise<string> {
    const filter: Record<string, unknown> = { status: 'approved' };
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

    return [header, ...rows].join('\n');
  }
}
