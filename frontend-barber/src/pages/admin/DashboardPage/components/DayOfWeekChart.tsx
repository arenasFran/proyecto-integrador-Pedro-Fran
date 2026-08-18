import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useGetDiasSemanaQuery } from '../../../../services/analyticsApi';
import { ChartContainer } from '../../../../components/common';
import DateRangeFilter from '../../../../components/common/DateRangeFilter';

const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface DayOfWeekChartProps { desde?: string; hasta?: string }

export default function DayOfWeekChart({ desde: desdeProp, hasta: hastaProp }: DayOfWeekChartProps = {}) {
  const [internalDesde, setInternalDesde] = useState('');
  const [internalHasta, setInternalHasta] = useState('');
  const desde = desdeProp ?? internalDesde;
  const hasta = hastaProp ?? internalHasta;
  const controlled = desdeProp !== undefined && hastaProp !== undefined;

  const { data = [], isFetching, isLoading, error: rtkError } = useGetDiasSemanaQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );

  const loading = isLoading;
  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al cargar distribución por día'
    : null;

  const chartData = DAY_ORDER.map(dia => {
    const entry = data.find(e => e.diaNombre === dia);
    return { dia, cantidad: entry?.cantidad ?? 0 };
  });

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5 max-w-full">
      <h3 className="text-white text-base font-bold mb-4">Turnos por día de la semana</h3>

      {!controlled && <div className="mb-2"><DateRangeFilter onChange={(d, h) => { setInternalDesde(d); setInternalHasta(h); }} /></div>}

      {error && <p className="text-[#FF5C00] text-sm mb-2">{error}</p>}

      <ChartContainer isFetching={isFetching} loading={loading} hasData={chartData.some(d => d.cantidad > 0)} height={280} className="mt-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
            <XAxis
              dataKey="dia"
              tick={{ fill: '#8A8A8A', fontSize: 12 }}
              stroke="#282828"
            />
            <YAxis tick={{ fill: '#8A8A8A', fontSize: 12 }} stroke="#282828" allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #282828', borderRadius: 8, color: '#fff' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => [value, 'Turnos']}
            />
            <Bar dataKey="cantidad" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
