import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDateRange } from '../../../../context/DateRangeContext';
import { useGetReservasGananciasQuery } from '../../../../services/analyticsApi';
import type { Granularidad } from '../../../../types/analytics';
import ChartFilters from './ChartFilters';

export default function GananciasChart() {
  const { range } = useDateRange();
  const [granularidad, setGranularidad] = useState<Granularidad>('diario');
  const [barberId, setBarberId] = useState<string | undefined>();
  const [serviceId, setServiceId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();

  const { data = [], isLoading, error: rtkError } = useGetReservasGananciasQuery({
    desde: range.desde,
    hasta: range.hasta,
    granularidad,
    barberId,
    serviceId,
    status,
  });

  const loading = isLoading;
  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al carrar ganancias'
    : null;

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5">
      <h3 className="text-white text-base font-bold mb-2">Ganancias</h3>
      <ChartFilters
        granularidad={granularidad}
        onGranularidadChange={setGranularidad}
        barberId={barberId}
        onBarberChange={setBarberId}
        serviceId={serviceId}
        onServiceChange={setServiceId}
        status={status}
        onStatusChange={setStatus}
      />

      {error && <p className="text-[#FF5C00] text-sm mt-2">{error}</p>}

      <div className="mt-4" style={{ height: 280 }}>
        {loading ? (
          <div className="w-full h-full bg-[#1A1A1A] rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gananciaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF5C00" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF5C00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
              <XAxis dataKey="periodo" tick={{ fill: '#8A8A8A', fontSize: 12 }} stroke="#282828" />
              <YAxis tick={{ fill: '#8A8A8A', fontSize: 12 }} stroke="#282828" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #282828', borderRadius: 8, color: '#fff' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => [`$${(value ?? 0).toLocaleString('es-UY')}`, 'Ganancias']}
              />
              <Area type="monotone" dataKey="ganancias" stroke="#FF5C00" fill="url(#gananciaGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
