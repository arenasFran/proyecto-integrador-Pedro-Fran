import { MembershipModel } from '../../../infrastructure/repositories/mongodb/models/membership.model';
import { buildDateRangeFilter } from '../../../common/dateUtils';

export interface ExportMembershipsCsvDTO {
  desde?: string;
  hasta?: string;
  status?: string;
}

export class ExportMembershipsCsvUseCase {
  async execute(dto: ExportMembershipsCsvDTO): Promise<string> {
    const filter: Record<string, unknown> = {};
    if (dto.status) filter.status = dto.status;
    Object.assign(filter, buildDateRangeFilter(dto.desde, dto.hasta));

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
