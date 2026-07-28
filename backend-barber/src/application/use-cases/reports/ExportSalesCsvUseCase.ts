import { PaymentModel } from '../../../infrastructure/repositories/mongodb/models/payment.model';
import { buildDateRangeFilter } from '../../../common/dateUtils';

export interface ExportSalesCsvDTO {
  desde?: string;
  hasta?: string;
}

export class ExportSalesCsvUseCase {
  async execute(dto: ExportSalesCsvDTO): Promise<string> {
    const filter: Record<string, unknown> = { status: 'approved' };
    Object.assign(filter, buildDateRangeFilter(dto.desde, dto.hasta));

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
