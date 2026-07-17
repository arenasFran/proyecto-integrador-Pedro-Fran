import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiDollarSign, FiUserPlus, FiAlertCircle, FiXCircle, FiArrowRight, FiShoppingCart, FiInbox, FiAlertTriangle, FiAward, FiUserCheck, FiScissors, FiChevronDown, FiChevronRight, FiMoreVertical, FiCheck, FiX, FiBell, FiTruck } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Modal } from '../../../../components/common/Modal';
import { Spinner } from '../../../../components/common/Spinner';
import { useGetDistribucionQuery, useGetEcommerceOverviewQuery, useGetNuevosClientesQuery, useGetMembershipRevenueQuery, useGetProductPerformanceQuery } from '../../../../services/analyticsApi';
import { useGetAppointmentsQuery, useMarkAsPaidMutation, useCancelAppointmentMutation, useUpdateAppointmentStatusMutation, useSendReminderMutation } from '../../../../services/appointmentApi';
import { useGetAllOrdersQuery, useUpdateOrderStatusMutation } from '../../../../services/orderApi';
import { useGetPendingMembershipsQuery, useApprovePendingMembershipMutation } from '../../../../services/membershipApi';
import { useGetProductsQuery } from '../../../../services/productApi';
import type { OverviewData } from '../../../../types/analytics';
import type { Order } from '../../../../types/order';
import type { MembershipWithUser } from '../../../../types/membership';
import type { Appointment } from '../../../../types/booking';
import DateRangeBadge from './DateRangeBadge';
import { AppointmentDetailModal } from '../../AppointmentsPage/AppointmentDetailModal';
import { OrderDetailModal } from '../../../../components/admin/OrderDetailModal';

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Desglose de ingresos`} size="lg">
      <DateRangeBadge desde={desde} hasta={hasta} />
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
  const [activeTab, setActiveTab] = useState<'turnos' | 'ordenes' | 'membresias'>('turnos');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailMembership, setDetailMembership] = useState<MembershipWithUser | null>(null);

  const { data: appointments = [], isLoading: apptsLoading, refetch: refetchAppts } = useGetAppointmentsQuery(
    { dateFrom: desde, dateTo: hasta, paymentStatus: 'Pendiente', limit: 50 },
    { skip: !isOpen || !desde || !hasta },
  );
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useGetAllOrdersQuery(
    { status: 'pending', desde, hasta, limit: 50 },
    { skip: !isOpen || !desde || !hasta },
  );
  const { data: pendingMemberships, isLoading: memLoading, refetch: refetchMem } = useGetPendingMembershipsQuery(undefined, { skip: !isOpen });

  const [markAsPaid] = useMarkAsPaidMutation();
  const [cancelAppt] = useCancelAppointmentMutation();
  const [updateStatus] = useUpdateAppointmentStatusMutation();
  const [sendReminder] = useSendReminderMutation();
  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [approveMembership] = useApprovePendingMembershipMutation();

  const pendingOrders = ordersData?.orders ?? [];
  const memberships = pendingMemberships?.data ?? [];

  const totalTurnos = appointments.reduce((s, a) => s + a.servicePrice, 0);
  const totalOrdenes = pendingOrders.reduce((s, o) => s + o.total, 0);
  const totalMemb = memberships.reduce((s, m) => s + m.price, 0);
  const totalPending = totalTurnos + totalOrdenes + totalMemb;

  const formatDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
  const isLoading = apptsLoading || ordersLoading || memLoading;

  const getInitials = (name: string, lastname: string) => `${name.charAt(0)}${lastname.charAt(0)}`.toUpperCase();

  const closeMenu = () => setOpenMenuId(null);

  const Avatar = ({ name, lastname, photoUrl }: { name: string; lastname: string; photoUrl?: string | null }) => (
    <div className="w-10 h-10 rounded-full bg-[#242424] border border-[#333] flex items-center justify-center shrink-0 overflow-hidden">
      {photoUrl ? (
        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-[12px] font-semibold text-[#8A8A8A]">{getInitials(name, lastname)}</span>
      )}
    </div>
  );

  const ClientBadge = ({ kind }: { kind?: string }) => {
    if (!kind || kind === 'NoRegistrado') return <span className="text-[10px] font-medium text-gray-400 bg-gray-500/10 rounded-full px-2 py-0.5">Anónimo</span>;
    return <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 rounded-full px-2 py-0.5">Registrado</span>;
  };

  const tabs = [
    { key: 'turnos' as const, label: 'Turnos', count: appointments.length, amount: totalTurnos, color: '#4ade80', icon: FiScissors },
    { key: 'ordenes' as const, label: 'Órdenes', count: pendingOrders.length, amount: totalOrdenes, color: '#FF5C00', icon: FiShoppingCart },
    { key: 'membresias' as const, label: 'Membresías', count: memberships.length, amount: totalMemb, color: '#c084fc', icon: FiAward },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ingresos pendientes" size="xl">
      <DateRangeBadge desde={desde} hasta={hasta} iconColor="text-[#FF5C00]" />

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
              <span className="text-[18px] font-bold text-[#FF5C00]">{formatCurrency(totalPending)}</span>
            </div>

            <div className="flex gap-1 mb-3">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 rounded-[8px] py-2 text-[12px] font-medium transition-colors ${
                    activeTab === t.key ? 'bg-[#1A1A1A] text-white' : 'text-[#6A6A6A] hover:text-white hover:bg-[#1A1A1A]'
                  }`}
                >
                  {t.label} ({t.count})
                </button>
              ))}
            </div>

            <div className="pr-1">
              {activeTab === 'turnos' && (
                appointments.length === 0 ? (
                  <p className="text-[13px] text-[#6A6A6A] text-center py-6">No hay turnos con pago pendiente en este periodo.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {appointments.map((a) => (
                      <div key={a.id} className="rounded-[16px] border border-[#282828] bg-[#121212] p-4 hover:border-[#4ade80]/20 transition-all cursor-pointer" onClick={() => setDetailAppointment(a)}>
                        <div className="flex items-start gap-3">
                          <Avatar name={a.clientName} lastname={a.clientLastname} photoUrl={a.clientPhotoUrl} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-[14px] font-medium text-white truncate">{a.clientName} {a.clientLastname}</p>
                              {a.clientKind ? <ClientBadge kind={a.clientKind} /> : (a.clientId ? <ClientBadge kind="Registrado" /> : <ClientBadge kind="NoRegistrado" />)}
                              <span className="text-[10px] font-medium text-yellow-400 bg-yellow-500/10 rounded-full px-2 py-0.5">Pago pendiente</span>
                            </div>
                            <div className="flex items-center gap-2 text-[12px] text-[#8A8A8A] flex-wrap">
                              <span>{formatDate(a.date)} {a.startTime}</span>
                              <span>·</span>
                              <span>{a.serviceName}</span>
                              <span>·</span>
                              <span>{a.barberName ?? 'Sin barbero'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[14px] font-bold text-[#FF5C00]">${a.servicePrice.toLocaleString('es-UY')}</span>
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setOpenMenuId(openMenuId === a.id ? null : a.id)}
                                className="p-1.5 rounded-[12px] hover:bg-[#242424] text-[#6A6A6A] hover:text-white transition-colors"
                              >
                                <FiMoreVertical size={15} />
                              </button>
                              {openMenuId === a.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={closeMenu} />
                                  <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-[10px] border border-[#333] bg-[#1E1E1E] py-1 shadow-xl">
                                    <button onClick={() => { closeMenu(); markAsPaid({ id: a.id }).then(() => refetchAppts()); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#8A8A8A] hover:text-[#4ade80] hover:bg-[#242424] transition-colors"><FiCheck size={13} />Cobrar</button>
                                    <button onClick={() => { closeMenu(); updateStatus({ id: a.id, status: 'NoShow' }).then(() => refetchAppts()); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#8A8A8A] hover:text-yellow-400 hover:bg-[#242424] transition-colors"><FiXCircle size={13} />No asistió</button>
                                    <button onClick={() => { closeMenu(); cancelAppt({ id: a.id, reason: 'Cancelado por admin' }).then(() => refetchAppts()); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#8A8A8A] hover:text-red-400 hover:bg-[#242424] transition-colors"><FiX size={13} />Cancelar</button>
                                    <button onClick={() => { closeMenu(); sendReminder({ id: a.id }); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#8A8A8A] hover:text-blue-400 hover:bg-[#242424] transition-colors"><FiBell size={13} />Recordatorio</button>
                                  </div>
                                </>
                              )}
                            </div>
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
                      <div key={o.id} className="rounded-[16px] border border-[#282828] bg-[#121212] p-4 hover:border-[#FF5C00]/20 transition-all cursor-pointer" onClick={() => setDetailOrder(o)}>
                        <div className="flex items-start gap-3">
                          <Avatar name={o.userName?.split(' ')[0] ?? 'O'} lastname={o.userName?.split(' ')[1] ?? '#'} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-[14px] font-medium text-white truncate">{o.userName ?? `Orden #${typeof o.id === 'string' ? o.id.slice(-6) : ''}`}</p>
                              <span className="text-[10px] font-medium text-yellow-400 bg-yellow-500/10 rounded-full px-2 py-0.5">Pago pendiente</span>
                            </div>
                            <div className="flex items-center gap-2 text-[12px] text-[#8A8A8A] flex-wrap">
                              <span>{o.items?.length ?? 0} producto(s)</span>
                              <span>·</span>
                              <span>{o.createdAt ? formatDate(o.createdAt.slice(0, 10)) : ''}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[14px] font-bold text-[#FF5C00]">${o.total.toLocaleString('es-UY')}</span>
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setOpenMenuId(openMenuId === o.id ? null : o.id)}
                                className="p-1.5 rounded-[12px] hover:bg-[#242424] text-[#6A6A6A] hover:text-white transition-colors"
                              >
                                <FiMoreVertical size={15} />
                              </button>
                              {openMenuId === o.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={closeMenu} />
                                  <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-[10px] border border-[#333] bg-[#1E1E1E] py-1 shadow-xl">
                                    <button onClick={() => { closeMenu(); updateOrderStatus({ id: o.id, status: 'paid' }).then(() => refetchOrders()); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#8A8A8A] hover:text-[#FF5C00] hover:bg-[#242424] transition-colors"><FiCheck size={13} />Cobrar</button>
                                    <button onClick={() => { closeMenu(); updateOrderStatus({ id: o.id, status: 'delivered' }).then(() => refetchOrders()); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#8A8A8A] hover:text-[#FF5C00] hover:bg-[#242424] transition-colors"><FiTruck size={13} />Cobrar y entregar</button>
                                    <button onClick={() => { closeMenu(); updateOrderStatus({ id: o.id, status: 'cancelled' }).then(() => refetchOrders()); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#8A8A8A] hover:text-red-400 hover:bg-[#242424] transition-colors"><FiX size={13} />Cancelar</button>
                                  </div>
                                </>
                              )}
                            </div>
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
                      <div key={m.id} className="relative rounded-[10px] border border-[#282828] bg-[#1A1A1A] p-3 hover:border-[#c084fc]/20 transition-colors cursor-pointer" onClick={() => setDetailMembership(m)}>
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
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[14px] font-bold text-[#FF5C00]">${m.price.toLocaleString('es-UY')}</span>
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)}
                                className="p-1.5 rounded-[6px] hover:bg-[#242424] text-[#6A6A6A] hover:text-white transition-colors"
                              >
                                <FiMoreVertical size={15} />
                              </button>
                              {openMenuId === m.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={closeMenu} />
                                  <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-[10px] border border-[#333] bg-[#1E1E1E] py-1 shadow-xl">
                                    <button onClick={() => { closeMenu(); approveMembership(m.id).then(() => refetchMem()); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#8A8A8A] hover:text-[#c084fc] hover:bg-[#242424] transition-colors"><FiCheck size={13} />Aprobar</button>
                                    <button onClick={() => { closeMenu(); cancelAppt({ id: m.id, reason: 'Membresía rechazada' }).catch(() => {}); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#8A8A8A] hover:text-red-400 hover:bg-[#242424] transition-colors"><FiX size={13} />Rechazar</button>
                                  </div>
                                </>
                              )}
                            </div>
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

      {detailAppointment && (
        <AppointmentDetailModal appointment={detailAppointment} isOpen={!!detailAppointment} onClose={() => setDetailAppointment(null)} />
      )}
      {detailOrder && (
        <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} onStatusChange={(id, status) => { updateOrderStatus({ id, status }).then(() => { refetchOrders(); setDetailOrder(null); }); }} />
      )}
      {detailMembership && (
        <Modal isOpen={!!detailMembership} onClose={() => setDetailMembership(null)} title="Membresía pendiente" size="sm">
          <div className="flex flex-col gap-3">
            <div className="rounded-[10px] bg-[#1A1A1A] p-3">
              <span className="text-[10px] text-[#6A6A6A] uppercase tracking-wider">Usuario</span>
              <p className="text-[14px] text-white font-medium mt-1">
                {detailMembership.user?.name ? `${detailMembership.user.name} ${detailMembership.user.lastname ?? ''}` : '—'}
              </p>
              <p className="text-[12px] text-[#8A8A8A]">{detailMembership.user?.email ?? 'Sin email'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[10px] bg-[#1A1A1A] p-3">
                <span className="text-[10px] text-[#6A6A6A] uppercase tracking-wider">Precio</span>
                <p className="text-[16px] text-[#FF5C00] font-bold mt-1">${detailMembership.price.toLocaleString('es-UY')}</p>
              </div>
              <div className="rounded-[10px] bg-[#1A1A1A] p-3">
                <span className="text-[10px] text-[#6A6A6A] uppercase tracking-wider">Creada</span>
                <p className="text-[14px] text-white font-medium mt-1">{detailMembership.createdAt ? formatDate(detailMembership.createdAt.slice(0, 10)) : '—'}</p>
              </div>
            </div>
            <button
              onClick={() => { approveMembership(detailMembership.id).then(() => { refetchMem(); setDetailMembership(null); }); }}
              className="w-full rounded-[10px] bg-[#c084fc] px-4 py-2.5 text-white text-[13px] font-medium hover:bg-[#a855f7] transition-colors"
            >
              Aprobar membresía
            </button>
          </div>
        </Modal>
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
