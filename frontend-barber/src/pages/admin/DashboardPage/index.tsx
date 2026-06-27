import { useState } from 'react';
import { FiCalendar } from 'react-icons/fi';
import { AnimatedContainer, Button, Spinner } from '../../../components/common';
import { useGetOverviewQuery } from '../../../services/analyticsApi';
import DateRangeFilter from './components/DateRangeFilter';
import KpiCards from './components/KpiCards';
import StatusBreakdown from './components/StatusBreakdown';
import HeatmapChart from './components/HeatmapChart';
import ReservasChart from './components/ReservasChart';
import GananciasChart from './components/GananciasChart';
import DistribucionDonut from './components/DistribucionDonut';

function getThisMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const desde = `${y}-${m}-01`;
  const lastDay = String(new Date(y, now.getMonth() + 1, 0).getDate()).padStart(2, '0');
  const hasta = `${y}-${m}-${lastDay}`;
  return { desde, hasta };
}

export default function DashboardPage() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const { data: overview, isLoading, error: rtkError } = useGetOverviewQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );
  const loading = isLoading;
  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al cargar overview'
    : null;

  const noDateRange = !desde || !hasta;

  if (noDateRange) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto flex flex-col gap-5 overflow-x-hidden">
        <AnimatedContainer animation="fadeInDown">
          <div className="flex flex-col gap-3">
            <h1 className="text-white text-2xl lg:text-3xl font-bold">Métricas</h1>
            <DateRangeFilter onChange={(d, h) => { setDesde(d); setHasta(h); }} />
          </div>
        </AnimatedContainer>

        <AnimatedContainer animation="fadeInUp" className="flex flex-col items-center justify-center py-20 text-[#8A8A8A]">
          <FiCalendar className="text-5xl mb-4 text-[#FF5C00]/50" />
          <p className="text-lg font-medium text-white mb-1">Seleccioná un período para ver las métricas</p>
          <p className="text-sm mb-6">Elegí un rango de fechas usando los filtros de arriba</p>
          <Button
            onClick={() => {
              const range = getThisMonthRange();
              setDesde(range.desde);
              setHasta(range.hasta);
            }}
            icon={FiCalendar}
          >
            Ver este mes
          </Button>
        </AnimatedContainer>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto flex flex-col gap-5 overflow-x-hidden">
        <AnimatedContainer animation="fadeInDown">
          <div className="flex flex-col gap-3">
            <h1 className="text-white text-2xl lg:text-3xl font-bold">Métricas</h1>
            <DateRangeFilter onChange={(d, h) => { setDesde(d); setHasta(h); }} />
          </div>
        </AnimatedContainer>

        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto flex flex-col gap-5 overflow-x-hidden">
      <AnimatedContainer animation="fadeInDown">
        <div className="flex flex-col gap-3">
          <h1 className="text-white text-2xl lg:text-3xl font-bold">Métricas</h1>
          <DateRangeFilter onChange={(d, h) => { setDesde(d); setHasta(h); }} />
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="fadeInUp" delay={0.1}>
        <KpiCards data={overview} loading={loading} error={error} />
      </AnimatedContainer>

      <AnimatedContainer animation="fadeInUp" delay={0.2}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-4 order-2 lg:order-1 min-w-0">
            <HeatmapChart />
          </div>
          <div className="order-1 lg:order-2 min-w-0">
            <StatusBreakdown
              data={overview ? { estadisticasPorEstado: overview.estadisticasPorEstado } : null}
              loading={loading}
              error={error}
            />
          </div>
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="fadeInUp" delay={0.3}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="min-w-0"><ReservasChart /></div>
          <div className="min-w-0"><GananciasChart /></div>
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="fadeInUp" delay={0.4}>
        <DistribucionDonut />
      </AnimatedContainer>
    </div>
  );
}
