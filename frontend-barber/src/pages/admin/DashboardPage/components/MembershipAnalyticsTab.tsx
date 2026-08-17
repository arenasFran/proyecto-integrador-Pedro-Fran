import { FiAward, FiClock, FiDollarSign, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { AnimatedContainer, Spinner } from '../../../../components/common';
import { useGetMembershipRevenueQuery } from '../../../../services/analyticsApi';
import { useGetAllMembershipsQuery, useGetExpiringSoonQuery, useGetPendingMembershipsQuery } from '../../../../services/membershipApi';
import { formatCurrency } from '../../../../utils/formatCurrency';

interface MembershipAnalyticsTabProps {
  desde: string;
  hasta: string;
}

export default function MembershipAnalyticsTab({ desde, hasta }: MembershipAnalyticsTabProps) {
  const { data: membershipsData, isLoading: membershipsLoading } = useGetAllMembershipsQuery({ limit: 100 });
  const { data: pendingData } = useGetPendingMembershipsQuery();
  const { data: expiringData } = useGetExpiringSoonQuery({ days: 7 });
  const { data: revenue = [], isLoading: revenueLoading } = useGetMembershipRevenueQuery({ desde, hasta }, { skip: !desde || !hasta });

  const memberships = membershipsData?.data ?? [];
  const active = memberships.filter((membership) => membership.status === 'active').length;
  const collected = revenue.reduce((total, entry) => total + entry.ganancias, 0);
  const average = revenue.length > 0 ? collected / revenue.reduce((total, entry) => total + entry.cantidadReservas, 0) : 0;
  const maxRevenue = Math.max(...revenue.map((entry) => entry.ganancias), 1);

  if (membershipsLoading || revenueLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  const kpis = [
    { label: 'Membresías activas', value: active, icon: FiAward, color: '#c084fc' },
    { label: 'Pendientes de aprobación', value: pendingData?.data.length ?? 0, icon: FiClock, color: '#FFB800' },
    { label: 'Por vencer en 7 días', value: expiringData?.data.length ?? 0, icon: FiUsers, color: '#FF5C00' },
    { label: 'Ingresos del período', value: formatCurrency(collected), icon: FiDollarSign, color: '#4ade80' },
    { label: 'Ingreso promedio', value: formatCurrency(average), icon: FiTrendingUp, color: '#60a5fa' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-[#121212] border border-[#282828] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#8A8A8A] text-sm font-medium">{kpi.label}</span>
              <kpi.icon className="text-xl shrink-0" style={{ color: kpi.color }} />
            </div>
            <span className="text-white text-2xl font-bold">{kpi.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AnimatedContainer animation="fadeInUp">
          <section className="bg-[#121212] border border-[#282828] rounded-2xl p-5" aria-labelledby="membership-revenue-heading">
            <h3 id="membership-revenue-heading" className="text-white text-[15px] font-bold mb-4">Ingresos por membresías</h3>
            {revenue.length === 0 ? <p className="text-[#8A8A8A] text-sm py-8 text-center">No hay ingresos en este período.</p> : (
              <div className="flex flex-col gap-3">
                {revenue.map((entry) => (
                  <div key={entry.periodo} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 text-[12px]">
                    <span className="text-[#8A8A8A]">{entry.periodo}</span>
                    <div className="h-2 rounded-full bg-[#282828] overflow-hidden" role="img" aria-label={`${entry.periodo}: ${formatCurrency(entry.ganancias)}`}>
                      <div className="h-full rounded-full bg-purple-400" style={{ width: `${Math.max((entry.ganancias / maxRevenue) * 100, 2)}%` }} />
                    </div>
                    <span className="text-purple-300 font-medium">{formatCurrency(entry.ganancias)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </AnimatedContainer>

        <AnimatedContainer animation="fadeInUp" delay={0.1}>
          <section className="bg-[#121212] border border-[#282828] rounded-2xl p-5" aria-labelledby="membership-status-heading">
            <h3 id="membership-status-heading" className="text-white text-[15px] font-bold mb-4">Estado de la base</h3>
            <div className="flex flex-col gap-3">
              {[
                ['Activas', active, 'bg-purple-400'],
                ['Pendientes', pendingData?.data.length ?? 0, 'bg-yellow-400'],
                ['Por vencer', expiringData?.data.length ?? 0, 'bg-orange-400'],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="flex items-center gap-3 rounded-xl bg-[#1A1A1A] px-3 py-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-[#8A8A8A] text-sm flex-1">{label}</span>
                  <span className="text-white font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </section>
        </AnimatedContainer>
      </div>
    </div>
  );
}
