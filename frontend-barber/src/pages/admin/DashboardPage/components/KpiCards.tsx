import { FiUsers, FiClock, FiDollarSign, FiUserPlus } from 'react-icons/fi';
import type { OverviewData } from '../../../../types/analytics';

interface KpiCardsProps {
  data: OverviewData | null;
  loading: boolean;
  error: string | null;
}

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('es-UY');
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}M`;
  if (m === 0) return `${h}H`;
  return `${h}H ${m}M`;
}

const CARDS = [
  { key: 'reservas', label: 'Reservas', icon: FiUsers, format: (v: number) => String(v) },
  { key: 'duracion', label: 'Duración total', icon: FiClock, format: (v: number) => formatDuration(v) },
  { key: 'ingresos', label: 'Ingresos totales', icon: FiDollarSign, format: (v: number) => formatCurrency(v) },
  { key: 'clientes', label: 'Nuevos clientes', icon: FiUserPlus, format: (v: number) => String(v) },
];

export default function KpiCards({ data, loading, error }: KpiCardsProps) {
  if (error) {
    return (
      <div className="text-[#FF5C00] text-sm bg-[#1A1A1A] rounded-2xl p-5 border border-[#282828]">
        Error al cargar KPIs: {error}
      </div>
    );
  }

  const values = data
    ? [data.totalReservas, data.duracionTotalMinutos, data.ingresosTotales, data.nuevosClientes]
    : [null, null, null, null];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card, i) => (
        <div
          key={card.key}
          className="bg-[#121212] border border-[#282828] rounded-2xl p-5 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[#8A8A8A] text-sm font-medium">{card.label}</span>
            <card.icon className="text-[#FF5C00] text-xl" />
          </div>
          <span className="text-white text-2xl font-bold">
            {loading ? (
              <span className="inline-block w-20 h-6 bg-[#242424] rounded animate-pulse" />
            ) : values[i] !== null ? (
              card.format(values[i]!)
            ) : (
              '—'
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
