import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiDollarSign, FiUserPlus, FiAlertCircle, FiXCircle, FiArrowRight, FiShoppingCart, FiInbox, FiAlertTriangle, FiAward, FiUserCheck, FiScissors, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Modal } from '../../../../components/common/Modal';
import { Spinner } from '../../../../components/common/Spinner';
import { useGetDistribucionQuery, useGetEcommerceOverviewQuery, useGetNuevosClientesQuery, useGetMembershipRevenueQuery, useGetProductPerformanceQuery } from '../../../../services/analyticsApi';
import { useGetAppointmentsQuery } from '../../../../services/appointmentApi';
import { useGetProductsQuery } from '../../../../services/productApi';
import type { OverviewData } from '../../../../types/analytics';
import type { Appointment } from '../../../../types/booking';

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
      <p className="text-[11px] text-[#6A6A6A] -mt-2 mb-4">
        {desde} → {hasta}
      </p>
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : (
        <div className="flex flex-col gap-4">

          <div className="rounded-[12px] bg-[#121212] border border-[#282828] p-4">
            <span className="text-[11px] text-[#6A6A6A] uppercase tracking-wider">Total combinado</span>
            <div className="flex items-center gap-6 mt-2">
              <div className="w-[140px] h-[140px] shrink-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData.length > 0 ? donutData : [{ name: 'Sin datos', value: 1, hex: '#282828' }]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={62}
                      strokeWidth={0}
                    >
                      {(donutData.length > 0 ? donutData : [{ name: 'Sin datos', value: 1, hex: '#282828' }]).map((entry, index) => (
                        <Cell key={index} fill={entry.hex} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[15px] font-bold text-white">{formatCurrency(totalCombined)}</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                {segments.map((seg) => (
                  <div key={seg.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seg.hex }} />
                    <span className="text-[11px] text-[#8A8A8A] flex-1">{seg.label}</span>
                    <span className="text-[12px] text-white font-medium">{formatCurrency(seg.value)}</span>
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
                <div className="grid grid-cols-[1fr_80px_100px] text-[10px] text-[#6A6A6A] uppercase tracking-wider pb-1.5 border-b border-[#282828]">
                  <span>Barbero</span>
                  <span className="text-center">Turnos</span>
                  <span className="text-right">Ingresos</span>
                </div>
                {entries.map((entry) => (
                  <div key={entry.barberId} className="grid grid-cols-[1fr_80px_100px] items-center text-[12px] py-1">
                    <span className="text-white font-medium">{entry.nombre}</span>
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
                <div className="grid grid-cols-[1fr_70px_100px] text-[10px] text-[#6A6A6A] uppercase tracking-wider pb-1.5 border-b border-[#282828]">
                  <span>Producto</span>
                  <span className="text-center">Vendidos</span>
                  <span className="text-right">Ingresos</span>
                </div>
                {productPerformance.slice(0, 15).map((p) => (
                  <div key={p.productId} className="grid grid-cols-[1fr_70px_100px] items-center text-[12px] py-1">
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
                <div className="grid grid-cols-[1fr_80px_100px] text-[10px] text-[#6A6A6A] uppercase tracking-wider pb-1.5 border-b border-[#282828]">
                  <span>Mes</span>
                  <span className="text-center">Cantidad</span>
                  <span className="text-right">Ingresos</span>
                </div>
                {membershipRevenue.map((m) => (
                  <div key={m.periodo} className="grid grid-cols-[1fr_80px_100px] items-center text-[12px] py-1">
                    <span className="text-white">{m.periodo}</span>
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
  const { data: appointments = [], isLoading, isFetching } = useGetAppointmentsQuery(
    { dateFrom: desde, dateTo: hasta, paymentStatus: 'Pendiente' },
    { skip: !isOpen || !desde || !hasta },
  );

  const statusBadge = (status: Appointment['status']) => {
    const styles: Record<string, { bg: string; text: string }> = {
      Confirmado: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
      Completado: { bg: 'bg-green-500/10', text: 'text-green-400' },
      Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400' },
      NoShow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
    };
    const s = styles[status] ?? styles.Confirmado;
    return <span className={`text-[10px] font-medium ${s.bg} ${s.text} rounded-full px-2 py-0.5`}>{status}</span>;
  };

  const paymentBadge = (paymentStatus: Appointment['paymentStatus']) => {
    const styles: Record<string, { bg: string; text: string }> = {
      Pendiente: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
      Pagado: { bg: 'bg-green-500/10', text: 'text-green-400' },
      Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400' },
    };
    const s = styles[paymentStatus] ?? styles.Pendiente;
    return <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${s.bg} ${s.text}`}>{paymentStatus}</span>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Turnos con pago pendiente" size="lg">
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Spinner size="lg" /></div>
      ) : appointments.length === 0 ? (
        <p className="text-[14px] text-[#8A8A8A] text-center py-8">No hay turnos con pago pendiente.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {appointments.map((a) => (
            <div key={a.id} className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-3 flex flex-col gap-2 hover:border-[#FF5C00]/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white truncate">{a.clientName} {a.clientLastname}</p>
                  <div className="flex items-center gap-3 text-[12px] text-[#8A8A8A] mt-1">
                    <span>{a.date}</span>
                    <span>{a.startTime} - {a.endTime}</span>
                    <span>{a.serviceName}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-[#6A6A6A] uppercase tracking-wider">Turno</span>
                    {statusBadge(a.status)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-[#6A6A6A] uppercase tracking-wider">Pago</span>
                    {paymentBadge(a.paymentStatus)}
                  </div>
                </div>
              </div>
              <div className="text-[12px] text-[#8A8A8A]">
                <span className="text-green-400 font-medium">${a.servicePrice.toLocaleString('es-UY')}</span>
                <span className="mx-2">·</span>
                <span>{a.barberName ?? 'Sin barbero'}</span>
              </div>
            </div>
          ))}
          {isFetching && (
            <div className="flex justify-center py-2">
              <div className="w-4 h-4 border-2 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
            </div>
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
