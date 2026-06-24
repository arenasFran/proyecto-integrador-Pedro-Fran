import type { OverviewData } from '../../../../types/analytics';

interface StatusBreakdownProps {
  data: Pick<OverviewData, 'estadisticasPorEstado'> | null;
  loading: boolean;
  error: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmado: { label: 'Confirmado', color: 'bg-blue-500' },
  completado: { label: 'Completado', color: 'bg-green-500' },
  cancelado: { label: 'Cancelado', color: 'bg-red-500' },
  noshow: { label: 'No asistió', color: 'bg-yellow-500' },
};

export default function StatusBreakdown({ data, loading, error }: StatusBreakdownProps) {
  if (error) {
    return (
      <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5">
        <p className="text-[#FF5C00] text-sm">Error: {error}</p>
      </div>
    );
  }

  const estados = data?.estadisticasPorEstado ?? {};
  const entries = Object.entries(STATUS_LABELS);

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5">
      <h3 className="text-white text-base font-bold mb-4">Estados</h3>
      <div className="flex flex-col gap-3">
        {entries.map(([key, { label, color }]) => {
          const count = estados[key] ?? 0;
          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-[#8A8A8A] text-sm">{label}</span>
              </div>
              {loading ? (
                <span className="w-8 h-5 bg-[#242424] rounded animate-pulse" />
              ) : (
                <span className="text-white text-sm font-bold">{count}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
