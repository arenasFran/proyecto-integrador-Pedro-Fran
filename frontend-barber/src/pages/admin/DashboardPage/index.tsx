import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { FiBarChart2, FiCalendar, FiGrid, FiPieChart, FiClock, FiDollarSign } from 'react-icons/fi';
import { AnimatedContainer, Button, Spinner } from '../../../components/common';
import { useGetOverviewQuery } from '../../../services/analyticsApi';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import { resolvePreset } from '../../../components/common/dateRangeUtils';
import { getTokenKind } from '../../../utils/token';
import { getAccessToken } from '../../../services/api';
import KpiCards from './components/KpiCards';
import StatusBreakdown from './components/StatusBreakdown';
import HeatmapChart from './components/HeatmapChart';
import ReservasChart from './components/ReservasChart';
import GananciasChart from './components/GananciasChart';
import DistribucionDonut from './components/DistribucionDonut';
import HourDistributionChart from './components/HourDistributionChart';
import DayOfWeekChart from './components/DayOfWeekChart';
import BarberComparisonTable from './components/BarberComparisonTable';
import RevenueByServiceChart from './components/RevenueByServiceChart';

type TabKey = 'resumen' | 'tendencia' | 'distribucion' | 'horario' | 'servicios';

const TABS: { key: TabKey; label: string; icon: React.ComponentType }[] = [
  { key: 'resumen', label: 'Resumen', icon: FiGrid },
  { key: 'tendencia', label: 'Tendencia', icon: FiBarChart2 },
  { key: 'distribucion', label: 'Distribución', icon: FiPieChart },
  { key: 'horario', label: 'Horario', icon: FiClock },
  { key: 'servicios', label: 'Servicios', icon: FiDollarSign },
];

function renderHeader(showDateRange: boolean, onDateRangeChange: (d: string, h: string) => void) {
  return (
    <AnimatedContainer animation="fadeInDown">
      <div className="flex flex-col gap-3">
        <h1 className="text-white text-2xl lg:text-3xl font-bold">Métricas</h1>
        {showDateRange && <DateRangeFilter onChange={onDateRangeChange} />}
      </div>
    </AnimatedContainer>
  );
}

export default function DashboardPage() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');

  const { data: overview, isLoading, error: rtkError } = useGetOverviewQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );
  const loading = isLoading;
  const kind = getTokenKind(getAccessToken());
  if (kind !== 'Admin') {
    return <Navigate to="/admin/turnos" replace />;
  }

  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? typeof rtkError.data === 'object' && rtkError.data !== null && 'message' in (rtkError.data as Record<string, unknown>)
        ? String((rtkError.data as Record<string, unknown>).message)
        : typeof rtkError.data === 'string'
          ? rtkError.data
          : 'Error al cargar overview'
      : 'Error al cargar overview'
    : null;

  const noDateRange = !desde || !hasta;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto flex flex-col gap-5 overflow-x-hidden">
      {noDateRange || loading ? renderHeader(true, (d, h) => { setDesde(d); setHasta(h); }) : renderHeader(false, () => {})}

      {noDateRange ? (
        <AnimatedContainer animation="fadeInUp" className="flex flex-col items-center justify-center py-20 text-[#8A8A8A]">
          <FiCalendar className="text-5xl mb-4 text-[#FF5C00]/50" />
          <p className="text-lg font-medium text-white mb-1">Seleccioná un período para ver las métricas</p>
          <p className="text-sm mb-6">Elegí un rango de fechas usando los filtros de arriba</p>
          <Button
            onClick={() => {
              const range = resolvePreset('mes');
              setDesde(range.desde);
              setHasta(range.hasta);
            }}
            icon={FiCalendar}
          >
            Ver este mes
          </Button>
        </AnimatedContainer>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <AnimatedContainer animation="fadeInUp" delay={0.1}>
            <div className="flex flex-wrap gap-2 mb-4">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    activeTab === key
                      ? 'bg-[#FF5C00] text-white'
                      : 'bg-[#1A1A1A] text-[#8A8A8A] border border-[#282828] hover:border-[#FF5C00] hover:text-white'
                  }`}
                >
                  <Icon />
                  {label}
                </button>
              ))}
            </div>
          </AnimatedContainer>

          {activeTab === 'resumen' && (
            <>
              <AnimatedContainer animation="fadeInUp" delay={0.15}>
                <DateRangeFilter onChange={(d, h) => { setDesde(d); setHasta(h); }} />
              </AnimatedContainer>
              <AnimatedContainer animation="fadeInUp" delay={0.2}>
                <KpiCards data={overview ?? null} loading={loading} error={error} desde={desde} hasta={hasta} />
              </AnimatedContainer>
              <AnimatedContainer animation="fadeInUp" delay={0.3}>
                <StatusBreakdown
                  data={overview ? { estadisticasPorEstado: overview.estadisticasPorEstado } : null}
                  loading={loading}
                  error={error}
                  desde={desde}
                  hasta={hasta}
                />
              </AnimatedContainer>
            </>
          )}

          {activeTab === 'tendencia' && (
            <>
              <AnimatedContainer animation="fadeInUp" delay={0.2}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="min-w-0"><ReservasChart /></div>
                  <div className="min-w-0"><GananciasChart /></div>
                </div>
              </AnimatedContainer>
              <AnimatedContainer animation="fadeInUp" delay={0.3}>
                <HeatmapChart />
              </AnimatedContainer>
            </>
          )}

          {activeTab === 'distribucion' && (
            <div className="flex flex-col gap-5">
              <AnimatedContainer animation="fadeInUp" delay={0.2}>
                <DistribucionDonut />
              </AnimatedContainer>
              <AnimatedContainer animation="fadeInUp" delay={0.3}>
                <BarberComparisonTable />
              </AnimatedContainer>
            </div>
          )}

          {activeTab === 'horario' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <AnimatedContainer animation="fadeInUp" delay={0.2}>
                <HourDistributionChart />
              </AnimatedContainer>
              <AnimatedContainer animation="fadeInUp" delay={0.3}>
                <DayOfWeekChart />
              </AnimatedContainer>
            </div>
          )}

          {activeTab === 'servicios' && (
            <AnimatedContainer animation="fadeInUp" delay={0.2}>
              <RevenueByServiceChart />
            </AnimatedContainer>
          )}
        </>
      )}
    </div>
  );
}
