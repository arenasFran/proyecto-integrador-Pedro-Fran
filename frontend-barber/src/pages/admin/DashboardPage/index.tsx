import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { FiAward, FiBarChart2, FiCalendar, FiDollarSign, FiGrid, FiShoppingCart, FiUsers } from 'react-icons/fi';
import { AnimatedContainer, Spinner } from '../../../components/common';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import { resolvePreset } from '../../../components/common/dateRangeUtils';
import { getTokenKind } from '../../../utils/token';
import { getAccessToken } from '../../../services/api';
import { useGetOverviewQuery } from '../../../services/analyticsApi';
import type { OverviewData } from '../../../types/analytics';
import KpiCards from './components/KpiCards';
import HeatmapChart from './components/HeatmapChart';
import ReservasChart from './components/ReservasChart';
import GananciasChart from './components/GananciasChart';
import DistribucionDonut from './components/DistribucionDonut';
import HourDistributionChart from './components/HourDistributionChart';
import DayOfWeekChart from './components/DayOfWeekChart';
import BarberComparisonTable from './components/BarberComparisonTable';
import RevenueByServiceChart from './components/RevenueByServiceChart';
import EcommerceTab from './components/EcommerceTab';
import MembershipAnalyticsTab from './components/MembershipAnalyticsTab';
import AdminPageHeader from '../components/AdminPageHeader';

type TabKey = 'resumen' | 'reservas' | 'tienda' | 'membresia';

const TABS: { key: TabKey; label: string; icon: React.ComponentType }[] = [
  { key: 'resumen', label: 'RESUMEN', icon: FiGrid },
  { key: 'reservas', label: 'RESERVAS', icon: FiCalendar },
  { key: 'tienda', label: 'TIENDA', icon: FiShoppingCart },
  { key: 'membresia', label: 'MEMBRESÍA', icon: FiAward },
];

function ReservationKpis({ data, desde, hasta }: { data: OverviewData | null; desde: string; hasta: string }) {
  const cancellationCount = (data?.estadisticasPorEstado.cancelado ?? 0) + (data?.estadisticasPorEstado.noshow ?? 0);
  const cards = [
    { label: 'Reservas confirmadas', value: data?.estadisticasPorEstado.confirmado ?? 0, icon: FiCalendar, color: '#60a5fa' },
    { label: 'Completadas', value: data?.estadisticasPorEstado.completado ?? 0, icon: FiUsers, color: '#4ade80' },
    { label: 'Horas de servicio', value: `${Math.round((data?.duracionTotalMinutos ?? 0) / 60)} h`, icon: FiBarChart2, color: '#c084fc' },
    { label: 'Clientes únicos', value: data?.clientesUnicos ?? 0, icon: FiUsers, color: '#FF5C00' },
    { label: 'Cancelaciones / no show', value: cancellationCount, icon: FiDollarSign, color: '#f87171' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <a key={card.label} href={`/admin/turnos?dateFrom=${desde}&dateTo=${hasta}`} className="bg-[#121212] border border-[#282828] rounded-2xl p-5 flex flex-col gap-3 hover:border-[#FF5C00]/40 transition-colors">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#8A8A8A] text-sm font-medium">{card.label}</span>
            <card.icon className="text-xl shrink-0" style={{ color: card.color }} />
          </div>
          <span className="text-white text-2xl font-bold">{card.value}</span>
        </a>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const initialRange = resolvePreset('mes');
  const [desde, setDesde] = useState(initialRange.desde);
  const [hasta, setHasta] = useState(initialRange.hasta);
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');
  const kind = getTokenKind(getAccessToken());

  const { data: overview, isLoading, error: rtkError, refetch: refetchOverview } = useGetOverviewQuery({ desde, hasta });

  if (kind !== 'Admin') return <Navigate to="/admin/turnos" replace />;

  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? typeof rtkError.data === 'object' && rtkError.data !== null && 'message' in (rtkError.data as Record<string, unknown>)
        ? String((rtkError.data as Record<string, unknown>).message)
        : 'Error al cargar métricas'
      : 'Error al cargar métricas'
    : null;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto flex flex-col gap-5 overflow-x-hidden">
      <AdminPageHeader icon={FiBarChart2} title="Métricas" description="Una lectura clara de la operación, los ingresos y el crecimiento." />

      <div className="flex gap-1 rounded-[12px] bg-[#1A1A1A] p-1 w-full sm:w-fit" role="tablist" aria-label="Secciones de métricas">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2 rounded-[9px] text-[12px] font-semibold tracking-wide transition-colors ${activeTab === key ? 'bg-[#FF5C00]/15 text-[#FF5C00]' : 'text-[#8A8A8A] hover:text-white'}`}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>

      <AnimatedContainer animation="fadeInUp">
        <div className="rounded-[14px] border border-[#282828] bg-[#121212] p-4" aria-label="Período de métricas">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#6A6A6A]">Período</p>
              <p className="text-[13px] text-white mt-1">Todas las cifras se actualizan con este rango</p>
            </div>
            <FiCalendar className="text-[#FF5C00]" aria-hidden="true" />
          </div>
          <DateRangeFilter onChange={(d, h) => { setDesde(d); setHasta(h); }} defaultPreset="mes" />
        </div>
      </AnimatedContainer>

      {isLoading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <>
          {activeTab === 'resumen' && (
            <div className="flex flex-col gap-5">
              <KpiCards data={overview ?? null} loading={isLoading} error={error} desde={desde} hasta={hasta} onRefresh={refetchOverview} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ReservasChart desde={desde} hasta={hasta} />
                <GananciasChart desde={desde} hasta={hasta} />
              </div>
              <HeatmapChart desde={desde} hasta={hasta} />
            </div>
          )}

          {activeTab === 'reservas' && (
            <div className="flex flex-col gap-5">
              <ReservationKpis data={overview ?? null} desde={desde} hasta={hasta} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><ReservasChart desde={desde} hasta={hasta} /><GananciasChart desde={desde} hasta={hasta} /></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><HourDistributionChart desde={desde} hasta={hasta} /><DayOfWeekChart desde={desde} hasta={hasta} /></div>
              <DistribucionDonut desde={desde} hasta={hasta} />
              <BarberComparisonTable desde={desde} hasta={hasta} />
              <RevenueByServiceChart desde={desde} hasta={hasta} />
            </div>
          )}

          {activeTab === 'tienda' && <EcommerceTab desde={desde} hasta={hasta} />}
          {activeTab === 'membresia' && <MembershipAnalyticsTab desde={desde} hasta={hasta} />}
        </>
      )}
    </div>
  );
}
