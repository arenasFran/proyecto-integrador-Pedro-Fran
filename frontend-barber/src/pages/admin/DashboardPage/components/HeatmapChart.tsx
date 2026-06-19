import { useState, useMemo } from 'react';
import { useGetHeatmapQuery } from '../../../../services/analyticsApi';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { label: 'Último año', value: undefined },
  ...Array.from({ length: CURRENT_YEAR - 2021 + 1 }, (_, i) => ({
    label: String(2022 + i),
    value: 2022 + i,
  })),
];

function generateYearGrid(year: number): { date: string; dayOfWeek: number }[] {
  const days: { date: string; dayOfWeek: number }[] = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const current = new Date(start);
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    days.push({ date: `${y}-${m}-${d}`, dayOfWeek: current.getDay() });
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function getIntensity(cantidad: number, max: number): string {
  if (cantidad === 0) return 'bg-[#1A1A1A]';
  const ratio = cantidad / max;
  if (ratio <= 0.25) return 'bg-[#FF5C00]/30';
  if (ratio <= 0.5) return 'bg-[#FF5C00]/50';
  if (ratio <= 0.75) return 'bg-[#FF5C00]/70';
  return 'bg-[#FF5C00]';
}

export default function HeatmapChart() {
  const [selectedYear, setSelectedYear] = useState<number | undefined>(CURRENT_YEAR);
  const [tooltip, setTooltip] = useState<{ fecha: string; cantidad: number; x: number; y: number } | null>(null);

  const isUltimoAnio = selectedYear === undefined;
  const effectiveYear = selectedYear ?? CURRENT_YEAR;

  const params = isUltimoAnio ? { ultimoAnio: true as const } : { anio: selectedYear! };
  const { data = [], isLoading, error: rtkError } = useGetHeatmapQuery(params);

  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al carrar heatmap'
    : null;
  const loading = isLoading;

  const yearGrid = useMemo(() => generateYearGrid(effectiveYear), [effectiveYear]);
  const maxCantidad = useMemo(() => Math.max(...data.map((d) => d.cantidad), 1), [data]);
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of data) {
      map.set(entry.fecha, entry.cantidad);
    }
    return map;
  }, [data]);

  const weeks = useMemo(() => {
    const w: { date: string; dayOfWeek: number; cantidad: number }[][] = [];
    let currentWeek: { date: string; dayOfWeek: number; cantidad: number }[] = [];

    const firstDay = yearGrid[0]?.dayOfWeek ?? 0;
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push({ date: '', dayOfWeek: i, cantidad: 0 });
    }

    for (const day of yearGrid) {
      currentWeek.push({ ...day, cantidad: dataMap.get(day.date) ?? 0 });
      if (day.dayOfWeek === 6) {
        w.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      w.push(currentWeek);
    }
    return w;
  }, [yearGrid, dataMap]);

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-base font-bold">Heatmap</h3>
        <select
          value={isUltimoAnio ? '' : selectedYear}
          onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : undefined)}
          className="bg-[#1A1A1A] border border-[#282828] rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#FF5C00]"
        >
          {YEAR_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value ?? ''}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-[#FF5C00] text-sm mb-2">{error}</p>}

      <div className="relative overflow-x-auto">
        {loading ? (
          <div className="flex gap-1">
            {Array.from({ length: 20 }).map((_, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {Array.from({ length: 7 }).map((_, di) => (
                  <div key={di} className="w-3 h-3 rounded-sm bg-[#242424] animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-0.5">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <div
                    key={`${wi}-${di}`}
                    className={`w-3 h-3 rounded-sm ${day.date ? getIntensity(day.cantidad, maxCantidad) : 'transparent'} cursor-pointer relative`}
                    onMouseEnter={(e) => {
                      if (day.date) {
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setTooltip({ fecha: day.date, cantidad: day.cantidad, x: rect.left, y: rect.top - 8 });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {tooltip && (
        <div
          className="fixed bg-[#242424] text-white text-xs px-2 py-1 rounded-lg border border-[#282828] pointer-events-none z-50"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.fecha}: {tooltip.cantidad} turno{tooltip.cantidad !== 1 ? 's' : ''}
        </div>
      )}

      <div className="flex items-center justify-end gap-1 mt-3">
        <span className="text-[#8A8A8A] text-xs">Menos</span>
        <div className="w-3 h-3 rounded-sm bg-[#1A1A1A]" />
        <div className="w-3 h-3 rounded-sm bg-[#FF5C00]/30" />
        <div className="w-3 h-3 rounded-sm bg-[#FF5C00]/50" />
        <div className="w-3 h-3 rounded-sm bg-[#FF5C00]/70" />
        <div className="w-3 h-3 rounded-sm bg-[#FF5C00]" />
        <span className="text-[#8A8A8A] text-xs">Más</span>
      </div>
    </div>
  );
}
