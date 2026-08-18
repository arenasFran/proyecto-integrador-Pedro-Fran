import { useState } from 'react';
import {
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiCreditCard,
  FiDollarSign,
  FiHash,
  FiClock,
  FiMail,
  FiPackage,
  FiShoppingBag,
  FiTrash2,
  FiTruck,
  FiUser,
  FiX,
  FiXCircle,
} from 'react-icons/fi';
import type { Order, OrderItem } from '../../../../types/order';
import { formatCurrency } from '../../../../utils/formatCurrency';
import { formatDateTime } from '../../../../utils/formatDate';
import { Button } from '../../../../components/common';
import { ProductDetailModal } from '../../../../components/admin/ProductDetailModal';
import PaymentTransactionDetail from '../../../../components/payment/PaymentTransactionDetail';
import { useGetPaymentByReferenceQuery } from '../../../../services/paymentApi';
import { getOrderStatusConfig, getPaymentMethodLabel } from './ordersConfig';

const MP_STATUS_LABELS: Record<string, string> = {
  accredited: 'Acreditado',
  pending_contingency: 'Pendiente (contingencia)',
  pending_review_manual: 'En revisión',
  cc_rejected_bad_filled_date: 'Rechazado (fecha inválida)',
  cc_rejected_bad_filled_other: 'Rechazado (dato inválido)',
  cc_rejected_bad_filled_security_code: 'Rechazado (código de seguridad)',
  cc_rejected_blacklist: 'Rechazado (lista negra)',
  cc_rejected_call_for_authorize: 'Rechazado (requiere autorización)',
  cc_rejected_card_disabled: 'Rechazado (tarjeta inactiva)',
  cc_rejected_card_error: 'Rechazado (error de tarjeta)',
  cc_rejected_duplicated_payment: 'Rechazado (pago duplicado)',
  cc_rejected_high_risk: 'Rechazado (alto riesgo)',
  cc_rejected_insufficient_amount: 'Rechazado (fondos insuficientes)',
  cc_rejected_invalid_installments: 'Rechazado (cuotas inválidas)',
  cc_rejected_max_attempts: 'Rechazado (máximo de intentos)',
  cc_rejected_other_reason: 'Rechazado (otro motivo)',
};

interface OrdersOrderDetailPanelProps {
  order: Order | null;
  onClose: () => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
  onStatusChange?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
}

export default function OrdersOrderDetailPanel({
  order,
  onClose,
  isUpdating = false,
  isDeleting = false,
  onStatusChange,
  onDelete,
}: OrdersOrderDetailPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ products: true });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailItem, setDetailItem] = useState<OrderItem | null>(null);

  const { data: paymentData } = useGetPaymentByReferenceQuery(
    { referenceId: order?.id || '', type: 'product_order' },
    { skip: !order?.id },
  );

  if (!order) {
    return (
      <aside className="hidden min-h-[170px] flex-col items-center justify-center rounded-[14px] border border-[#282828] bg-[#101010] px-5 text-center xl:flex">
        <FiShoppingBag className="mb-2 text-[#444]" size={24} aria-hidden="true" />
        <p className="text-[12px] font-medium text-[#8A8A8A]">Selecciona una orden</p>
        <p className="mt-1 max-w-[220px] text-[11px] leading-4 text-[#555]">El detalle operativo aparecerá aquí.</p>
      </aside>
    );
  }

  const status = getOrderStatusConfig(order.status, order.paymentMethod);
  const StatusIcon = status.icon;
  const customerName = order.userName || order.clientName || 'Cliente sin nombre';
  const customerEmail = order.userEmail || order.clientEmail;
  const isPending = order.status === 'pending';
  const isPaid = order.status === 'paid';
  const toggleSection = (section: string) => {
    setExpandedSections((previous) => ({ ...previous, [section]: !previous[section] }));
  };

  return (
    <aside className="fixed inset-0 z-40 bg-black/70 xl:relative xl:inset-auto xl:z-auto xl:bg-transparent">
      <button type="button" className="absolute inset-0 cursor-default xl:hidden" onClick={onClose} aria-label="Cerrar detalle" />
      <section className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col overflow-hidden border-l border-[#282828] bg-[#111111] shadow-2xl xl:relative xl:inset-auto xl:max-w-none xl:rounded-[14px] xl:border">
        <header className="flex items-center justify-between border-b border-[#282828] px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] text-[#6A6A6A]">ORDEN #{order.id.slice(-8).toUpperCase()}</p>
            <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.bg} ${status.text}`}>
              <StatusIcon size={12} />
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[18px] font-bold text-[#FF8A4C]">{formatCurrency(order.total)}</p>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#8A8A8A] transition-colors hover:bg-[#1A1A1A] hover:text-white xl:hidden" aria-label="Cerrar detalle">
              <FiX size={17} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <section className="border-b border-[#282828] pb-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5F5F5F]">Cliente y origen</p>
            <div className="grid gap-1.5 text-[12px]">
              <p className="flex items-center gap-2 text-[#E6E6E6]"><FiUser className="shrink-0 text-[#6A6A6A]" size={13} />{customerName}</p>
              {customerEmail && <p className="flex items-center gap-2 truncate text-[#8A8A8A]"><FiMail className="shrink-0 text-[#6A6A6A]" size={13} />{customerEmail}</p>}
              <p className="flex items-center gap-2 text-[#8A8A8A]"><FiCalendar className="shrink-0 text-[#6A6A6A]" size={13} />{formatDateTime(order.createdAt)}</p>
              <p className="flex items-center gap-2 text-[#8A8A8A]"><FiCreditCard className="shrink-0 text-[#6A6A6A]" size={13} />{getPaymentMethodLabel(order.paymentMethod)}</p>
            </div>
          </section>

          <section className="border-b border-[#282828] py-3">
            <button type="button" onClick={() => toggleSection('products')} aria-expanded={expandedSections.products ?? true} className="flex w-full items-center gap-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8A8A] transition-colors hover:text-white">
              <FiPackage size={13} /> Productos ({order.items.length})
              {expandedSections.products ? <FiChevronUp className="ml-auto" size={14} /> : <FiChevronDown className="ml-auto" size={14} />}
            </button>
            {expandedSections.products && (
              <div className="mt-2 space-y-1.5">
                {order.items.map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="flex items-center gap-2.5 rounded-[9px] px-1 py-1.5 transition-colors hover:bg-white/[0.025]">
                    <button type="button" onClick={() => setDetailItem(item)} className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border border-[#282828] bg-[#1A1A1A] transition-colors hover:border-[#FF5C00]/50" aria-label={`Ver detalle de ${item.name}`}>
                      {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <FiShoppingBag className="text-[#555]" size={15} aria-hidden="true" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] text-[#E6E6E6]">{item.name}</p>
                      <p className="text-[11px] text-[#6A6A6A]">{formatCurrency(item.price)} x {item.quantity}</p>
                    </div>
                    <p className="shrink-0 text-[12px] font-medium text-white">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-[#282828] pt-2 text-[12px]">
                  <span className="text-[#8A8A8A]">Total</span>
                  <span className="font-bold text-white">{formatCurrency(order.total)}</span>
                </div>
              </div>
            )}
          </section>

          {(order.mpPaymentId || order.mpStatusDetail || paymentData?.payment) && (
            <section className="border-b border-[#282828] py-3">
              <button type="button" onClick={() => toggleSection('payment')} aria-expanded={expandedSections.payment ?? false} className="flex w-full items-center gap-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8A8A] transition-colors hover:text-white">
                <FiHash size={13} /> Información del pago
                {expandedSections.payment ? <FiChevronUp className="ml-auto" size={14} /> : <FiChevronDown className="ml-auto" size={14} />}
              </button>
              {expandedSections.payment && (
                <div className="mt-2">
                  {paymentData?.payment ? <PaymentTransactionDetail payment={paymentData.payment} /> : (
                    <div className="space-y-1.5 text-[11px]">
                      {order.mpPaymentId && <p className="flex gap-2"><span className="w-20 shrink-0 text-[#5F5F5F]">ID MP</span><span className="break-all font-mono text-[#8A8A8A]">{order.mpPaymentId}</span></p>}
                      {order.mpStatusDetail && <p className="flex gap-2"><span className="w-20 shrink-0 text-[#5F5F5F]">Estado MP</span><span className="text-[#8A8A8A]">{MP_STATUS_LABELS[order.mpStatusDetail] ?? order.mpStatusDetail.replace(/_/g, ' ')}</span></p>}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {order.statusHistory.length > 0 && (
            <section className="border-b border-[#282828] py-3">
              <button type="button" onClick={() => toggleSection('history')} aria-expanded={expandedSections.history ?? false} className="flex w-full items-center gap-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8A8A] transition-colors hover:text-white">
                <FiClock size={13} /> Historial ({order.statusHistory.length})
                {expandedSections.history ? <FiChevronUp className="ml-auto" size={14} /> : <FiChevronDown className="ml-auto" size={14} />}
              </button>
              {expandedSections.history && (
                <div className="mt-2 space-y-1.5">
                  {[...order.statusHistory].reverse().map((entry, index) => {
                    const entryStatus = getOrderStatusConfig(entry.status);
                    return <div key={`${entry.timestamp}-${index}`} className="flex items-center gap-2 text-[11px]"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${entryStatus.dot}`} /><span className={entryStatus.text}>{entryStatus.label}</span><span className="text-[#5F5F5F]">{formatDateTime(entry.timestamp)}</span><span className="truncate text-[#444]">{entry.actor}</span></div>;
                  })}
                </div>
              )}
            </section>
          )}

          {(isPending || isPaid) && (
            <section className="flex flex-wrap gap-2 pt-3">
              {isPending && <>
                <Button size="sm" onClick={() => onStatusChange?.(order.id, 'paid')} loading={isUpdating}><FiDollarSign size={14} />{order.paymentMethod === 'local' ? 'Cobrar' : 'Confirmar pago'}</Button>
                <Button size="sm" variant="outline" onClick={() => onStatusChange?.(order.id, 'delivered')} loading={isUpdating}><FiTruck size={14} />{order.paymentMethod === 'local' ? 'Cobrar y entregar' : 'Confirmar pago y entregar'}</Button>
              </>}
              {isPaid && <Button size="sm" onClick={() => onStatusChange?.(order.id, 'delivered')} loading={isUpdating}><FiTruck size={14} />Entregar</Button>}
              <Button size="sm" variant="ghost" className="text-red-400" onClick={() => onStatusChange?.(order.id, 'cancelled')} loading={isUpdating}><FiXCircle size={14} />Cancelar</Button>
              {onDelete && isPending && (confirmDelete ? <div className="flex w-full items-center gap-2 border-t border-[#282828] pt-2"><span className="mr-auto text-[11px] text-[#8A8A8A]">¿Eliminar esta orden?</span><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>Volver</Button><Button size="sm" variant="danger" onClick={() => { onDelete(order.id); setConfirmDelete(false); }} loading={isDeleting}>Eliminar</Button></div> : <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto flex h-9 w-9 items-center justify-center rounded-[8px] text-[#6A6A6A] transition-colors hover:bg-red-500/10 hover:text-red-400" aria-label="Eliminar orden"><FiTrash2 size={15} /></button>)}
            </section>
          )}
        </div>
      </section>
      <ProductDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
    </aside>
  );
}
