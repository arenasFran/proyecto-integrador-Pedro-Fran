import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiChevronDown, FiChevronUp, FiPackage, FiRefreshCw, FiShoppingBag } from 'react-icons/fi';
import { ClientPageShell, ClientState, StatusBadge } from '../../../components/common';
import { useGetMyOrdersQuery } from '../../../services/orderApi';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import type { Order, OrderStatus } from '../../../types/order';

const statusLabels: Record<OrderStatus, { label: string; tone: 'warning' | 'success' | 'info' | 'danger' | 'purple' | 'accent' }> = {
  pending: { label: 'Pendiente', tone: 'warning' },
  paid: { label: 'Pagado', tone: 'success' },
  delivered: { label: 'Entregado', tone: 'info' },
  cancelled: { label: 'Cancelado', tone: 'danger' },
  refunded: { label: 'Reembolsado', tone: 'purple' },
  disputed: { label: 'En disputa', tone: 'accent' },
  stock_issue: { label: 'Problema de stock', tone: 'danger' },
};

function getStatusLabel(order: Order) {
  if (order.status === 'pending' && order.paymentMethod === 'local') return { label: 'Pago al levantar', tone: 'warning' as const };
  if (order.status === 'pending' && order.paymentMethod && order.paymentMethod !== 'local') return { label: 'Pago online pendiente', tone: 'warning' as const };
  return statusLabels[order.status] ?? { label: order.status, tone: 'neutral' as const };
}

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const status = getStatusLabel(order);

  return (
    <article className="overflow-hidden rounded-2xl border border-[#292929] bg-[#121212]">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1d1d1d] text-[#FF7A33]"><FiPackage aria-hidden="true" /></div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className="text-[14px] font-semibold text-white">Orden #{order.id.slice(-6).toUpperCase()}</span><StatusBadge label={status?.label ?? order.status} tone={status?.tone ?? 'neutral'} /></div>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#777]"><FiCalendar aria-hidden="true" />{formatDate(order.createdAt)} · {order.items.length} producto{order.items.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end"><p className="text-[17px] font-semibold text-[#FF8A4C]">{formatCurrency(order.total)}</p><button type="button" onClick={() => setExpanded((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#333] text-[#8a8a8a] transition-colors hover:border-[#FF5C00]/50 hover:text-white" aria-label={expanded ? 'Ocultar detalle de orden' : 'Mostrar detalle de orden'}>{expanded ? <FiChevronUp /> : <FiChevronDown />}</button></div>
      </div>

      <div className="border-t border-[#292929] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#777]">
          {order.paymentMethod && <span>Pago: <strong className="font-medium text-[#b0b0b0]">{order.paymentMethod === 'local' ? 'En local' : 'Online'}</strong></span>}
          {order.updatedAt && <span>Actualizada: <strong className="font-medium text-[#b0b0b0]">{formatDate(order.updatedAt)}</strong></span>}
        </div>
      </div>

      {expanded && <div className="grid gap-5 border-t border-[#292929] bg-[#0f0f0f] p-4 sm:p-5 lg:grid-cols-[1fr_220px]">
        <div className="grid gap-2">
          {order.items.map((item) => <div key={`${order.id}-${item.productId}`} className="flex items-center gap-3 rounded-xl border border-[#292929] bg-[#171717] p-2.5"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#222]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-[#666]"><FiPackage aria-hidden="true" /></div>}</div><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-white">{item.name}</p><p className="mt-0.5 text-[11px] text-[#777]">Cantidad: {item.quantity}</p></div><p className="text-[12px] text-[#b0b0b0]">{formatCurrency(item.price * item.quantity)}</p></div>)}
        </div>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#666]">Seguimiento</p><div className="mt-3 space-y-3">{order.statusHistory.map((entry, index) => <div key={`${entry.status}-${entry.timestamp}-${index}`} className="flex gap-2.5"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${index === order.statusHistory.length - 1 ? 'bg-[#FF7A33]' : 'bg-[#555]'}`} /><div><p className="text-[12px] text-white">{statusLabels[entry.status]?.label ?? entry.status}</p><p className="text-[11px] text-[#666]">{formatDate(entry.timestamp)}</p></div></div>)}</div></div>
      </div>}
    </article>
  );
}

export const MyOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useGetMyOrdersQuery();
  const orders = data?.orders ?? [];

  return (
    <ClientPageShell eyebrow="Mis órdenes" icon={FiShoppingBag}>
      {error ? <ClientState icon={FiRefreshCw} title="No pudimos cargar tus órdenes" description="Revisá tu conexión y volvé a intentarlo." actionLabel="Reintentar" onAction={() => void refetch()} tone="danger" /> : isLoading ? <div className="grid gap-3" aria-busy="true">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-[#292929] bg-[#121212]" />)}</div> : orders.length === 0 ? <ClientState icon={FiPackage} title="Todavía no realizaste compras" description="Explorá la tienda y encontrá productos para cuidar tu estilo." actionLabel="Ir a la tienda" onAction={() => navigate('/tienda')} /> : <div className="grid gap-3">{orders.map((order) => <OrderCard key={order.id} order={order} />)}</div>}
    </ClientPageShell>
  );
};

export default MyOrdersPage;
