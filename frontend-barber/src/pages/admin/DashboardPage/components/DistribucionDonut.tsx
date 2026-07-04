import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useGetDistribucionQuery } from '../../../../services/analyticsApi';
import { ChartContainer } from '../../../../components/common';
import DateRangeFilter from '../../../../components/common/DateRangeFilter';

const COLORS = ['#FF5C00', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('es-UY');
}

export default function DistribucionDonut() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const { data, isFetching, isLoading, error: rtkError } = useGetDistribucionQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );

  const dataEntries = data?.byBarber ?? [];
  const loading = isLoading;
  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al cargar distribución'
    : null;

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5 max-w-full">
      <h3 className="text-white text-base font-bold mb-4">Distribución de reservas por barbero</h3>

      <div className="mb-2">
        <DateRangeFilter onChange={(d, h) => { setDesde(d); setHasta(h); }} />
      </div>

      {error && <p className="text-[#FF5C00] text-sm mb-2">{error}</p>}

      <ChartContainer isFetching={isFetching} loading={loading} hasData={dataEntries.length > 0}>
        <div className="flex justify-center">
          <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="w-[280px] h-[280px] max-w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataEntries}
                  dataKey="cantidad"
                  nameKey="nombre"
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={130}
                  stroke="none"
                >
                  {dataEntries.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #282828', borderRadius: 8, color: '#fff' }}
                  labelStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col gap-2">
            {dataEntries.map((entry, i) => {
              const ticketPromedio = entry.cantidad > 0 ? entry.ingresos / entry.cantidad : 0;
              return (
                <div key={entry.barberId} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-white whitespace-nowrap">{entry.nombre}</span>
                  <span className="text-[#8A8A8A] whitespace-nowrap">{entry.cantidad} · {formatCurrency(entry.ingresos)}</span>
                  <span className="text-[10px] text-[#6A6A6A] border border-[#282828] rounded-full px-1.5 py-0.5 whitespace-nowrap">
                    Ø {formatCurrency(Math.round(ticketPromedio))}
                  </span>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      </ChartContainer>
    </div>
  );
}
