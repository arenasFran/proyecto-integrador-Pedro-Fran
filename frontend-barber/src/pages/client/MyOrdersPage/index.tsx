import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiChevronRight, FiPackage, FiRefreshCw, FiShoppingBag } from 'react-icons/fi';
import { ClientPageShell, ClientState, Modal, StatusBadge } from '../../../components/common';
import { useGetMyOrdersQuery } from '../../../services/orderApi';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import type { Order, OrderStatus } from '../../../types/order';

const statusLabels: Partial<Record<OrderStatus, { label: string; tone: 'warning' | 'success' | 'info' | 'danger' | 'purple' | 'accent' }>> = {
  pending: { label: 'Pendiente', tone: 'warning' },
  paid: { label: 'Pagado', tone: 'success' },
  delivered: { label: 'Entregado', tone: 'info' },
  cancelled: { label: 'Cancelado', tone: 'danger' },
};

function getStatusLabel(order: Order) {
  if (order.status === 'pending' && order.paymentMethod === 'local') return { label: 'Pago al levantar', tone: 'warning' as const };
  if (order.status === 'pending' && order.paymentMethod && order.paymentMethod !== 'local') return { label: 'Pago online pendiente', tone: 'warning' as const };
  return statusLabels[order.status] ?? { label: 'Estado no disponible', tone: 'info' as const };
}

function ProductImage({ item, size = 'h-10 w-10' }: { item?: Order['items'][number]; size?: string }) {
  return (
    <div className={`${size} shrink-0 overflow-hidden rounded-xl bg-[#1d1d1d] text-[#FF7A33]`}>
      {item?.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center"><FiPackage aria-hidden="true" /></div>
      )}
    </div>
  );
}

function OrderDetailsModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  if (!order) return null;

  const status = getStatusLabel(order);
  return (
    <Modal isOpen onClose={onClose} title="Detalle de orden" size="xl">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-[#292929] bg-[#171717] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <ProductImage item={order.items[0]} />
            <div className="min-w-0">
              <StatusBadge label={status.label} tone={status.tone} />
              <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#777]"><FiCalendar aria-hidden="true" />{formatDate(order.createdAt)} · {order.items.length} producto{order.items.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <p className="text-[19px] font-semibold text-[#FF8A4C]">{formatCurrency(order.total)}</p>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-[#777]">
          {order.paymentMethod && <span>Pago: <strong className="font-medium text-[#b0b0b0]">{order.paymentMethod === 'local' ? 'En local' : 'Online'}</strong></span>}
          {order.updatedAt && <span>Actualizada: <strong className="font-medium text-[#b0b0b0]">{formatDate(order.updatedAt)}</strong></span>}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
          <div className="grid gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#666]">Productos</p>
            {order.items.map((item) => (
              <div key={`${order.id}-${item.productId}`} className="flex items-center gap-3 rounded-xl border border-[#292929] bg-[#171717] p-2.5">
                <ProductImage item={item} size="h-12 w-12 rounded-lg" />
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-white">{item.name}</p><p className="mt-0.5 text-[11px] text-[#777]">Cantidad: {item.quantity}</p></div>
                <p className="text-[12px] text-[#b0b0b0]">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#666]">Seguimiento</p>
            <div className="mt-3 space-y-3">
              {order.statusHistory.map((entry, index) => (
                <div key={`${entry.status}-${entry.timestamp}-${index}`} className="flex gap-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${index === order.statusHistory.length - 1 ? 'bg-[#FF7A33]' : 'bg-[#555]'}`} />
                  <div><p className="text-[12px] text-white">{statusLabels[entry.status]?.label ?? 'Estado no disponible'}</p><p className="text-[11px] text-[#666]">{formatDate(entry.timestamp)}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function OrdersTable({ orders, onSelect }: { orders: Order[]; onSelect: (order: Order) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#292929] bg-[#121212]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-left">
          <thead className="border-b border-[#292929] bg-[#171717]">
            <tr className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#666]">
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Cantidad</th>
              <th className="px-4 py-3 font-medium">Pago</th>
              <th className="px-4 py-3 font-medium">Actualizada</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="w-10 px-3 py-3" aria-label="Ver detalle" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#292929]">
            {orders.map((order) => {
              const status = getStatusLabel(order);
              const firstItem = order.items[0];
              return (
                <tr
                  key={order.id}
                  tabIndex={0}
                  role="button"
                  onClick={() => onSelect(order)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(order); } }}
                  className="cursor-pointer text-[12px] transition-colors hover:bg-[#1a1a1a] focus:bg-[#1a1a1a] focus:outline-none"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex min-w-[180px] items-center gap-3">
                      <ProductImage item={firstItem} />
                      <div className="min-w-0"><p className="truncate font-medium text-white">{firstItem?.name ?? 'Sin productos'}</p><p className="mt-0.5 text-[11px] text-[#777]">{order.items.length} producto{order.items.length === 1 ? '' : 's'}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><StatusBadge label={status.label} tone={status.tone} /></td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-[#b0b0b0]">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3.5 text-[#b0b0b0]">{order.items.reduce((total, item) => total + item.quantity, 0)}</td>
                  <td className="px-4 py-3.5 text-[#b0b0b0]">{order.paymentMethod ? (order.paymentMethod === 'local' ? 'En local' : 'Online') : '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-[#777]">{order.updatedAt ? formatDate(order.updatedAt) : '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right text-[14px] font-semibold text-[#FF8A4C]">{formatCurrency(order.total)}</td>
                  <td className="px-3 py-3.5 text-[#777]"><FiChevronRight aria-hidden="true" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[#292929] px-4 py-3 text-[11px] text-[#666]">Seleccioná una orden para ver sus productos y el seguimiento completo.</p>
    </div>
  );
}

export const MyOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useGetMyOrdersQuery();
  const orders = data?.orders ?? [];
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  return (
    <ClientPageShell eyebrow="Mis órdenes" icon={FiShoppingBag}>
      {error ? <ClientState icon={FiRefreshCw} title="No pudimos cargar tus órdenes" description="Revisá tu conexión y volvé a intentarlo." actionLabel="Reintentar" onAction={() => void refetch()} tone="danger" /> : isLoading ? <div className="grid gap-3" aria-busy="true">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-[#292929] bg-[#121212]" />)}</div> : orders.length === 0 ? <ClientState icon={FiPackage} title="Todavía no realizaste compras" description="Explorá la tienda y encontrá productos para cuidar tu estilo." actionLabel="Ir a la tienda" onAction={() => navigate('/tienda')} /> : <OrdersTable orders={orders} onSelect={setSelectedOrder} />}
      <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </ClientPageShell>
  );
};

export default MyOrdersPage;
