import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useGetIngresosPorServicioQuery } from '../../../../services/analyticsApi';
import { ChartContainer } from '../../../../components/common';
import DateRangeFilter from '../../../../components/common/DateRangeFilter';

const COLORS = ['#FF5C00', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('es-UY');
}

export default function RevenueByServiceChart() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const { data = [], isFetching, isLoading, error: rtkError } = useGetIngresosPorServicioQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );

  const loading = isLoading;
  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al cargar ingresos por servicio'
    : null;

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5 max-w-full">
      <h3 className="text-white text-base font-bold mb-4">Ingresos por servicio</h3>

      <div className="mb-2">
        <DateRangeFilter onChange={(d, h) => { setDesde(d); setHasta(h); }} />
      </div>

      {error && <p className="text-[#FF5C00] text-sm mb-2">{error}</p>}

      <ChartContainer isFetching={isFetching} loading={loading} hasData={data.length > 0} height={300} className="mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
            <XAxis
              type="number"
              tick={{ fill: '#8A8A8A', fontSize: 12 }}
              stroke="#282828"
              tickFormatter={(v) => formatCurrency(v)}
            />
            <YAxis
              type="category"
              dataKey="serviceName"
              tick={{ fill: '#8A8A8A', fontSize: 12 }}
              stroke="#282828"
              width={120}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #282828', borderRadius: 8, color: '#fff' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => [formatCurrency(value as number), 'Ingresos']}
            />
            <Bar dataKey="ingresos" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      {data.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-4">
          {data.map((entry, i) => (
            <div key={entry.serviceId} className="flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-white">{entry.serviceName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#8A8A8A]">{entry.cantidad} turnos</span>
                <span className="text-green-400 font-medium w-20 text-right">{formatCurrency(entry.ingresos)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
