import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiDollarSign, FiUserPlus, FiAlertCircle, FiXCircle, FiArrowRight, FiShoppingCart, FiInbox, FiAlertTriangle, FiAward, FiUserCheck, FiScissors, FiChevronDown, FiChevronRight, FiCalendar, FiExternalLink } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Modal } from '../../../../components/common/Modal';
import { Spinner } from '../../../../components/common/Spinner';
import { useGetDistribucionQuery, useGetEcommerceOverviewQuery, useGetNuevosClientesQuery, useGetMembershipRevenueQuery, useGetProductPerformanceQuery } from '../../../../services/analyticsApi';
import { useGetAppointmentsQuery } from '../../../../services/appointmentApi';
import { useGetAllOrdersQuery } from '../../../../services/orderApi';
import { useGetPendingMembershipsQuery } from '../../../../services/membershipApi';
import { useGetProductsQuery } from '../../../../services/productApi';
import type { OverviewData } from '../../../../types/analytics';

interface KpiCardsProps {
  data: OverviewData | null;
  loading: boolean;
  error: string | null;
  desde: string;
  hasta: string;
}

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('es-UY');
}

function IncomeBreakdownModal({ isOpen, onClose, desde, hasta, ecommerceData }: { isOpen: boolean; onClose: () => void; desde: string; hasta: string; ecommerceData?: { totalRevenue: number; totalOrders: number; averageTicket: number } | null }) {
  const [showBarbers, setShowBarbers] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [showMemberships, setShowMemberships] = useState(false);

  const periodLabel = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(desde + 'T00:00:00');
    const h = new Date(hasta + 'T23:59:59');
    const diffMs = h.getTime() - d.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;

    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.getTime() === today.getTime() && h.toDateString() === today.toDateString()) return 'Hoy';
    if (d.getTime() === yesterday.getTime() && h.toDateString() === yesterday.toDateString()) return 'Ayer';
    if (d.getTime() === tomorrow.getTime() && h.toDateString() === tomorrow.toDateString()) return 'Mañana';

    const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay() + 1);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    if (d.getTime() === weekStart.getTime() && h.toDateString() === weekEnd.toDateString()) return 'Esta semana';

    const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(weekStart.getDate() - 7);
    const lastWeekEnd = new Date(lastWeekStart); lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
    if (d.getTime() === lastWeekStart.getTime() && h.toDateString() === lastWeekEnd.toDateString()) return 'Semana pasada';

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    if (d.getTime() === monthStart.getTime() && h.toDateString() === monthEnd.toDateString()) return 'Este mes';

    const yearStart = new Date(today.getFullYear(), 0, 1);
    const yearEnd = new Date(today.getFullYear(), 11, 31);
    if (d.getTime() === yearStart.getTime() && h.toDateString() === yearEnd.toDateString()) return 'Este año';

    if (diffDays <= 1) return '1 día';
    if (diffDays <= 7) return `${diffDays} días`;
    if (diffDays <= 31) return `${Math.round(diffDays / 7)} semanas`;
    if (diffDays <= 365) return `${Math.round(diffDays / 30)} meses`;
    return '';
  })();

  const { data: distData, isLoading: distLoading } = useGetDistribucionQuery({ desde, hasta }, { skip: !isOpen || !desde || !hasta });
  const { data: membershipRevenue } = useGetMembershipRevenueQuery({ desde, hasta }, { skip: !isOpen || !desde || !hasta });
  const { data: productPerformance } = useGetProductPerformanceQuery({ desde, hasta }, { skip: !isOpen || !desde || !hasta });

  const entries = distData?.byBarber ?? [];
  const totalAppointments = entries.reduce((s, e) => s + e.ingresos, 0);
  const totalProducts = ecommerceData?.totalRevenue ?? 0;
  const totalMemberships = membershipRevenue?.reduce((s, e) => s + e.ganancias, 0) ?? 0;
  const totalCombined = totalAppointments + totalProducts + totalMemberships;
  const isLoading = distLoading;

  const segments = [
    { label: 'Turnos', value: totalAppointments, color: 'bg-green-400', hex: '#4ade80', icon: FiScissors, pct: totalCombined > 0 ? Math.round((totalAppointments / totalCombined) * 100) : 0 },
    { label: 'Productos', value: totalProducts, color: 'bg-[#FF5C00]', hex: '#FF5C00', icon: FiShoppingCart, pct: totalCombined > 0 ? Math.round((totalProducts / totalCombined) * 100) : 0 },
    { label: 'Membresias', value: totalMemberships, color: 'bg-purple-400', hex: '#c084fc', icon: FiAward, pct: totalCombined > 0 ? Math.round((totalMemberships / totalCombined) * 100) : 0 },
  ];

  const donutData = segments.filter(s => s.value > 0).map(s => ({ name: s.label, value: s.value, hex: s.hex }));

  const CollapsibleSection = ({ title, icon: Icon, color: sectionColor, open, onToggle, children }: { title: string; icon: React.ComponentType<{ className?: string; color?: string }>; color: string; open: boolean; onToggle: () => void; children: React.ReactNode }) => (
    <div className="rounded-[12px] bg-[#1A1A1A] border border-[#282828] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#242424] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="text-[14px]" color={sectionColor} />
          <span className="text-[12px] text-[#8A8A8A] uppercase tracking-wider">{title}</span>
        </div>
        {open ? <FiChevronDown className="text-[#6A6A6A]" /> : <FiChevronRight className="text-[#6A6A6A]" />}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );

  const formatDisplayDate = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Desglose de ingresos`} size="lg">
      <div className="flex items-center gap-2 flex-wrap -mt-1 mb-4">
        <div className="rounded-[8px] bg-[#1A1A1A] border border-[#282828] px-3 py-1.5 flex items-center gap-1.5">
          <FiCalendar size={13} className="text-[#FF5C00] shrink-0" />
          <span className="text-[11px] sm:text-[12px] text-[#8A8A8A]">{formatDisplayDate(desde)}</span>
          <span className="text-[10px] text-[#555]">→</span>
          <span className="text-[11px] sm:text-[12px] text-[#8A8A8A]">{formatDisplayDate(hasta)}</span>
        </div>
        {periodLabel && (
          <span className="text-[11px] text-[#6A6A6A] font-medium bg-[#1A1A1A] border border-[#333] rounded-full px-2.5 py-1">{periodLabel}</span>
        )}
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : (
        <div className="flex flex-col gap-4">

          <div className="rounded-[12px] bg-[#121212] border border-[#282828] p-4 w-full sm:w-fit">
            <span className="text-[11px] text-[#6A6A6A] uppercase tracking-wider">Total combinado</span>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mt-2">
              <div className="w-[120px] h-[120px] shrink-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData.length > 0 ? donutData : [{ name: 'Sin datos', value: 1, hex: '#282828' }]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={52}
                      strokeWidth={0}
                    >
                      {(donutData.length > 0 ? donutData : [{ name: 'Sin datos', value: 1, hex: '#282828' }]).map((entry, index) => (
                        <Cell key={index} fill={entry.hex} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[13px] font-bold text-white">{formatCurrency(totalCombined)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {segments.map((seg) => (
                  <div key={seg.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seg.hex }} />
                    <span className="text-[11px] text-[#8A8A8A] w-[80px] shrink-0">{seg.label}</span>
                    <span className="text-[12px] text-white font-medium w-[80px] text-right">{formatCurrency(seg.value)}</span>
                    <span className="text-[11px] text-[#6A6A6A] w-9 text-right">{seg.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {totalCombined === 0 && (
            <p className="text-[13px] text-[#8A8A8A] text-center py-2">Sin ingresos en este periodo.</p>
          )}

          {entries.length > 0 && (
            <CollapsibleSection title="Detalle por barbero (turnos)" icon={FiScissors} color="#4ade80" open={showBarbers} onToggle={() => setShowBarbers(!showBarbers)}>
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-[1fr_55px_75px] sm:grid-cols-[1fr_80px_100px] text-[10px] text-[#6A6A6A] uppercase tracking-wider pb-1.5 border-b border-[#282828]">
                  <span>Barbero</span>
                  <span className="text-center">Turnos</span>
                  <span className="text-right">Ingresos</span>
                </div>
                {entries.map((entry) => (
                  <div key={entry.barberId} className="grid grid-cols-[1fr_55px_75px] sm:grid-cols-[1fr_80px_100px] items-center text-[11px] sm:text-[12px] py-1">
                    <span className="text-white font-medium truncate">{entry.nombre}</span>
                    <span className="text-[#8A8A8A] text-center">{entry.cantidad}</span>
                    <span className="text-green-400 font-medium text-right">{formatCurrency(entry.ingresos)}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          <CollapsibleSection title="Detalle de productos" icon={FiShoppingCart} color="#FF5C00" open={showProducts} onToggle={() => setShowProducts(!showProducts)}>
            {productPerformance && productPerformance.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-[1fr_50px_75px] sm:grid-cols-[1fr_70px_100px] text-[10px] text-[#6A6A6A] uppercase tracking-wider pb-1.5 border-b border-[#282828]">
                  <span>Producto</span>
                  <span className="text-center">Vend.</span>
                  <span className="text-right">Ingresos</span>
                </div>
                {productPerformance.slice(0, 15).map((p) => (
                  <div key={p.productId} className="grid grid-cols-[1fr_50px_75px] sm:grid-cols-[1fr_70px_100px] items-center text-[11px] sm:text-[12px] py-1">
                    <span className="text-white truncate">{p.name}</span>
                    <span className="text-[#8A8A8A] text-center">{p.totalSold}</span>
                    <span className="text-[#FF5C00] font-medium text-right">{formatCurrency(p.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-[#6A6A6A] py-2">Sin ventas de productos en este periodo.</p>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Detalle de membresias" icon={FiAward} color="#c084fc" open={showMemberships} onToggle={() => setShowMemberships(!showMemberships)}>
            {membershipRevenue && membershipRevenue.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-[1fr_50px_75px] sm:grid-cols-[1fr_80px_100px] text-[10px] text-[#6A6A6A] uppercase tracking-wider pb-1.5 border-b border-[#282828]">
                  <span>Mes</span>
                  <span className="text-center">Cant.</span>
                  <span className="text-right">Ingresos</span>
                </div>
                {membershipRevenue.map((m) => (
                  <div key={m.periodo} className="grid grid-cols-[1fr_50px_75px] sm:grid-cols-[1fr_80px_100px] items-center text-[11px] sm:text-[12px] py-1">
                    <span className="text-white truncate">{m.periodo}</span>
                    <span className="text-[#8A8A8A] text-center">{m.cantidadReservas}</span>
                    <span className="text-purple-400 font-medium text-right">{formatCurrency(m.ganancias)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-[#6A6A6A] py-2">Sin ingresos por membresias en este periodo.</p>
            )}
          </CollapsibleSection>
        </div>
      )}
    </Modal>
  );
}

const kindBadge = (kind: string) => {
  if (kind === 'Registrado') return <span className="text-[10px] font-medium bg-purple-500/10 text-purple-400 rounded-full px-2 py-0.5">Registrado</span>;
  return <span className="text-[10px] font-medium bg-gray-500/10 text-gray-400 rounded-full px-2 py-0.5">Anonimo</span>;
};

function NewClientsModal({ isOpen, onClose, desde, hasta, navigate }: { isOpen: boolean; onClose: () => void; desde: string; hasta: string; navigate: (path: string) => void }) {
  const { data: nuevos = [], isLoading } = useGetNuevosClientesQuery({ desde, hasta }, { skip: !isOpen || !desde || !hasta });

  const registrados = useMemo(() => nuevos.filter(c => c.kind === 'Registrado').length, [nuevos]);
  const anonimos = useMemo(() => nuevos.length - registrados, [nuevos, registrados]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevos clientes" size="lg">
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[10px] bg-[#1A1A1A] p-3 flex flex-col gap-1">
              <span className="text-[10px] text-[#6A6A6A] uppercase tracking-wider">Nuevos</span>
              <span className="text-[28px] font-bold text-[#FF5C00]">{nuevos.length}</span>
            </div>
            <div className="rounded-[10px] bg-[#1A1A1A] p-3 flex flex-col gap-1">
              <span className="text-[10px] text-[#6A6A6A] uppercase tracking-wider">Registrados</span>
              <span className="text-[28px] font-bold text-purple-400">{registrados}</span>
            </div>
            <div className="rounded-[10px] bg-[#1A1A1A] p-3 flex flex-col gap-1">
              <span className="text-[10px] text-[#6A6A6A] uppercase tracking-wider">Anónimos</span>
              <span className="text-[28px] font-bold text-gray-400">{anonimos}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[#6A6A6A] uppercase tracking-wider">Lista de nuevos clientes</span>
              <span className="text-[11px] text-[#8A8A8A]">{nuevos.length} clientes</span>
            </div>
            {nuevos.length === 0 ? (
              <p className="text-[13px] text-[#8A8A8A] text-center py-4">No hay nuevos clientes en este período.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                {nuevos.slice(0, 20).map((c) => (
                  <div key={c.clientId} className="flex items-center justify-between rounded-[8px] bg-[#1A1A1A] px-3 py-2 text-[12px]">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-white truncate">{c.name} {c.lastname}</span>
                      {kindBadge(c.kind)}
                    </div>
                    <span className="text-[#8A8A8A] shrink-0 ml-2">{c.phone ?? c.email ?? ''}</span>
                  </div>
                ))}
                {nuevos.length > 20 && (
                  <p className="text-[11px] text-[#8A8A8A] text-center pt-1">... y {nuevos.length - 20} más</p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => { onClose(); navigate('/admin/clientes'); }}
            className="flex items-center justify-center gap-2 rounded-[10px] bg-[#FF5C00] px-4 py-2.5 text-white text-[13px] font-medium hover:bg-[#E55300] transition-colors"
          >
            <FiUserPlus size={16} />
            Ver todos los clientes
            <FiArrowRight size={16} />
          </button>
        </div>
      )}
    </Modal>
  );
}

function PendingIncomeModal({ isOpen, onClose, desde, hasta }: { isOpen: boolean; onClose: () => void; desde: string; hasta: string }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'turnos' | 'ordenes' | 'membresias'>('turnos');

  const { data: appointments = [], isLoading: apptsLoading } = useGetAppointmentsQuery(
    { dateFrom: desde, dateTo: hasta, paymentStatus: 'Pendiente', limit: 50 },
    { skip: !isOpen || !desde || !hasta },
  );
  const { data: ordersData, isLoading: ordersLoading } = useGetAllOrdersQuery(
    { status: 'pending', desde, hasta, limit: 50 },
    { skip: !isOpen || !desde || !hasta },
  );
  const { data: pendingMemberships, isLoading: memLoading } = useGetPendingMembershipsQuery(undefined, { skip: !isOpen });

  const pendingOrders = ordersData?.orders ?? [];
  const memberships = pendingMemberships?.data ?? [];

  const totalTurnos = appointments.reduce((s, a) => s + a.servicePrice, 0);
  const totalOrdenes = pendingOrders.reduce((s, o) => s + o.total, 0);
  const totalMemb = memberships.reduce((s, m) => s + m.price, 0);
  const totalPending = totalTurnos + totalOrdenes + totalMemb;

  const formatDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
  const isLoading = apptsLoading || ordersLoading || memLoading;

  const tabs = [
    { key: 'turnos' as const, label: 'Turnos', count: appointments.length, amount: totalTurnos, color: '#4ade80', icon: FiScissors },
    { key: 'ordenes' as const, label: 'Órdenes', count: pendingOrders.length, amount: totalOrdenes, color: '#FF5C00', icon: FiShoppingCart },
    { key: 'membresias' as const, label: 'Membresías', count: memberships.length, amount: totalMemb, color: '#c084fc', icon: FiAward },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ingresos pendientes" size="xl">
      <div className="flex items-center gap-2 flex-wrap -mt-1 mb-4">
        <div className="rounded-[8px] bg-[#1A1A1A] border border-[#282828] px-3 py-1.5 flex items-center gap-1.5">
          <FiCalendar size={13} className="text-yellow-400 shrink-0" />
          <span className="text-[11px] sm:text-[12px] text-[#8A8A8A]">{formatDate(desde)}</span>
          <span className="text-[10px] text-[#555]">→</span>
          <span className="text-[11px] sm:text-[12px] text-[#8A8A8A]">{formatDate(hasta)}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`rounded-[12px] border p-3 flex flex-col gap-1.5 text-left transition-all ${
                  activeTab === t.key ? 'border-[#333] bg-[#1A1A1A]' : 'border-[#282828] bg-[#121212] hover:border-[#333]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <t.icon size={14} style={{ color: t.color }} />
                  <span className="text-[10px] text-[#6A6A6A] uppercase tracking-wider">{t.label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-[22px] font-bold text-white">{formatCurrency(t.amount)}</span>
                  <span className="text-[11px] text-[#6A6A6A]">{t.count} pend.</span>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-[12px] bg-[#121212] border border-[#282828] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-[#6A6A6A] uppercase tracking-wider">Total pendiente</span>
              <span className="text-[18px] font-bold text-yellow-400">{formatCurrency(totalPending)}</span>
            </div>

            <div className="flex gap-1 mb-3">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 rounded-[8px] py-2 text-[12px] font-medium transition-colors ${
                    activeTab === t.key
                      ? 'bg-[#1A1A1A] text-white'
                      : 'text-[#6A6A6A] hover:text-white hover:bg-[#1A1A1A]'
                  }`}
                >
                  {t.label} ({t.count})
                </button>
              ))}
            </div>

            <div className="max-h-[40vh] overflow-y-auto pr-1">
              {activeTab === 'turnos' && (
                appointments.length === 0 ? (
                  <p className="text-[13px] text-[#6A6A6A] text-center py-6">No hay turnos con pago pendiente en este periodo.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {appointments.map((a) => (
                      <div key={a.id} className="rounded-[10px] border border-[#282828] bg-[#1A1A1A] p-3 hover:border-[#4ade80]/20 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-white truncate">{a.clientName} {a.clientLastname}</p>
                            <div className="flex items-center gap-2 text-[11px] text-[#8A8A8A] mt-0.5 flex-wrap">
                              <span>{formatDate(a.date)} {a.startTime}</span>
                              <span>·</span>
                              <span>{a.serviceName}</span>
                              <span>·</span>
                              <span>{a.barberName ?? 'Sin barbero'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[14px] font-bold text-yellow-400">${a.servicePrice.toLocaleString('es-UY')}</span>
                            <button
                              onClick={() => { onClose(); navigate(`/admin/turnos?dateFrom=${desde}&dateTo=${hasta}`); }}
                              className="text-[#555] hover:text-[#4ade80] transition-colors"
                              title="Ver turnos"
                            >
                              <FiExternalLink size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'ordenes' && (
                pendingOrders.length === 0 ? (
                  <p className="text-[13px] text-[#6A6A6A] text-center py-6">No hay órdenes pendientes de pago en este periodo.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {pendingOrders.map((o) => (
                      <div key={o.id} className="rounded-[10px] border border-[#282828] bg-[#1A1A1A] p-3 hover:border-[#FF5C00]/20 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-white truncate">
                              Orden #{typeof o.id === 'string' ? o.id.slice(-6) : ''}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-[#8A8A8A] mt-0.5 flex-wrap">
                              <span>{o.items?.length ?? 0} producto(s)</span>
                              <span>·</span>
                              <span>{o.createdAt ? formatDate(o.createdAt.slice(0, 10)) : ''}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[14px] font-bold text-yellow-400">${o.total.toLocaleString('es-UY')}</span>
                            <button
                              onClick={() => { onClose(); navigate(`/admin/ordenes?status=pending&dateFrom=${desde}&dateTo=${hasta}`); }}
                              className="text-[#555] hover:text-[#FF5C00] transition-colors"
                              title="Ver órdenes"
                            >
                              <FiExternalLink size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'membresias' && (
                memberships.length === 0 ? (
                  <p className="text-[13px] text-[#6A6A6A] text-center py-6">No hay membresías pendientes de pago.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {memberships.map((m) => (
                      <div key={m.id} className="rounded-[10px] border border-[#282828] bg-[#1A1A1A] p-3 hover:border-[#c084fc]/20 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-white truncate">
                              {m.user?.name ? `${m.user.name} ${m.user.lastname ?? ''}` : m.user?.email ?? 'Usuario'}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-[#8A8A8A] mt-0.5">
                              <span className="text-purple-400 font-medium">Membresía mensual</span>
                              <span>·</span>
                              <span>{m.createdAt ? formatDate(m.createdAt.slice(0, 10)) : ''}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[14px] font-bold text-yellow-400">${m.price.toLocaleString('es-UY')}</span>
                            <button
                              onClick={() => { onClose(); navigate('/admin/membresias'); }}
                              className="text-[#555] hover:text-[#c084fc] transition-colors"
                              title="Ver membresías"
                            >
                              <FiExternalLink size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          {totalPending === 0 && !isLoading && (
            <p className="text-[13px] text-[#8A8A8A] text-center py-2">No hay ingresos pendientes en este periodo.</p>
          )}
        </div>
      )}
    </Modal>
  );
}

const CARDS_CONFIG = [
  { key: 'reservas', label: 'Reservas', icon: FiUsers, format: (v: number) => String(v), clickable: true, tooltip: 'Total de turnos agendados en el período (todos los estados)' },
  { key: 'ingresos', label: 'Ingresos totales', icon: FiDollarSign, format: (v: number) => formatCurrency(v), clickable: true, tooltip: 'Turnos completados + pagos de productos y membresías aprobados' },
  { key: 'ingresosPendientes', label: 'Ingresos pendientes', icon: FiAlertCircle, format: (v: number) => formatCurrency(v), clickable: true, tooltip: 'Turnos con pago pendiente + órdenes y membresías pendientes de pago' },
  { key: 'tasaCancelTurnos', label: 'Cancelación turnos', icon: FiXCircle, format: (v: number) => `${v}%`, clickable: false, tooltip: 'Porcentaje de turnos cancelados o no-show sobre el total de turnos' },
  { key: 'tasaCancelOrdenes', label: 'Cancelación órdenes', icon: FiXCircle, format: (v: number) => `${v}%`, clickable: false, tooltip: 'Porcentaje de órdenes canceladas sobre el total de órdenes' },
  { key: 'clientes', label: 'Nuevos clientes', icon: FiUserPlus, format: (v: number) => String(v), clickable: true, tooltip: 'Clientes (registrados y anónimos) creados en el período' },
  { key: 'membresias', label: 'Membresías activas', icon: FiAward, format: (v: number) => String(v), clickable: true, tooltip: 'Membresías actualmente activas (no vencidas)' },
  { key: 'clientesUnicos', label: 'Clientes únicos', icon: FiUserCheck, format: (v: number) => String(v), clickable: false, tooltip: 'Clientes distintos con al menos un turno en el período' },
  { key: 'ordenes', label: 'Órdenes totales', icon: FiShoppingCart, format: (v: number) => String(v), clickable: true, tooltip: 'Total de órdenes de ecommerce en el período' },
  { key: 'ordenesPendientes', label: 'Órdenes pendientes', icon: FiInbox, format: (v: number) => String(v), clickable: true, tooltip: 'Órdenes con estado pendiente de pago' },
];

export default function KpiCards({ data, loading, error, desde, hasta }: KpiCardsProps) {
  const navigate = useNavigate();
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showPendingIncomeModal, setShowPendingIncomeModal] = useState(false);
  const [showNewClientsModal, setShowNewClientsModal] = useState(false);

  const { data: ecommerceData } = useGetEcommerceOverviewQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );

  const { data: productsData } = useGetProductsQuery({});
  const allProducts = productsData?.products ?? [];
  const lowStockProducts = allProducts.filter((p) => p.stock > 0 && p.stock <= (p.minStock || 5));
  const pendingOrders = ecommerceData?.ordersByStatus?.pending ?? 0;

  if (error) {
    return (
      <div className="text-[#FF5C00] text-sm bg-[#1A1A1A] rounded-2xl p-5 border border-[#282828]">
        Error al cargar KPIs: {error}
      </div>
    );
  }

  const totalCancelTurnos = data
    ? (data.estadisticasPorEstado.cancelado ?? 0) + (data.estadisticasPorEstado.noshow ?? 0)
    : 0;
  const tasaCancelTurnos = data && data.totalReservas > 0 ? Math.round((totalCancelTurnos / data.totalReservas) * 100) : 0;

  const totalCancelOrdenes = data
    ? (data.estadisticasPorEstado.cancelled_order ?? 0)
    : 0;
  const totalOrdenes = data ? (data.estadisticasPorEstado.total_orders ?? 0) : 0;
  const tasaCancelOrdenes = totalOrdenes > 0 ? Math.round((totalCancelOrdenes / totalOrdenes) * 100) : 0;

  const values = data
    ? [
        data.totalReservas,
        data.ingresosTotales,
        data.ingresosPendientes,
        tasaCancelTurnos,
        tasaCancelOrdenes,
        data.nuevosClientes,
        data.membresiasActivas ?? 0,
        data.clientesUnicos ?? 0,
        ecommerceData?.totalOrders ?? 0,
        pendingOrders,
      ]
    : [null, null, null, null, null, null, null, null, null, null];

  const handleCardClick = (key: string) => {
    switch (key) {
      case 'reservas':
        navigate(`/admin/turnos?dateFrom=${desde}&dateTo=${hasta}`);
        break;
      case 'ingresos':
        setShowIncomeModal(true);
        break;
      case 'ingresosPendientes':
        setShowPendingIncomeModal(true);
        break;
      case 'clientes':
        setShowNewClientsModal(true);
        break;
      case 'ordenes':
        navigate('/admin/ordenes');
        break;
      case 'ordenesPendientes':
        navigate('/admin/ordenes?status=pending');
        break;
    }
  };

  return (
    <>
      {(lowStockProducts.length > 0 || pendingOrders > 0) && (
        <div className="flex flex-col gap-2 mb-2">
          {pendingOrders > 0 && (
            <div className="flex items-center gap-2 rounded-[10px] bg-yellow-500/10 border border-yellow-500/20 px-4 py-2">
              <FiAlertCircle className="text-yellow-400 shrink-0" size={16} />
              <span className="text-[12px] text-yellow-300">{pendingOrders} orden(es) pendiente(s) de pago</span>
            </div>
          )}
          {lowStockProducts.length > 0 && (
            <div className="flex items-center gap-2 rounded-[10px] bg-orange-500/10 border border-orange-500/20 px-4 py-2">
              <FiAlertTriangle className="text-orange-400 shrink-0" size={16} />
              <span className="text-[12px] text-orange-300">{lowStockProducts.length} producto(s) con stock bajo</span>
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {CARDS_CONFIG.map((card, idx) => {
          if (!card.clickable) {
            return (
              <div
                key={card.key}
                className="bg-[#121212] border border-[#282828] rounded-2xl p-5 flex flex-col gap-3"
                title={card.tooltip}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[#8A8A8A] text-sm font-medium">{card.label}</span>
                  <card.icon className="text-[#FF5C00] text-xl" />
                </div>
                <span className="text-white text-2xl font-bold">
                  {loading ? (
                    <span className="inline-block w-20 h-6 bg-[#242424] rounded animate-pulse" />
                  ) : values[idx] !== null ? (
                    card.format(values[idx]!)
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            );
          }
          return (
            <button
              key={card.key}
              onClick={() => handleCardClick(card.key)}
              className="bg-[#121212] border border-[#282828] rounded-2xl p-5 flex flex-col gap-3 text-left hover:border-[#FF5C00]/50 transition-colors cursor-pointer"
              title={card.tooltip}
            >
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A] text-sm font-medium">{card.label}</span>
                <card.icon className="text-[#FF5C00] text-xl" />
              </div>
              <span className="text-white text-2xl font-bold">
                {loading ? (
                  <span className="inline-block w-20 h-6 bg-[#242424] rounded animate-pulse" />
                ) : values[idx] !== null ? (
                  card.format(values[idx]!)
                ) : (
                  '—'
                )}
              </span>
            </button>
          );
        })}
      </div>
      <IncomeBreakdownModal isOpen={showIncomeModal} onClose={() => setShowIncomeModal(false)} desde={desde} hasta={hasta} ecommerceData={ecommerceData} />
      <PendingIncomeModal isOpen={showPendingIncomeModal} onClose={() => setShowPendingIncomeModal(false)} desde={desde} hasta={hasta} />
      <NewClientsModal isOpen={showNewClientsModal} onClose={() => setShowNewClientsModal(false)} desde={desde} hasta={hasta} navigate={navigate} />
    </>
  );
}
