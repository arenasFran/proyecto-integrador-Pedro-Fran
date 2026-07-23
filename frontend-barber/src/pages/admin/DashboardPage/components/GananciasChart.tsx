import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useGetReservasGananciasQuery } from '../../../../services/analyticsApi';
import ChartFilters from './ChartFilters';
import DateRangeFilter from '../../../../components/common/DateRangeFilter';
import { ChartContainer } from '../../../../components/common';
import { AppointmentListModal } from '../../../../components/common/AppointmentListModal';
import { formatFecha, deriveGranularidad } from '../../../../utils/formatFecha';

function periodToRange(periodo: string): { dateFrom: string; dateTo: string } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(periodo)) {
    return { dateFrom: periodo, dateTo: periodo };
  }
  if (/^\d{4}-\d{2}$/.test(periodo)) {
    const n = parseInt(periodo.split('-')[1], 10);
    if (n >= 1 && n <= 12) {
      const [y, m] = periodo.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const mStr = String(m).padStart(2, '0');
      return { dateFrom: `${y}-${mStr}-01`, dateTo: `${y}-${mStr}-${String(lastDay).padStart(2, '0')}` };
    }
  }
  if (/^\d{4}$/.test(periodo)) {
    return { dateFrom: `${periodo}-01-01`, dateTo: `${periodo}-12-31` };
  }
  return { dateFrom: periodo, dateTo: periodo };
}

export default function GananciasChart() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [barberId, setBarberId] = useState<string | undefined>();
  const [serviceId, setServiceId] = useState<string | undefined>();
  const [selectedPeriod, setSelectedPeriod] = useState<{ dateFrom: string; dateTo: string } | null>(null);

  const granularidad = useMemo(() => deriveGranularidad(desde, hasta), [desde, hasta]);

  const { data = [], isFetching, isLoading, error: rtkError } = useGetReservasGananciasQuery({
    desde,
    hasta,
    granularidad,
    barberId,
    serviceId,
  }, { skip: !desde || !hasta });

  const loading = isLoading;
  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al cargar ganancias'
    : null;

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5 max-w-full">
      <h3 className="text-white text-base font-bold mb-2">Ganancias</h3>
      <div className="mb-2">
        <DateRangeFilter onChange={(d, h) => { setDesde(d); setHasta(h); }} />
      </div>
      <ChartFilters
        barberId={barberId}
        onBarberChange={setBarberId}
        serviceId={serviceId}
        onServiceChange={setServiceId}
      />

      {error && <p className="text-[#FF5C00] text-sm mt-2">{error}</p>}

      <ChartContainer isFetching={isFetching} loading={loading} hasData={data.length > 0} height={280} className="mt-4 overflow-x-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gananciaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF5C00" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF5C00" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              formatter={(value) => [`$${(value ?? 0).toLocaleString('es-UY')}`, 'Ganancias']}
            />
            <Area
              type="monotone"
              dataKey="ganancias"
              stroke="#FF5C00"
              fill="url(#gananciaGradient)"
              strokeWidth={2}
              style={{ cursor: 'pointer' }}
              onClick={(entry) => {
                const data = entry as { periodo?: string } | undefined;
                if (data?.periodo) {
                  setSelectedPeriod(periodToRange(data.periodo));
                }
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>

      <AppointmentListModal
        isOpen={selectedPeriod !== null}
        onClose={() => setSelectedPeriod(null)}
        title={`Turnos del período`}
        params={{
          dateFrom: selectedPeriod?.dateFrom,
          dateTo: selectedPeriod?.dateTo,
          barberId,
        }}
      />
    </div>
  );
}
