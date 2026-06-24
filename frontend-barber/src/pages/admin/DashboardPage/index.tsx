import { DateRangeProvider, useDateRange } from '../../../context/DateRangeContext';
import { useGetOverviewQuery } from '../../../services/analyticsApi';
import { AnimatedContainer } from '../../../components/common';
import type { OverviewData } from '../../../types/analytics';
import DateFilterBar from './components/DateFilterBar';
import KpiCards from './components/KpiCards';
import StatusBreakdown from './components/StatusBreakdown';
import HeatmapChart from './components/HeatmapChart';
import ReservasChart from './components/ReservasChart';
import GananciasChart from './components/GananciasChart';
import DistribucionDonut from './components/DistribucionDonut';

function DashboardContent() {
  const { range } = useDateRange();
  const { data: overviewData, isLoading, error: rtkError } = useGetOverviewQuery(
    { desde: range.desde, hasta: range.hasta },
    { skip: !range.desde || !range.hasta },
  );
  const overview: OverviewData | null = overviewData ?? null;
  const loading = isLoading;
  const error = rtkError
    ? typeof rtkError === 'object' && 'data' in rtkError
      ? String(rtkError.data)
      : 'Error al carrar overview'
    : null;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto flex flex-col gap-5">
      <AnimatedContainer animation="fadeInDown">
        <div className="flex flex-col gap-3">
          <h1 className="text-white text-2xl lg:text-3xl font-bold">Dashboard</h1>
          <DateFilterBar />
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="fadeInUp" delay={0.1}>
        <KpiCards data={overview} loading={loading} error={error} />
      </AnimatedContainer>

      <AnimatedContainer animation="fadeInUp" delay={0.2}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-4">
            <HeatmapChart />
          </div>
          <StatusBreakdown
            data={overview ? { estadisticasPorEstado: overview.estadisticasPorEstado } : null}
            loading={loading}
            error={error}
          />
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="fadeInUp" delay={0.3}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ReservasChart />
          <GananciasChart />
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="fadeInUp" delay={0.4}>
        <DistribucionDonut />
      </AnimatedContainer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DateRangeProvider>
      <DashboardContent />
    </DateRangeProvider>
  );
}
