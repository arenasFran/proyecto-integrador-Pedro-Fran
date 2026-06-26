import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useGetReservasGananciasQuery } from '../../../../services/analyticsApi';
import type { Granularidad } from '../../../../types/analytics';
import ChartFilters from './ChartFilters';
import DateRangeFilter from './DateRangeFilter';
import { formatFecha } from '../../../../utils/formatFecha';

function deriveGranularidad(desde: string, hasta: string): Granularidad {
  const d1 = new Date(desde);
  const d2 = new Date(hasta);
  const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return 'diario';
  if (diffDays <= 90) return 'semanal';
  if (diffDays <= 365) return 'mensual';
  return 'anual';
}

export default function ReservasChart() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [barberId, setBarberId] = useState<string | undefined>();
  const [serviceId, setServiceId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();

  const granularidad = useMemo(() => deriveGranularidad(desde, hasta), [desde, hasta]);

  const { data = [], isFetching, isLoading, error: rtkError } = useGetReservasGananciasQuery({
    desde,
    hasta,
    granularidad,
    barberId,
    serviceId,
    status,
  }, { skip: !desde || !hasta });

  const loading = isLoading;
  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al cargar reservas'
    : null;

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5 max-w-full">
      <h3 className="text-white text-base font-bold mb-2">Reservas</h3>
      <div className="mb-2">
        <DateRangeFilter onChange={(d, h) => { setDesde(d); setHasta(h); }} />
      </div>
      <ChartFilters
        barberId={barberId}
        onBarberChange={setBarberId}
        serviceId={serviceId}
        onServiceChange={setServiceId}
        status={status}
        onStatusChange={setStatus}
      />

      {error && <p className="text-[#FF5C00] text-sm mt-2">{error}</p>}

      <div className="mt-4 overflow-x-hidden" style={{ position: 'relative', height: 280 }}>
        {isFetching && data.length > 0 && (
          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, opacity: 1 }}>
            <div className="w-4 h-4 border-2 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div style={{ opacity: isFetching ? 0.4 : 1, transition: 'opacity 0.3s ease', height: '100%' }}>
        {loading ? (
          <div className="w-full h-full bg-[#1A1A1A] rounded-xl animate-pulse" />
        ) : data.length === 0 ? (
          <p className="text-[#8A8A8A] text-sm text-center py-8">Sin datos en el periodo seleccionado</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
              <XAxis
                dataKey="periodo"
                tickFormatter={(value) => formatFecha(value)}
                tick={{ fill: '#8A8A8A', fontSize: 12 }}
                stroke="#282828"
              />
              <YAxis tick={{ fill: '#8A8A8A', fontSize: 12 }} stroke="#282828" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #282828', borderRadius: 8, color: '#fff' }}
                labelStyle={{ color: '#fff' }}
                labelFormatter={(label) => formatFecha(label)}
                formatter={(value) => [value, 'Reservas']}
              />
              <Bar dataKey="cantidadReservas" fill="#FF5C00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        </div>
      </div>
    </div>
  );
}
