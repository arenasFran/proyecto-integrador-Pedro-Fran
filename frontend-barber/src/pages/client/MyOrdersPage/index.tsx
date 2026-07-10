import React from 'react';
import { FiCalendar, FiShoppingBag, FiRefreshCw, FiPackage } from 'react-icons/fi';
import { AnimatedContainer, Spinner } from '../../../components/common';
import { useGetMyOrdersQuery } from '../../../services/orderApi';
import { formatDate } from '../../../utils/formatDate';
import type { OrderStatus } from '../../../types/order';

const statusLabels: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pendiente', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  paid: { label: 'Pagado', bg: 'bg-green-500/10', text: 'text-green-400' },
  delivered: { label: 'Entregado', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  cancelled: { label: 'Cancelado', bg: 'bg-red-500/10', text: 'text-red-400' },
  refunded: { label: 'Reembolsado', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  disputed: { label: 'En disputa', bg: 'bg-orange-500/10', text: 'text-orange-400' },
};

export const MyOrdersPage: React.FC = () => {
  const { data, isLoading, error } = useGetMyOrdersQuery();

  const orders = data?.orders ?? [];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <AnimatedContainer animation="fadeInDown" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#282828] bg-[#1A1A1A] px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-[12px] text-[#8A8A8A]">
                <FiShoppingBag className="text-[#FF5C00]" />
                Mis órdenes
              </div>
              <h1 className="mt-3 sm:mt-4 text-[22px] sm:text-[38px] font-extrabold tracking-[-0.02em] text-white">
                Tus compras
              </h1>
              <p className="mt-2 text-[14px] text-[#8A8A8A]">
                Historial de órdenes de productos.
              </p>
            </div>
          </div>
        </AnimatedContainer>

        {error ? (
          <AnimatedContainer animation="fadeIn" className="rounded-[16px] border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-[13px] text-red-400">Error al cargar órdenes. Verificá la conexión.</p>
          </AnimatedContainer>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <FiRefreshCw className="animate-spin text-[#FF5C00] text-2xl" />
          </div>
        ) : orders.length === 0 ? (
          <AnimatedContainer animation="fadeInUp" className="flex flex-col items-center justify-center py-20 text-[#8A8A8A] rounded-[24px] border border-[#282828] bg-[#121212]">
            <FiPackage className="text-4xl mb-3" />
            <p className="text-[15px]">No realizaste compras todavía</p>
            <p className="text-[12px] mt-1">Explorá la tienda y llevate los mejores productos.</p>
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
                </div>
              ))}
            </div>
          </AnimatedContainer>
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
