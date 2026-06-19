import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useDateRange } from '../../../../context/DateRangeContext';
import { useGetDistribucionQuery } from '../../../../services/analyticsApi';

const COLORS = ['#FF5C00', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function DistribucionDonut() {
  const { range } = useDateRange();
  const { data, isLoading, error: rtkError } = useGetDistribucionQuery(
    { desde: range.desde, hasta: range.hasta },
    { skip: !range.desde || !range.hasta },
  );

  const dataEntries = data?.porBarbero ?? [];
  const loading = isLoading;
  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al carrar distribucion'
    : null;

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5">
      <h3 className="text-white text-base font-bold mb-4">Distribución por Barbero</h3>

      {error && <p className="text-[#FF5C00] text-sm mb-2">{error}</p>}

      {loading ? (
        <div className="w-full h-64 bg-[#1A1A1A] rounded-xl animate-pulse" />
      ) : dataEntries.length === 0 ? (
        <p className="text-[#8A8A8A] text-sm text-center py-8">Sin datos en el periodo seleccionado</p>
      ) : (
        <div className="flex justify-center">
          <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="w-56 h-56 lg:w-[280px] lg:h-[280px] shrink-0">
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
            {dataEntries.map((entry, i) => (
              <div key={entry.barberId} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-white">{entry.nombre}</span>
                <span className="text-[#8A8A8A]">{entry.cantidad} turnos</span>
                <span className="text-[#FF5C00] font-medium">${entry.ingresos.toLocaleString('es-UY')}</span>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
