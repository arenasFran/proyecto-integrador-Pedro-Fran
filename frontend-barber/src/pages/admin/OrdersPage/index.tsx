import { useState } from 'react';
import {
  FiShoppingBag, FiPackage, FiClock, FiCheckCircle, FiXCircle, FiTruck,
  FiDollarSign, FiAlertCircle,
} from 'react-icons/fi';
import type { OrderStatus } from '../../../types/order';
import { AnimatedContainer, Spinner, Pagination, Select, useToast } from '../../../components/common';
import type { SelectOption } from '../../../components/common/Select';
import { OrderCard } from '../../../components/admin/OrderCard';
import { OrderDetailModal } from '../../../components/admin/OrderDetailModal';
import { QuickActionsPanel } from '../../../components/admin/QuickActionsPanel';
import { CreateOrderModal } from '../../../components/admin/CreateOrderModal';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import { useGetAllOrdersQuery, useUpdateOrderStatusMutation, useDeleteOrderMutation } from '../../../services/orderApi';
import { useGetEcommerceOverviewQuery } from '../../../services/analyticsApi';

const STATUS_CONFIG: Record<OrderStatus | '', { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  '': { label: 'Todos los estados', bg: 'bg-gray-500/10', text: 'text-gray-400', icon: <FiPackage size={14} /> },
  pending: { label: 'Pendiente', bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: <FiClock size={14} /> },
  paid: { label: 'Pagado', bg: 'bg-green-500/10', text: 'text-green-400', icon: <FiCheckCircle size={14} /> },
  delivered: { label: 'Entregado', bg: 'bg-blue-500/10', text: 'text-blue-400', icon: <FiTruck size={14} /> },
  cancelled: { label: 'Cancelado', bg: 'bg-red-500/10', text: 'text-red-400', icon: <FiXCircle size={14} /> },
  refunded: { label: 'Reembolsado', bg: 'bg-purple-500/10', text: 'text-purple-400', icon: <FiDollarSign size={14} /> },
  disputed: { label: 'En disputa', bg: 'bg-orange-500/10', text: 'text-orange-400', icon: <FiAlertCircle size={14} /> },
};

const STATUS_OPTIONS: SelectOption[] = (Object.keys(STATUS_CONFIG) as (OrderStatus | '')[]).map((key) => ({
  value: key,
  label: STATUS_CONFIG[key].label,
}));

const renderStatusOption = (option: SelectOption) => {
  const cfg = STATUS_CONFIG[option.value as OrderStatus | ''] ?? STATUS_CONFIG[''];
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cfg.text}>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  );
};

const STATS_CONFIG: { key: string; label: string; icon: React.ReactNode; color: string; filter: string }[] = [
  { key: 'totalOrders', label: 'Total', icon: <FiPackage size={16} />, color: 'text-white', filter: '' },
  { key: 'pending', label: 'Pendientes', icon: <FiClock size={16} />, color: 'text-yellow-400', filter: 'pending' },
  { key: 'paid', label: 'Pagados', icon: <FiCheckCircle size={16} />, color: 'text-green-400', filter: 'paid' },
  { key: 'delivered', label: 'Entregados', icon: <FiTruck size={16} />, color: 'text-blue-400', filter: 'delivered' },
  { key: 'cancelled', label: 'Cancelados', icon: <FiXCircle size={16} />, color: 'text-red-400', filter: 'cancelled' },
];

export const OrdersPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { showToast } = useToast();

  const { data, isLoading, isFetching } = useGetAllOrdersQuery({
    status: statusFilter || undefined,
    page,
    limit: 20,
    desde: desde || undefined,
    hasta: hasta || undefined,
  });
  const { data: overview } = useGetEcommerceOverviewQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );
  const [updateStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const [deleteOrder, { isLoading: isDeleting }] = useDeleteOrderMutation();

  const orders = data?.orders ?? [];
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;

  const getStatValue = (key: string): number | null => {
    if (!overview) return null;
    if (key === 'totalOrders') return overview.totalOrders;
    return overview.ordersByStatus?.[key] ?? null;
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      await updateStatus({ id, status }).unwrap();
      const msgs: Record<string, string> = {
        paid: 'marcada como pagada',
        delivered: 'marcada como entregada',
        cancelled: 'cancelada',
      };
      showToast(`Orden ${msgs[status] || 'actualizada'} con exito`);
    } catch {
      showToast('Error al actualizar estado', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteOrder(id).unwrap();
      showToast('Orden eliminada con exito');
      setSelectedOrderId(null);
    } catch {
      showToast('Error al eliminar orden', 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FF5C00]/10">
            <FiShoppingBag className="text-[#FF5C00] text-lg" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-white">Ordenes</h1>
            <p className="text-[13px] text-[#8A8A8A]">Historial de compras de productos</p>
          </div>
        </div>
      </div>

      {/* Filters: Date + Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <DateRangeFilter
          onChange={(d, h) => { setDesde(d); setHasta(h); setPage(1); }}
          defaultPreset="mes"
        />
        <div className="flex items-center gap-2">
          <div className="w-44">
            <Select
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setPage(1); }}
              options={STATUS_OPTIONS}
              placeholder="Todos los estados"
              renderOption={renderStatusOption}
            />
          </div>
          <p className="text-[12px] text-[#6A6A6A] shrink-0">{data ? `${data.total} resultados` : ''}</p>
        </div>
      </div>

      {/* Stats KPI cards (reflect date filter) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {STATS_CONFIG.map((stat) => (
          <button
            key={stat.key}
            onClick={() => { setStatusFilter(stat.filter); setPage(1); }}
            className={`rounded-[14px] border p-3 text-left transition-all cursor-pointer hover:border-[#FF5C00]/30 ${
              statusFilter === stat.filter ? 'border-[#FF5C00]/50 bg-[#FF5C00]/5' : 'border-[#282828] bg-[#1A1A1A]'
            }`}
          >
            <span className={stat.color}>{stat.icon}</span>
            <p className="text-[18px] font-bold text-white mt-1">{getStatValue(stat.key) ?? '-'}</p>
            <p className="text-[11px] text-[#8A8A8A] truncate">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Main Layout: Cards + Quick Panel */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : orders.length === 0 ? (
        <AnimatedContainer animation="fadeInUp" className="flex flex-col items-center justify-center py-20 text-[#8A8A8A] rounded-[16px] border border-[#282828] bg-[#121212]">
          <FiShoppingBag className="text-4xl mb-3" />
          <p className="text-[15px]">No hay ordenes registradas</p>
          <p className="text-[13px] mt-1">Las compras de productos apareceran aqui</p>
        </AnimatedContainer>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Left: Order Cards */}
          <div className="lg:w-1/2">
            <AnimatedContainer animation="fadeInUp">
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${isFetching ? 'opacity-60 transition-opacity' : ''}`}>
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    selected={order.id === selectedOrderId}
                    onSelect={setSelectedOrderId}
                  />
                ))}
              </div>
              {data && data.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
                </div>
              )}
            </AnimatedContainer>
          </div>

          {/* Right: Quick Actions Panel */}
          <div className="lg:w-1/2">
            <QuickActionsPanel onFilterPending={() => { setStatusFilter('pending'); setPage(1); }} onCreateOrder={() => setCreateModalOpen(true)} />
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrderId(null)}
        isUpdating={isUpdating}
        isDeleting={isDeleting}
        onStatusChange={handleStatus}
        onDelete={handleDelete}
      />

      <CreateOrderModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </div>
  );
};

export default OrdersPage;
