import { useState, useMemo, useEffect } from 'react';
import { Select } from '../../../../components/common/Select';
import { AppointmentListModal } from '../../../../components/common/AppointmentListModal';
import { useGetHeatmapQuery, useGetAvailableYearsQuery } from '../../../../services/analyticsApi';
import { formatCurrency } from '../../../../utils/formatCurrency';

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

function getIntensity(cantidad: number, ingresos: number, max: number): string {
  if (cantidad === 0 && ingresos === 0) return 'bg-[#161616]';
  const ratio = max > 0 ? (ingresos > 0 ? ingresos / max : cantidad / max) : 0;
  if (ratio <= 0.25) return 'bg-[#3D1A00]';
  if (ratio <= 0.5) return 'bg-[#7A3B00]';
  if (ratio <= 0.75) return 'bg-[#C25E00]';
  return 'bg-[#FF5C00]';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

interface HeatmapChartProps {
  desde?: string;
  hasta?: string;
}

export default function HeatmapChart({ desde, hasta }: HeatmapChartProps = {}) {
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [tooltip, setTooltip] = useState<{ fecha: string; cantidad: number; ingresos: number; porOrigen: Record<string, number>; x: number; y: number } | null>(null);
  const [modalDate, setModalDate] = useState<string | null>(null);

  const { data: availableYears = [], isLoading: yearsLoading } = useGetAvailableYearsQuery();
  const mostRecentYear = availableYears[0];
  useEffect(() => {
    if (selectedYear === undefined && mostRecentYear !== undefined) setSelectedYear(mostRecentYear);
  }, [mostRecentYear, selectedYear]);

  const controlled = desde !== undefined && hasta !== undefined;
  const params = controlled
    ? { desde, hasta }
    : selectedYear ? { year: selectedYear } : { lastYear: true as const };
  const { data = [], isFetching, isLoading, error: rtkError } = useGetHeatmapQuery(params, {
    skip: selectedYear === undefined,
  });

  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al cargar heatmap'
    : null;
  const loading = isLoading || yearsLoading;

  const yearGrid = useMemo(() => {
    if (selectedYear === undefined) return [];
    return generateYearGrid(selectedYear);
  }, [selectedYear]);

  const maxValue = useMemo(() => Math.max(...data.map((d) => d.ingresos ?? d.cantidad), 1), [data]);
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of data) {
      map.set(entry.fecha, entry.cantidad);
    }
    return map;
  }, [data]);
  const revenueMap = useMemo(() => new Map(data.map((entry) => [entry.fecha, entry.ingresos ?? 0])), [data]);

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
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5 max-w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white text-base font-bold">Actividad e ingresos por día</h3>
          <p className="text-[11px] text-[#6A6A6A] mt-1">La intensidad combina reservas confirmadas e ingresos cobrados</p>
        </div>
        {!controlled && <Select
          label="Año"
          value={selectedYear !== undefined ? String(selectedYear) : ''}
          onChange={(v) => setSelectedYear(v ? Number(v) : undefined)}
          options={[
            ...(availableYears.length === 0 ? [{ value: '', label: 'Sin datos' }] : []),
            ...availableYears.map((y) => ({ value: String(y), label: String(y) })),
          ]}
        />}
      </div>

      {error && <p className="text-[#FF5C00] text-sm mb-2">{error}</p>}

      <div style={{ position: 'relative' }}>
        {isFetching && data.length > 0 && (
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
                        className={`w-full aspect-square rounded-sm ${day.date ? getIntensity(day.cantidad, revenueMap.get(day.date) ?? 0, maxValue) : 'transparent'} cursor-pointer relative focus:outline-none focus:ring-2 focus:ring-[#FF5C00]`}
                        role={day.date ? 'button' : undefined}
                        tabIndex={day.date ? 0 : -1}
                        aria-label={day.date ? `${formatDate(day.date)}: ${day.cantidad} reservas, ${formatCurrency(revenueMap.get(day.date) ?? 0)} cobrados` : undefined}
                        onClick={() => {
                          if (day.date) {
                            setModalDate(day.date);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (day.date && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            setModalDate(day.date);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (day.date) {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            const entry = data.find((item) => item.fecha === day.date);
                            setTooltip({ fecha: day.date, cantidad: day.cantidad, ingresos: entry?.ingresos ?? 0, porOrigen: entry?.porOrigen ?? {}, x: rect.left, y: rect.top - 8 });
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
          <p className="text-green-400">{formatCurrency(tooltip.ingresos)} cobrados</p>
          {Object.entries(tooltip.porOrigen).map(([source, amount]) => (
            <p key={source} className="text-[#8A8A8A]">{source === 'appointment' ? 'Turnos' : source === 'product_order' ? 'Tienda' : 'Membresías'}: {formatCurrency(amount)}</p>
          ))}
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

      <AppointmentListModal
        isOpen={modalDate !== null}
        onClose={() => setModalDate(null)}
        title={`Turnos del ${modalDate ? formatDate(modalDate) : ''}`}
        params={{ dateFrom: modalDate ?? undefined, dateTo: modalDate ?? undefined }}
      />
    </div>
  );
}
