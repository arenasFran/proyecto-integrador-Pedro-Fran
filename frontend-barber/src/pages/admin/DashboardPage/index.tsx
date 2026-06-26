import { useState } from 'react';
import { AnimatedContainer } from '../../../components/common';
import { useGetOverviewQuery } from '../../../services/analyticsApi';
import type { OverviewData } from '../../../types/analytics';
import DateRangeFilter from './components/DateRangeFilter';
import KpiCards from './components/KpiCards';
import StatusBreakdown from './components/StatusBreakdown';
import HeatmapChart from './components/HeatmapChart';
import ReservasChart from './components/ReservasChart';
import GananciasChart from './components/GananciasChart';
import DistribucionDonut from './components/DistribucionDonut';

export default function DashboardPage() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const { data: overviewData, isFetching, isLoading, error: rtkError } = useGetOverviewQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );

  const overview: OverviewData | null = overviewData ?? null;
  const loading = isLoading;
  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al cargar overview'
    : null;

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
