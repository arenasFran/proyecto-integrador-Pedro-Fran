import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useGetHorasQuery } from '../../../../services/analyticsApi';
import { ChartContainer } from '../../../../components/common';
import DateRangeFilter from '../../../../components/common/DateRangeFilter';

function formatHora(hora: number): string {
  return `${String(hora).padStart(2, '0')}:00`;
}

export default function HourDistributionChart() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const { data = [], isFetching, isLoading, error: rtkError } = useGetHorasQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );

  const loading = isLoading;
  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al cargar distribución por hora'
    : null;

  const chartData = useMemo(() => {
    const full: { hora: number; cantidad: number; label: string }[] = [];
    const map = new Map(data.map(d => [d.hora, d.cantidad]));
    for (let h = 7; h <= 22; h++) {
      full.push({ hora: h, cantidad: map.get(h) ?? 0, label: formatHora(h) });
    }
    return full;
  }, [data]);

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5 max-w-full">
      <h3 className="text-white text-base font-bold mb-4">Turnos por hora del día</h3>

      <div className="mb-2">
        <DateRangeFilter onChange={(d, h) => { setDesde(d); setHasta(h); }} />
      </div>

      {error && <p className="text-[#FF5C00] text-sm mb-2">{error}</p>}

      <ChartContainer isFetching={isFetching} loading={loading} hasData={chartData.some(d => d.cantidad > 0)} height={280} className="mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#8A8A8A', fontSize: 12 }}
              stroke="#282828"
            />
            <YAxis tick={{ fill: '#8A8A8A', fontSize: 12 }} stroke="#282828" allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #282828', borderRadius: 8, color: '#fff' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => [value, 'Turnos']}
            />
            <Bar dataKey="cantidad" fill="#FF5C00" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="flex items-center gap-2 mt-3 text-[12px] text-[#8A8A8A]">
        <span>Horas pico:</span>
        {[...chartData]
          .sort((a, b) => b.cantidad - a.cantidad)
          .filter(d => d.cantidad > 0)
          .slice(0, 3)
          .map((d) => (
            <span key={`peak-${d.hora}`} className="bg-[#1A1A1A] px-2 py-0.5 rounded-full text-[#FF5C00] font-medium">
              {d.label} ({d.cantidad})
            </span>
          ))}
      </div>
    </div>
  );
}
