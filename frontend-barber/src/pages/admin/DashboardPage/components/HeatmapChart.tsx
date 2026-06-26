import { useState, useMemo, useEffect } from 'react';
import { useGetHeatmapQuery, useGetAvailableYearsQuery } from '../../../../services/analyticsApi';

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

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
  if (cantidad === 0) return 'bg-[#161616]';
  const ratio = cantidad / max;
  if (ratio <= 0.25) return 'bg-[#3D1A00]';
  if (ratio <= 0.5) return 'bg-[#7A3B00]';
  if (ratio <= 0.75) return 'bg-[#C25E00]';
  return 'bg-[#FF5C00]';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function HeatmapChart() {
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [tooltip, setTooltip] = useState<{ fecha: string; cantidad: number; x: number; y: number } | null>(null);

  const { data: availableYears = [], isLoading: yearsLoading } = useGetAvailableYearsQuery();
  const mostRecentYear = availableYears[0];

  useEffect(() => {
    if (mostRecentYear !== undefined && selectedYear === undefined) {
      setSelectedYear(mostRecentYear);
    }
  }, [mostRecentYear, selectedYear, setSelectedYear]);

  const params = selectedYear ? { anio: selectedYear } : { ultimoAnio: true as const };
  const { data = [], isFetching, error: rtkError } = useGetHeatmapQuery(params, {
    skip: selectedYear === undefined,
  });

  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al cargar heatmap'
    : null;
  const loading = isFetching || yearsLoading;

  const yearGrid = useMemo(() => {
    if (selectedYear === undefined) return [];
    return generateYearGrid(selectedYear);
  }, [selectedYear]);

  const maxCantidad = useMemo(() => Math.max(...data.map((d) => d.cantidad), 1), [data]);
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of data) {
      map.set(entry.fecha, entry.cantidad);
    }
    return map;
  }, [data]);

  const weeks = useMemo(() => {
    if (yearGrid.length === 0) return [];

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

    while (currentWeek.length < 7) {
      currentWeek.push({ date: '', dayOfWeek: currentWeek.length, cantidad: 0 });
    }
    if (currentWeek.length > 0) {
      w.push(currentWeek);
    }

    return w;
  }, [yearGrid, dataMap]);

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-base font-bold">Actividad</h3>
        <select
          value={selectedYear ?? ''}
          onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : undefined)}
          className="bg-[#1A1A1A] border border-[#282828] rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#FF5C00]"
        >
          {availableYears.length === 0 && <option value="">Sin datos</option>}
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-[#FF5C00] text-sm mb-2">{error}</p>}

      <div style={{ position: 'relative' }}>
        {isFetching && !loading && (
          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, opacity: 1 }}>
            <div className="w-4 h-4 border-2 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div style={{ opacity: isFetching ? 0.4 : 1, transition: 'opacity 0.3s ease' }}>
        {loading ? (
          <div className="flex gap-[3px]">
            {Array.from({ length: 20 }).map((_, wi) => (
              <div key={wi} className="flex flex-col gap-[3px] flex-1">
                {Array.from({ length: 7 }).map((_, di) => (
                  <div key={di} className="w-full aspect-square rounded-sm bg-[#242424] animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : selectedYear === undefined ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-[#8A8A8A] text-sm">No hay datos disponibles</p>
          </div>
        ) : (
          <div className="pt-[14px] overflow-x-auto">
            <div style={{ minWidth: '600px' }}>
              <div className="flex gap-[3px]">
                <div className="w-8 shrink-0" />
                {weeks.map((week, wi) => {
                  const firstReal = week.find(d => d.date !== '');
                  if (!firstReal) return <div key={wi} className="flex-1" />;
                  const month = new Date(firstReal.date + 'T00:00:00').getMonth();
                  const prevWeek = wi > 0 ? weeks[wi - 1].find(d => d.date !== '') : null;
                  const prevMonth = prevWeek ? new Date(prevWeek.date + 'T00:00:00').getMonth() : -1;
                  return (
                    <div key={wi} className="flex-1 text-[10px] text-[#8A8A8A] leading-none whitespace-nowrap pointer-events-none select-none">
                      {month !== prevMonth ? MONTHS_SHORT[month] : ''}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-[3px]">
                <div className="flex flex-col gap-[3px] w-8 shrink-0">
                  {Array.from({ length: 7 }, (_, i) => (
                    <div key={i} className="flex-1 flex items-center justify-end pr-1 text-[10px] text-[#8A8A8A] leading-none">
                      {i === 1 ? 'Lun' : i === 3 ? 'Mié' : i === 5 ? 'Vie' : ''}
                    </div>
                  ))}
                </div>

                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px] flex-1 min-w-0">
                    {week.map((day, di) => (
                      <div
                        key={`${wi}-${di}`}
                        className={`w-full aspect-square rounded-sm ${day.date ? getIntensity(day.cantidad, maxCantidad) : 'transparent'} cursor-pointer relative`}
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
            </div>
          </div>
        )}
      </div>
      </div>

      {tooltip && (
        <div
          className="fixed bg-[#242424] text-white text-xs px-3 py-1.5 rounded-lg border border-[#282828] pointer-events-none z-50 leading-relaxed"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-medium text-white">{formatDate(tooltip.fecha)}</p>
          <p className="text-[#FF5C00]">{tooltip.cantidad} reserva{tooltip.cantidad !== 1 ? 's' : ''}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-1 mt-3">
        <span className="text-[#8A8A8A] text-xs">Menos</span>
        <div className="w-3 h-3 rounded-sm bg-[#161616]" />
        <div className="w-3 h-3 rounded-sm bg-[#3D1A00]" />
        <div className="w-3 h-3 rounded-sm bg-[#7A3B00]" />
        <div className="w-3 h-3 rounded-sm bg-[#C25E00]" />
        <div className="w-3 h-3 rounded-sm bg-[#FF5C00]" />
        <span className="text-[#8A8A8A] text-xs">Más</span>
      </div>
    </div>
  );
}
