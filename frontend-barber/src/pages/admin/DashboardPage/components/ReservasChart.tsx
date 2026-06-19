import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDateRange } from '../../../../context/DateRangeContext';
import { useGetReservasGananciasQuery } from '../../../../services/analyticsApi';
import type { Granularidad } from '../../../../types/analytics';
import ChartFilters from './ChartFilters';

export default function ReservasChart() {
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
      : 'Error al carrar reservas'
    : null;

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5">
      <h3 className="text-white text-base font-bold mb-2">Reservas</h3>
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
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
              <XAxis dataKey="periodo" tick={{ fill: '#8A8A8A', fontSize: 12 }} stroke="#282828" />
              <YAxis tick={{ fill: '#8A8A8A', fontSize: 12 }} stroke="#282828" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #282828', borderRadius: 8, color: '#fff' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="cantidadReservas" fill="#FF5C00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
