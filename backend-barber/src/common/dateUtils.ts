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
