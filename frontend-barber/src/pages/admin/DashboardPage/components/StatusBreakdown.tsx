import { useNavigate } from 'react-router-dom';
import type { OverviewData } from '../../../../types/analytics';

interface StatusBreakdownProps {
  data: Pick<OverviewData, 'estadisticasPorEstado'> | null;
  loading: boolean;
  error: string | null;
  desde: string;
  hasta: string;
}

const STATUS_KEYS: Record<string, { label: string; color: string; param: string }> = {
  confirmado: { label: 'Confirmado', color: 'bg-blue-500', param: 'Confirmado' },
  completado: { label: 'Completado', color: 'bg-green-500', param: 'Completado' },
  cancelado: { label: 'Cancelado', color: 'bg-red-500', param: 'Cancelado' },
  noshow: { label: 'No asistió', color: 'bg-yellow-500', param: 'NoShow' },
};

export default function StatusBreakdown({ data, loading, error, desde, hasta }: StatusBreakdownProps) {
  const navigate = useNavigate();

  if (error) {
    return (
      <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5 h-full">
        <p className="text-[#FF5C00] text-sm">Error: {error}</p>
      </div>
    );
  }

  const estados = data?.estadisticasPorEstado ?? {};
  const entries = Object.entries(STATUS_KEYS);

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5 h-full flex flex-col">
      <h3 className="text-white text-base font-bold mb-4">Estados</h3>
      <div className="flex-1 flex flex-col justify-around">
        {entries.map(([key, { label, color, param }]) => {
          const count = estados[key] ?? 0;
          return (
            <button
              key={key}
              onClick={() => navigate(`/admin/turnos?dateFrom=${desde}&dateTo=${hasta}&status=${param}`)}
              className="flex items-center justify-between py-1.5 hover:bg-[#1A1A1A] rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-[#8A8A8A] text-sm">{label}</span>
              </div>
              {loading ? (
                <span className="w-8 h-5 bg-[#242424] rounded animate-pulse" />
              ) : (
                <span className="text-white text-sm font-bold">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
