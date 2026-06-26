type PeriodoType = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

function detectType(periodo: string): PeriodoType {
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(periodo)) return 'hourly';
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodo)) return 'daily';
  if (/^\d{4}$/.test(periodo)) return 'yearly';
  if (/^\d{4}-\d{2}$/.test(periodo)) {
    const n = parseInt(periodo.split('-')[1], 10);
    return n >= 1 && n <= 12 ? 'monthly' : 'weekly';
  }
  return 'daily';
}

export function formatFecha(periodo: string): string {
  const type = detectType(periodo);

  switch (type) {
    case 'hourly': {
      const [date, time] = periodo.split(' ');
      const [y, m, d] = date.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const dia = dt.toLocaleDateString('es-ES', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase());
      const mes = dt.toLocaleDateString('es-ES', { month: 'short' });
      return `${dia} ${d} ${mes} · ${time} hs`;
    }

    case 'daily': {
      const [y, m, d] = periodo.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const dia = dt.toLocaleDateString('es-ES', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase());
      const mes = dt.toLocaleDateString('es-ES', { month: 'short' });
      return `${dia} ${d} ${mes}`;
    }

    case 'weekly': {
      const [y, w] = periodo.split('-').map(Number);
      const jan4 = new Date(y, 0, 4);
      const startOfWeek = new Date(jan4);
      startOfWeek.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1) + (w - 1) * 7);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const mes = endOfWeek.toLocaleDateString('es-ES', { month: 'short' });
      return `${startOfWeek.getDate()}–${endOfWeek.getDate()} ${mes}`;
    }

    case 'monthly': {
      const [y, m] = periodo.split('-').map(Number);
      const dt = new Date(y, m - 1, 1);
      const mes = dt.toLocaleDateString('es-ES', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());
      return `${mes} ${y}`;
    }

    case 'yearly':
      return periodo;
  }
}
