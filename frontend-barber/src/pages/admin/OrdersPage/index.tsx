import { useState } from 'react';
import { FiShoppingBag, FiCalendar, FiDollarSign, FiCheckCircle, FiXCircle, FiTruck, FiTrash2 } from 'react-icons/fi';
import { AnimatedContainer, Spinner, Pagination, Select, Button, useToast } from '../../../components/common';
import { useGetAllOrdersQuery, useUpdateOrderStatusMutation, useDeleteOrderMutation } from '../../../services/orderApi';
import type { OrderStatus } from '../../../types/order';
import { formatDate } from '../../../utils/formatDate';

const statusLabels: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pendiente', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  paid: { label: 'Pagado', bg: 'bg-green-500/10', text: 'text-green-400' },
  delivered: { label: 'Entregado', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  cancelled: { label: 'Cancelado', bg: 'bg-red-500/10', text: 'text-red-400' },
  refunded: { label: 'Reembolsado', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  disputed: { label: 'En disputa', bg: 'bg-orange-500/10', text: 'text-orange-400' },
};

export const OrdersPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { showToast } = useToast();

  const { data, isLoading } = useGetAllOrdersQuery({
    status: statusFilter || undefined,
    page,
    limit: 20,
  });
  const [updateStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const [deleteOrder, { isLoading: isDeleting }] = useDeleteOrderMutation();

  const orders = data?.orders ?? [];

  const handleStatus = async (id: string, status: string) => {
    try {
      await updateStatus({ id, status }).unwrap();
      const msgs: Record<string, string> = {
        paid: 'marcada como pagada',
        delivered: 'marcada como entregada',
        cancelled: 'cancelada',
      };
      showToast(`Orden ${msgs[status] || 'actualizada'} con éxito`);
    } catch {
      showToast('Error al actualizar estado', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteOrder(id).unwrap();
      showToast('Orden eliminada con éxito');
      setConfirmDelete(null);
    } catch {
      showToast('Error al eliminar orden', 'error');
    }
  };

  const actions = (order: { id: string; status: OrderStatus }) => {
    const isPending = order.status === 'pending';
    const isPaid = order.status === 'paid';

    return (
      <div className="flex gap-1.5 mt-2 pt-2 border-t border-[#282828]">
        {isPending && (
          <>
            <Button size="sm" variant="outline" className="text-[11px] h-[30px] px-2.5" onClick={() => handleStatus(order.id, 'paid')} loading={isUpdating}>
              <FiDollarSign className="mr-1" size={12} /> Pagar
            </Button>
            <Button size="sm" variant="outline" className="text-[11px] h-[30px] px-2.5" onClick={() => handleStatus(order.id, 'delivered')} loading={isUpdating}>
              <FiTruck className="mr-1" size={12} /> Pagar y entregar
            </Button>
          </>
        )}
        {isPaid && (
          <Button size="sm" variant="outline" className="text-[11px] h-[30px] px-2.5" onClick={() => handleStatus(order.id, 'delivered')} loading={isUpdating}>
            <FiTruck className="mr-1" size={12} /> Entregar
          </Button>
        )}
        {(isPending || isPaid) && (
          <Button size="sm" variant="ghost" className="text-[11px] h-[30px] px-2.5 text-red-400 hover:text-red-300" onClick={() => handleStatus(order.id, 'cancelled')} loading={isUpdating}>
            <FiXCircle className="mr-1" size={12} /> Cancelar
          </Button>
        )}
        <div className="flex-1" />
        {confirmDelete === order.id ? (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="text-[11px] h-[30px] px-2" onClick={() => setConfirmDelete(null)} disabled={isDeleting}>Volver</Button>
            <Button size="sm" variant="danger" className="text-[11px] h-[30px] px-2" onClick={() => handleDelete(order.id)} loading={isDeleting}>Confirmar</Button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(order.id)} className="text-[#8A8A8A] hover:text-red-400 transition-colors p-1" title="Eliminar">
            <FiTrash2 size={14} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FF5C00]/10">
            <FiShoppingBag className="text-[#FF5C00] text-lg" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-white">Órdenes</h1>
            <p className="text-[13px] text-[#8A8A8A]">Historial de compras de productos</p>
          </div>
        </div>
        <div className="w-40">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'pending', label: 'Pendiente' },
              { value: 'paid', label: 'Pagado' },
              { value: 'delivered', label: 'Entregado' },
              { value: 'cancelled', label: 'Cancelado' },
              { value: 'refunded', label: 'Reembolsado' },
              { value: 'disputed', label: 'En disputa' },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : orders.length === 0 ? (
        <AnimatedContainer animation="fadeInUp" className="flex flex-col items-center justify-center py-20 text-[#8A8A8A] rounded-[16px] border border-[#282828] bg-[#121212]">
          <FiShoppingBag className="text-4xl mb-3" />
          <p className="text-[15px]">No hay órdenes registradas</p>
        </AnimatedContainer>
      ) : (
        <AnimatedContainer animation="fadeInUp">
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-[16px] border border-[#282828] bg-[#121212] p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusLabels[order.status]?.bg} ${statusLabels[order.status]?.text}`}>
                        {statusLabels[order.status]?.label ?? order.status}
                      </span>
                      {order.paymentId && (
                        <FiCheckCircle className="text-[#22C55E]" size={12} title="Pagado por MP" />
                      )}
                    </div>
                    <p className="text-[12px] text-[#8A8A8A] flex items-center gap-1 mt-1">
                      <FiCalendar className="text-[#FF5C00]" size={12} />
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <p className="text-[16px] font-bold text-[#FF5C00]">${order.total}</p>
                </div>
                <div className="space-y-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[13px]">
                      <span className="text-white">{item.name} <span className="text-[#555]">x{item.quantity}</span></span>
                      <span className="text-[#8A8A8A]">${item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                {actions(order)}
              </div>
            ))}
          </div>
          {data && data.totalPages > 1 && (
            <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
          )}
        </AnimatedContainer>
      )}
    </div>
  );
};

export default OrdersPage;
