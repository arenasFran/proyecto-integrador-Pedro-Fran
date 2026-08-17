import { useState } from 'react';
import { useGetDistribucionQuery } from '../../../../services/analyticsApi';
import DateRangeFilter from '../../../../components/common/DateRangeFilter';
import { formatCurrency } from '../../../../utils/formatCurrency';

interface BarberComparisonTableProps { desde?: string; hasta?: string }

export default function BarberComparisonTable({ desde: desdeProp, hasta: hastaProp }: BarberComparisonTableProps = {}) {
  const [internalDesde, setInternalDesde] = useState('');
  const [internalHasta, setInternalHasta] = useState('');
  const desde = desdeProp ?? internalDesde;
  const hasta = hastaProp ?? internalHasta;
  const controlled = desdeProp !== undefined && hastaProp !== undefined;

  const { data, isLoading, error: rtkError } = useGetDistribucionQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );

  const entries = data?.byBarber ?? [];
  const loading = isLoading;
  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al cargar comparativa'
    : null;

  const maxTurnos = Math.max(...entries.map(e => e.cantidad), 1);
  const maxIngresos = Math.max(...entries.map(e => e.ingresos), 1);

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5 max-w-full">
      <h3 className="text-white text-base font-bold mb-4">Comparativa de barberos</h3>

      {!controlled && <div className="mb-2"><DateRangeFilter onChange={(d, h) => { setInternalDesde(d); setInternalHasta(h); }} /></div>}

      {error && <p className="text-[#FF5C00] text-sm mb-2">{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-[#1A1A1A] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-[#8A8A8A] text-sm text-center py-8">No hay datos para el período seleccionado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[12px] text-[#8A8A8A] uppercase tracking-wider border-b border-[#282828]">
                <th className="text-left pb-3 font-medium">Barbero</th>
                <th className="text-right pb-3 font-medium">Turnos</th>
                <th className="text-right pb-3 font-medium">Ingresos</th>
                <th className="text-right pb-3 font-medium">Ticket promedio</th>
                <th className="w-32 pb-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const ticketPromedio = entry.cantidad > 0 ? entry.ingresos / entry.cantidad : 0;
                const turnosPercent = (entry.cantidad / maxTurnos) * 100;
                const ingresosPercent = (entry.ingresos / maxIngresos) * 100;
                return (
                  <tr key={entry.barberId} className="border-b border-[#1A1A1A] last:border-0">
                    <td className="py-3 text-white font-medium">{entry.nombre}</td>
                    <td className="py-3 text-right text-white">
                      {entry.cantidad}
                      <div className="w-24 h-1.5 bg-[#1A1A1A] rounded-full ml-auto mt-1">
                        <div className="h-full bg-[#FF5C00] rounded-full" style={{ width: `${turnosPercent}%` }} />
                      </div>
                    </td>
                    <td className="py-3 text-right text-green-400 font-medium">{formatCurrency(entry.ingresos)}
                      <div className="w-24 h-1.5 bg-[#1A1A1A] rounded-full ml-auto mt-1">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${ingresosPercent}%` }} />
                      </div>
                    </td>
                    <td className="py-3 text-right text-white">{formatCurrency(Math.round(ticketPromedio))}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-[11px] text-[#6A6A6A]">{turnosPercent.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
