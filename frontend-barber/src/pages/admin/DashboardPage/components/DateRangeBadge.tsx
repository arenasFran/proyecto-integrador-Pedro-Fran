import { FiCalendar } from 'react-icons/fi';

function computePeriodLabel(desde: string, hasta: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(desde + 'T00:00:00');
  const h = new Date(hasta + 'T23:59:59');
  const diffMs = h.getTime() - d.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.getTime() === today.getTime() && h.toDateString() === today.toDateString()) return 'Hoy';
  if (d.getTime() === yesterday.getTime() && h.toDateString() === yesterday.toDateString()) return 'Ayer';
  if (d.getTime() === tomorrow.getTime() && h.toDateString() === tomorrow.toDateString()) return 'Mañana';

  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  if (d.getTime() === weekStart.getTime() && h.toDateString() === weekEnd.toDateString()) return 'Esta semana';

  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(weekStart.getDate() - 7);
  const lastWeekEnd = new Date(lastWeekStart); lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
  if (d.getTime() === lastWeekStart.getTime() && h.toDateString() === lastWeekEnd.toDateString()) return 'Semana pasada';

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  if (d.getTime() === monthStart.getTime() && h.toDateString() === monthEnd.toDateString()) return 'Este mes';

  const yearStart = new Date(today.getFullYear(), 0, 1);
  const yearEnd = new Date(today.getFullYear(), 11, 31);
  if (d.getTime() === yearStart.getTime() && h.toDateString() === yearEnd.toDateString()) return 'Este año';

  if (diffDays <= 1) return '1 día';
  if (diffDays <= 7) return `${diffDays} días`;
  if (diffDays <= 31) return `${Math.round(diffDays / 7)} semanas`;
  if (diffDays <= 365) return `${Math.round(diffDays / 30)} meses`;
  return '';
}

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface DateRangeBadgeProps {
  desde: string;
  hasta: string;
  iconColor?: string;
}

export default function DateRangeBadge({ desde, hasta, iconColor = 'text-[#FF5C00]' }: DateRangeBadgeProps) {
  const periodLabel = computePeriodLabel(desde, hasta);

  return (
    <div className="flex items-center gap-2 flex-wrap -mt-1 mb-4">
      <div className="rounded-[8px] bg-[#1A1A1A] border border-[#282828] px-3 py-1.5 flex items-center gap-1.5">
        <FiCalendar size={13} className={`${iconColor} shrink-0`} />
        <span className="text-[11px] sm:text-[12px] text-[#8A8A8A]">{formatDisplayDate(desde)}</span>
        <span className="text-[10px] text-[#555]">→</span>
        <span className="text-[11px] sm:text-[12px] text-[#8A8A8A]">{formatDisplayDate(hasta)}</span>
      </div>
      {periodLabel && (
        <span className="text-[11px] text-[#6A6A6A] font-medium bg-[#1A1A1A] border border-[#333] rounded-full px-2.5 py-1">{periodLabel}</span>
      )}
    </div>
  );
}
