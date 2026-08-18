import { useMemo } from 'react';
import { Area, Bar, CartesianGrid, ComposedChart, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { FiBarChart2, FiCheckCircle, FiClock, FiDollarSign, FiPackage, FiXCircle } from 'react-icons/fi';
import { useGetEcommerceOverviewQuery } from '../../../../services/analyticsApi';
import { useGetAllOrdersQuery } from '../../../../services/orderApi';
import { AnimatedContainer, Spinner } from '../../../../components/common';
import { formatCurrency } from '../../../../utils/formatCurrency';

interface OrdersAnalyticsTabProps {
  desde: string;
  hasta: string;
  showKpis?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendientes',
  paid: 'Pagadas',
  delivered: 'Entregadas',
  cancelled: 'Canceladas',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#FFC107',
  paid: '#4ade80',
  delivered: '#60a5fa',
  cancelled: '#f87171',
};

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString('es-UY', { day: '2-digit', month: 'short' });
}

export default function OrdersAnalyticsTab({ desde, hasta, showKpis = true }: OrdersAnalyticsTabProps) {
  const { data: overview, isLoading: overviewLoading } = useGetEcommerceOverviewQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );
  const { data: ordersData, isLoading: ordersLoading } = useGetAllOrdersQuery(
    { desde, hasta, page: 1, limit: 100 },
    { skip: !desde || !hasta },
  );

  const orders = useMemo(() => ordersData?.orders ?? [], [ordersData?.orders]);
  const orderTrend = useMemo(() => {
    const grouped = new Map<string, { orders: number; value: number }>();
    for (const order of orders) {
      const date = order.createdAt.slice(0, 10);
      const current = grouped.get(date) ?? { orders: 0, value: 0 };
      current.orders += 1;
      current.value += order.total;
      grouped.set(date, current);
    }
    return [...grouped.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([date, values]) => ({ date, label: formatShortDate(date), ...values }));
  }, [orders]);

  const statusData = Object.entries(overview?.ordersByStatus ?? {}).filter(([status]) => STATUS_LABELS[status]).map(([status, count]) => ({
    status,
    label: STATUS_LABELS[status] ?? status,
    count,
    color: STATUS_COLORS[status] ?? '#8A8A8A',
  }));
  const maxStatus = Math.max(...statusData.map((entry) => entry.count), 1);
  const kpis = [
    { label: 'Órdenes', value: overview?.totalOrders ?? 0, icon: FiPackage, color: '#FF5C00' },
    { label: 'Valor cobrado', value: formatCurrency(overview?.totalRevenue ?? 0), icon: FiDollarSign, color: '#4ade80' },
    { label: 'Ticket promedio', value: formatCurrency(overview?.averageTicket ?? 0), icon: FiBarChart2, color: '#60a5fa' },
    { label: 'Pendientes', value: overview?.ordersByStatus?.pending ?? 0, icon: FiClock, color: '#FFC107' },
    { label: 'Canceladas', value: overview?.cancelledOrders ?? 0, icon: FiXCircle, color: '#f87171' },
  ];

  if (overviewLoading || ordersLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="flex flex-col gap-5">
      {showKpis && (
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AnimatedContainer animation="fadeInUp">
          <section className="bg-[#121212] border border-[#282828] rounded-2xl p-5" aria-labelledby="orders-trend-heading">
            <h3 id="orders-trend-heading" className="text-white text-base font-bold mb-1">Órdenes por día</h3>
            <p className="text-[11px] text-[#6A6A6A] mb-4">Volumen y valor bruto de las órdenes creadas</p>
            {orderTrend.length === 0 ? <p className="text-[#8A8A8A] text-sm text-center py-16">No hay órdenes en este período.</p> : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={orderTrend}>
                  <defs>
                    <linearGradient id="ordersValueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF5C00" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FF5C00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
                  <XAxis dataKey="label" tick={{ fill: '#8A8A8A', fontSize: 11 }} stroke="#282828" />
                  <YAxis yAxisId="value" tick={{ fill: '#8A8A8A', fontSize: 11 }} stroke="#282828" tickFormatter={(value) => formatCurrency(Number(value))} />
                  <YAxis yAxisId="orders" orientation="right" allowDecimals={false} tick={{ fill: '#8A8A8A', fontSize: 11 }} stroke="#282828" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #282828', borderRadius: 8, color: '#fff' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value, name) => [name === 'value' ? formatCurrency(Number(value ?? 0)) : value, name === 'value' ? 'Valor bruto' : 'Órdenes']}
                  />
                  <Area yAxisId="value" type="monotone" dataKey="value" stroke="#FF5C00" fill="url(#ordersValueGradient)" strokeWidth={2} />
                  <Bar yAxisId="orders" dataKey="orders" fill="#60a5fa" barSize={8} radius={[3, 3, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </section>
        </AnimatedContainer>

        <AnimatedContainer animation="fadeInUp" delay={0.1}>
          <section className="bg-[#121212] border border-[#282828] rounded-2xl p-5" aria-labelledby="orders-status-heading">
            <h3 id="orders-status-heading" className="text-white text-base font-bold mb-1">Distribución por estado</h3>
            <p className="text-[11px] text-[#6A6A6A] mb-4">Seguimiento operativo del ciclo de cada orden</p>
            {statusData.length === 0 ? <p className="text-[#8A8A8A] text-sm text-center py-16">No hay estados para mostrar.</p> : (
              <div className="flex flex-col gap-4 pt-2">
                {statusData.map((entry) => (
                  <div key={entry.status}>
                    <div className="flex items-center gap-3 text-[12px] mb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-[#8A8A8A] flex-1">{entry.label}</span>
                      <span className="text-white font-semibold">{entry.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#282828] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(entry.count / maxStatus) * 100}%`, backgroundColor: entry.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 text-[12px] text-[#8A8A8A] mt-8">
              <FiCheckCircle className="text-green-400" />
              <span>{overview?.paidOrders ?? 0} órdenes pagadas de {overview?.totalOrders ?? 0}</span>
            </div>
          </section>
        </AnimatedContainer>
      </div>
    </div>
  );
}
