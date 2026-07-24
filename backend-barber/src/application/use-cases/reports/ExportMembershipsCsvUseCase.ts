import { MembershipModel } from '../../../infrastructure/repositories/mongodb/models/membership.model';
import { parseLocalDateRange, parseLocalDate } from '../../../common/dateUtils';

export interface ExportMembershipsCsvDTO {
  desde?: string;
  hasta?: string;
  status?: string;
}

export class ExportMembershipsCsvUseCase {
  async execute(dto: ExportMembershipsCsvDTO): Promise<string> {
    const filter: Record<string, unknown> = {};
    if (dto.status) filter.status = dto.status;
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

    return [header, ...rows].join('\n');
  }
}
