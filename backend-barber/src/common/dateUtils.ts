export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function parseLocalDateRange(desde: string, hasta: string): { desdeDate: Date; hastaDate: Date } {
  const desdeDate = parseLocalDate(desde);
  const hastaDate = parseLocalDate(hasta);
  hastaDate.setHours(23, 59, 59, 999);
  return { desdeDate, hastaDate };
}

export function buildDateRangeFilter(desde?: string, hasta?: string): Record<string, unknown> {
  if (!desde && !hasta) return {};
  const createdAt: Record<string, unknown> = {};
  if (desde && hasta) {
    const range = parseLocalDateRange(desde, hasta);
    createdAt.$gte = range.desdeDate;
    createdAt.$lte = range.hastaDate;
  } else if (desde) {
    createdAt.$gte = parseLocalDate(desde);
  } else if (hasta) {
    const d = parseLocalDate(hasta);
    d.setHours(23, 59, 59, 999);
    createdAt.$lte = d;
  }
  return { createdAt };
}
