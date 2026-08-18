import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useGetHeatmapQuery, useGetNuevosClientesQuery } from '../../../../services/analyticsApi';
import type { HeatmapEntry, NuevoClienteData } from '../../../../types/analytics';
import { ChartContainer } from '../../../../components/common';
import { formatCurrency } from '../../../../utils/formatCurrency';

interface GeneralAnalyticsChartsProps {
  desde: string;
  hasta: string;
}

const SOURCE_LABELS: Record<string, string> = {
  appointment: 'Reservas',
  product_order: 'Tienda',
  membership: 'Membresías',
};

const SOURCE_COLORS: Record<string, string> = {
  appointment: '#4ade80',
  product_order: '#FF5C00',
  membership: '#c084fc',
};

function formatShortDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return date.toLocaleDateString('es-UY', { day: '2-digit', month: 'short' });
}

function getPreviousMonthRange(desde: string): { desde: string; hasta: string } | null {
  const [year, month] = desde.slice(0, 7).split('-').map(Number);
  if (!year || !month) return null;
  const previousMonth = new Date(year, month - 2, 1);
  const previousMonthEnd = new Date(year, month - 1, 0);
  const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { desde: format(previousMonth), hasta: format(previousMonthEnd) };
}

function groupNewClientsByDay(clients: NuevoClienteData[]) {
  const grouped = new Map<string, number>();
  for (const client of clients) {
    const day = client.registeredAt.slice(0, 10);
    grouped.set(day, (grouped.get(day) ?? 0) + 1);
  }

  return [...grouped.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, nuevos]) => ({ date, label: formatShortDate(date), nuevos }));
}

function getMonthlyClientGrowth(clients: NuevoClienteData[]) {
  const counts = new Map<string, number>();
  for (const client of clients) {
    const month = client.registeredAt.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([month, count], index, months) => {
      const previous = index > 0 ? months[index - 1][1] : null;
      return {
        month,
        count,
        growth: previous && previous > 0 ? ((count - previous) / previous) * 100 : null,
      };
    });
}

function formatGrowth(value: number | null): string {
  if (value === null) return 'Sin comparación';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function getRevenueBySource(entries: HeatmapEntry[]) {
  const grouped = new Map<string, number>();
  for (const entry of entries) {
    for (const [source, amount] of Object.entries(entry.porOrigen ?? {})) {
      grouped.set(source, (grouped.get(source) ?? 0) + amount);
    }
  }

  return [...grouped.entries()]
    .filter(([, value]) => value > 0)
    .sort(([, first], [, second]) => second - first)
    .map(([source, value]) => ({
      source,
      name: SOURCE_LABELS[source] ?? source,
      value,
      color: SOURCE_COLORS[source] ?? '#60a5fa',
    }));
}

export default function GeneralAnalyticsCharts({ desde, hasta }: GeneralAnalyticsChartsProps) {
  const { data: activity = [], isLoading: activityLoading, isFetching: activityFetching } = useGetHeatmapQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );
  const { data: newClients = [], isLoading: clientsLoading, isFetching: clientsFetching } = useGetNuevosClientesQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );
  const previousMonthRange = useMemo(() => getPreviousMonthRange(desde), [desde]);
  const { data: previousMonthClients = [], isLoading: previousMonthLoading } = useGetNuevosClientesQuery(
    previousMonthRange ?? { desde: '', hasta: '' },
    { skip: !previousMonthRange },
  );
  const revenueByDay = useMemo(
    () => activity
      .filter((entry) => (entry.ingresos ?? 0) > 0)
      .map((entry) => ({ date: entry.fecha, label: formatShortDate(entry.fecha), ingresos: entry.ingresos ?? 0 })),
    [activity],
  );
  const revenueBySource = useMemo(() => getRevenueBySource(activity), [activity]);
  const newClientsByDay = useMemo(() => groupNewClientsByDay(newClients), [newClients]);
  const monthlyClientGrowth = useMemo(() => getMonthlyClientGrowth(newClients), [newClients]);
  const latestMonth = monthlyClientGrowth.at(-1);
  const previousMonthCount = previousMonthClients.length;
  const latestGrowth = monthlyClientGrowth.length > 1
    ? latestMonth?.growth ?? null
    : latestMonth && previousMonthCount > 0
      ? ((latestMonth.count - previousMonthCount) / previousMonthCount) * 100
      : null;
  const registeredClients = newClients.filter((client) => client.kind === 'Registrado').length;
  const unregisteredClients = newClients.length - registeredClients;
  const totalRevenue = revenueBySource.reduce((total, entry) => total + entry.value, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <section className="lg:col-span-3 bg-[#121212] border border-[#282828] rounded-2xl p-5" aria-labelledby="general-revenue-heading">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 id="general-revenue-heading" className="text-white text-base font-bold">Ingresos generales</h3>
              <p className="text-[11px] text-[#6A6A6A] mt-1">Total cobrado por día, incluyendo reservas, tienda y membresías</p>
            </div>
            <span className="text-green-400 text-sm font-semibold whitespace-nowrap">{formatCurrency(totalRevenue)}</span>
          </div>
          <ChartContainer isFetching={activityFetching} loading={activityLoading} hasData={revenueByDay.length > 0} height={280}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByDay}>
                <defs>
                  <linearGradient id="generalRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
                <XAxis dataKey="label" tick={{ fill: '#8A8A8A', fontSize: 11 }} stroke="#282828" />
                <YAxis tick={{ fill: '#8A8A8A', fontSize: 11 }} stroke="#282828" tickFormatter={(value) => formatCurrency(Number(value))} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #282828', borderRadius: 8, color: '#fff' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value, _name, item) => [formatCurrency(Number(value ?? 0)), `Ingresos · ${String(item?.payload?.name ?? 'Origen')}`]}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#4ade80" fill="url(#generalRevenueGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </section>

        <section className="lg:col-span-2 bg-[#121212] border border-[#282828] rounded-2xl p-5" aria-labelledby="revenue-source-heading">
          <h3 id="revenue-source-heading" className="text-white text-base font-bold mb-1">Origen de los ingresos</h3>
          <p className="text-[11px] text-[#6A6A6A] mb-3">Qué parte aporta cada línea del negocio</p>
          <ChartContainer isFetching={activityFetching} loading={activityLoading} hasData={revenueBySource.length > 0} height={210}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueBySource} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} stroke="none">
                  {revenueBySource.map((entry) => <Cell key={entry.source} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #282828', borderRadius: 8, color: '#fff' }}
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Ingresos']}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="flex flex-col gap-2 mt-1">
            {revenueBySource.map((entry) => (
              <div key={entry.source} className="flex items-center gap-2 text-[12px]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[#8A8A8A] flex-1">{entry.name}</span>
                <span className="text-white font-medium">{formatCurrency(entry.value)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-[#121212] border border-[#282828] rounded-2xl p-5" aria-labelledby="new-clients-heading">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 id="new-clients-heading" className="text-white text-base font-bold">Nuevos usuarios</h3>
              <p className="text-[11px] text-[#6A6A6A] mt-1">Altas registradas durante el período</p>
            </div>
            <span className="text-[#FF5C00] text-sm font-semibold">{newClients.length}</span>
          </div>
          <ChartContainer isFetching={clientsFetching} loading={clientsLoading} hasData={newClientsByDay.length > 0} height={250}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={newClientsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#282828" />
                <XAxis dataKey="label" tick={{ fill: '#8A8A8A', fontSize: 11 }} stroke="#282828" />
                <YAxis allowDecimals={false} tick={{ fill: '#8A8A8A', fontSize: 11 }} stroke="#282828" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #282828', borderRadius: 8, color: '#fff' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [value, 'Usuarios']}
                />
                <Bar dataKey="nuevos" fill="#FF5C00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </section>

        <section className="bg-[#121212] border border-[#282828] rounded-2xl p-5" aria-labelledby="retention-heading">
          <h3 id="retention-heading" className="text-white text-base font-bold mb-1">Salud de la base de clientes</h3>
            <p className="text-[11px] text-[#6A6A6A] mb-4">Crecimiento mensual y composición de las nuevas altas</p>
          {clientsLoading || previousMonthLoading ? <div className="h-[250px] bg-[#1A1A1A] rounded-xl animate-pulse" /> : (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-[#1A1A1A] border border-[#282828] p-4">
                <span className="text-[11px] text-[#8A8A8A]">Crecimiento mes a mes</span>
                <span className={`mt-2 block text-2xl font-bold ${latestGrowth === null ? 'text-[#8A8A8A]' : latestGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatGrowth(latestGrowth)}
                </span>
                {monthlyClientGrowth.length > 0 && <span className="mt-1 block text-[11px] text-[#6A6A6A]">Último mes del período: {latestMonth?.count ?? 0} altas{monthlyClientGrowth.length === 1 ? ` · ${previousMonthCount} el mes anterior` : ''}</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#1A1A1A] border border-[#282828] p-4">
                  <span className="text-[11px] text-[#8A8A8A]">Registrados</span>
                  <span className="mt-2 block text-2xl font-bold text-purple-400">{registeredClients}</span>
                </div>
                <div className="rounded-xl bg-[#1A1A1A] border border-[#282828] p-4">
                  <span className="text-[11px] text-[#8A8A8A]">No registrados</span>
                  <span className="mt-2 block text-2xl font-bold text-gray-400">{unregisteredClients}</span>
                </div>
              </div>
              {monthlyClientGrowth.length > 1 && (
                <div className="flex flex-col gap-1.5 border-t border-[#282828] pt-3">
                  {monthlyClientGrowth.map((entry) => (
                    <div key={entry.month} className="flex items-center justify-between text-[11px]">
                      <span className="text-[#8A8A8A]">{entry.month}</span>
                      <span className="text-white">{entry.count} altas</span>
                      <span className={entry.growth === null ? 'text-[#6A6A6A]' : entry.growth >= 0 ? 'text-green-400' : 'text-red-400'}>{formatGrowth(entry.growth)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
