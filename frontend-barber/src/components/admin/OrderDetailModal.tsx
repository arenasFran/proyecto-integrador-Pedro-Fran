import { useState } from 'react';
import {
  FiUser, FiMail, FiCalendar, FiDollarSign, FiCreditCard, FiHash, FiClock,
  FiCheckCircle, FiXCircle, FiTruck, FiTrash2, FiPackage, FiChevronDown,
  FiChevronUp,   FiAlertCircle, FiShoppingBag,
} from 'react-icons/fi';
import type { Order, OrderStatus, OrderItem } from '../../types/order';
import { formatDateTime } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';
import { Modal, Button } from '../common';
import { ProductDetailModal } from './ProductDetailModal';
import PaymentTransactionDetail from '../payment/PaymentTransactionDetail';
import { useGetPaymentByReferenceQuery } from '../../services/paymentApi';

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendiente', bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: <FiClock size={12} /> },
  paid: { label: 'Pagado', bg: 'bg-green-500/10', text: 'text-green-400', icon: <FiCheckCircle size={12} /> },
  delivered: { label: 'Entregado', bg: 'bg-blue-500/10', text: 'text-blue-400', icon: <FiTruck size={12} /> },
  cancelled: { label: 'Cancelado', bg: 'bg-red-500/10', text: 'text-red-400', icon: <FiXCircle size={12} /> },
  refunded: { label: 'Reembolsado', bg: 'bg-purple-500/10', text: 'text-purple-400', icon: <FiDollarSign size={12} /> },
  disputed: { label: 'En disputa', bg: 'bg-orange-500/10', text: 'text-orange-400', icon: <FiAlertCircle size={12} /> },
  stock_issue: { label: 'Problema de stock', bg: 'bg-red-500/10', text: 'text-red-400', icon: <FiAlertCircle size={12} /> },
};

const MP_STATUS_LABELS: Record<string, string> = {
  accredited: 'Acreditado',
  pending_contingency: 'Pendiente (contingencia)',
  pending_review_manual: 'En revision',
  cc_rejected_bad_filled_date: 'Rechazado (fecha invalida)',
  cc_rejected_bad_filled_other: 'Rechazado (dato invalido)',
  cc_rejected_bad_filled_security_code: 'Rechazado (codigo seguridad)',
  cc_rejected_blacklist: 'Rechazado (lista negra)',
  cc_rejected_call_for_authorize: 'Rechazado (requiere autorizacion)',
  cc_rejected_card_disabled: 'Rechazado (tarjeta inactiva)',
  cc_rejected_card_error: 'Rechazado (error tarjeta)',
  cc_rejected_duplicated_payment: 'Rechazado (pago duplicado)',
  cc_rejected_high_risk: 'Rechazado (alto riesgo)',
  cc_rejected_insufficient_amount: 'Rechazado (fondos insuficientes)',
  cc_rejected_invalid_installments: 'Rechazado (cuotas invalidas)',
  cc_rejected_max_attempts: 'Rechazado (max. intentos)',
  cc_rejected_other_reason: 'Rechazado (otro motivo)',
};

function getMpStatusLabel(detail?: string): string | null {
  if (!detail) return null;
  return MP_STATUS_LABELS[detail] ?? detail;
}

function getPaymentMethodLabel(method?: string): string {
  if (!method) return 'No especificado';
  const labels: Record<string, string> = {
    account_money: 'Mercado Pago', visa: 'Visa', master: 'Mastercard',
    amex: 'American Express', debvisa: 'Visa Debito', debmaster: 'Mastercard Debito',
    naranja: 'Naranja', nativa: 'Nativa', cabal: 'Cabal', maestro: 'Maestro', oca: 'OCA',
  };
  return labels[method] ?? (method === 'local' ? 'Pago al levantar' : method === 'online' ? 'Pago online' : method);
}

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
  onStatusChange?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  onClose,
  isUpdating = false,
  isDeleting = false,
  onStatusChange,
  onDelete,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ products: true });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailItem, setDetailItem] = useState<OrderItem | null>(null);

  const { data: paymentData } = useGetPaymentByReferenceQuery(
    { referenceId: order?.id || '', type: 'product_order' },
    { skip: !order?.id }
  );

  if (!order) return null;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const statusCfg = order.status === 'pending' && order.paymentMethod === 'local'
    ? { ...STATUS_CONFIG.pending, label: 'Pago al levantar' }
    : STATUS_CONFIG[order.status];
  const isPending = order.status === 'pending';
  const isPaid = order.status === 'paid';
  const manualPaymentLabel = order.paymentMethod === 'local' ? 'Cobrar' : 'Confirmar pago';
  const manualDeliveryLabel = order.paymentMethod === 'local' ? 'Cobrar y entregar' : 'Confirmar pago y entregar';

  return (
    <>
      <Modal isOpen={!!order} onClose={onClose} title="Detalle de orden" size="lg">
        <div className="space-y-5">
          {/* Status + Total */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
              {statusCfg.icon}
              {statusCfg.label}
            </span>
            <p className="text-[22px] font-bold text-[#FF5C00]">{formatCurrency(order.total)}</p>
          </div>

          {/* Customer & Fecha */}
          <div className="space-y-2">
            {order.userName && (
              <div className="flex items-center gap-2 text-[14px]">
                <FiUser size={14} className="text-[#6A6A6A] shrink-0" />
                <span className="text-white">{order.userName}</span>
              </div>
            )}
            {order.userEmail && (
              <div className="flex items-center gap-2 text-[14px]">
                <FiMail size={14} className="text-[#6A6A6A] shrink-0" />
                <span className="text-[#8A8A8A]">{order.userEmail}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[14px]">
              <FiCalendar size={14} className="text-[#6A6A6A] shrink-0" />
              <span className="text-[#8A8A8A]">{formatDateTime(order.createdAt)}</span>
            </div>
            {order.paymentMethod && (
              <div className="flex items-center gap-2 text-[14px]">
                <FiCreditCard size={14} className="text-[#6A6A6A] shrink-0" />
                <span className="text-[#8A8A8A]">{getPaymentMethodLabel(order.paymentMethod)}</span>
              </div>
            )}
          </div>

          {/* Products */}
          <div className="border-t border-[#282828] pt-4">
            <button
              onClick={() => toggleSection('products')}
              className="flex items-center gap-2 text-[13px] text-[#8A8A8A] font-medium hover:text-white transition-colors w-full text-left"
              aria-expanded={expandedSections['products'] ?? true}
            >
              <FiPackage size={14} />
              Productos ({order.items.length})
              {expandedSections['products'] ?? true ? <FiChevronUp size={14} className="ml-auto" /> : <FiChevronDown size={14} className="ml-auto" />}
            </button>
            {(expandedSections['products'] ?? true) && (
              <div className="mt-3 space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <button
                      onClick={() => setDetailItem(item)}
                      className="w-12 h-12 shrink-0 rounded-[8px] bg-[#1A1A1A] border border-[#282828] overflow-hidden hover:border-[#FF5C00]/40 transition-colors cursor-pointer flex items-center justify-center"
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#242424]">
                          <FiShoppingBag size={18} className="text-[#555]" />
                        </div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-white truncate">{item.name}</p>
                      <p className="text-[12px] text-[#6A6A6A]">{formatCurrency(item.price)} x {item.quantity}</p>
                    </div>
                    <p className="text-[14px] text-white font-medium shrink-0">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between text-[14px] pt-2 border-t border-[#282828]">
                  <span className="text-[#8A8A8A] font-medium">Total</span>
                  <span className="text-white font-bold">{formatCurrency(order.total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Mercado Pago */}
          {(order.mpPaymentId || order.mpStatusDetail || paymentData?.payment) && (
            <div className="border-t border-[#282828] pt-4">
              <button
                onClick={() => toggleSection('payment')}
                className="flex items-center gap-2 text-[13px] text-[#8A8A8A] font-medium hover:text-white transition-colors w-full text-left"
                aria-expanded={expandedSections['payment'] ?? false}
              >
                <FiHash size={14} />
                Información del pago
                {expandedSections['payment'] ? <FiChevronUp size={14} className="ml-auto" /> : <FiChevronDown size={14} className="ml-auto" />}
              </button>
              {expandedSections['payment'] && (
                <div className="mt-3">
                  {paymentData?.payment ? (
                    <PaymentTransactionDetail payment={paymentData.payment} />
                  ) : (
                    <div className="space-y-2 text-[13px]">
                      {order.mpPaymentId && (
                        <div className="flex gap-2">
                          <span className="text-[#6A6A6A] w-28 shrink-0">ID Pago MP:</span>
                          <span className="text-[#8A8A8A] font-mono break-all">{order.mpPaymentId}</span>
                        </div>
                      )}
                      {order.mpStatusDetail && (
                        <div className="flex gap-2">
                          <span className="text-[#6A6A6A] w-28 shrink-0">Estado MP:</span>
                          <span className="text-[#8A8A8A]">{getMpStatusLabel(order.mpStatusDetail)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status History */}
          {order.statusHistory.length > 0 && (
            <div className="border-t border-[#282828] pt-4">
              <button
                onClick={() => toggleSection('history')}
                className="flex items-center gap-2 text-[13px] text-[#8A8A8A] font-medium hover:text-white transition-colors w-full text-left"
                aria-expanded={expandedSections['history'] ?? false}
              >
                <FiClock size={14} />
                Historial ({order.statusHistory.length})
                {expandedSections['history'] ? <FiChevronUp size={14} className="ml-auto" /> : <FiChevronDown size={14} className="ml-auto" />}
              </button>
              {expandedSections['history'] && (
                <div className="mt-3 space-y-2">
                  {[...order.statusHistory].reverse().map((entry, idx) => {
                    const cfg = STATUS_CONFIG[entry.status];
                    return (
                      <div key={idx} className="flex items-center gap-2 text-[13px]">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.bg} ${cfg.text}`}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                        <span className="text-[#6A6A6A] text-[12px]">{formatDateTime(entry.timestamp)}</span>
                        <span className="text-[#555] text-[12px]">- {entry.actor}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {(isPending || isPaid) && (
            <div className="border-t border-[#282828] pt-4 flex flex-wrap gap-2">
              {isPending && (
                <>
                  <Button size="sm" onClick={() => onStatusChange?.(order.id, 'paid')} loading={isUpdating}>
                    <FiDollarSign className="mr-1" size={14} /> {manualPaymentLabel}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onStatusChange?.(order.id, 'delivered')} loading={isUpdating}>
                    <FiTruck className="mr-1" size={14} /> {manualDeliveryLabel}
                  </Button>
                </>
              )}
              {isPaid && (
                <Button size="sm" onClick={() => onStatusChange?.(order.id, 'delivered')} loading={isUpdating}>
                  <FiTruck className="mr-1" size={14} /> Entregar
                </Button>
              )}
              {(isPending || isPaid) && (
                <Button size="sm" variant="ghost" className="text-red-400" onClick={() => onStatusChange?.(order.id, 'cancelled')} loading={isUpdating}>
                  <FiXCircle className="mr-1" size={14} /> Cancelar
                </Button>
              )}
              <div className="flex-1" />
               {onDelete && isPending && confirmDelete ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>Volver</Button>
                  <Button size="sm" variant="danger" onClick={() => { onDelete?.(order.id); setConfirmDelete(false); }} loading={isDeleting}>Eliminar</Button>
                </>
               ) : onDelete && isPending ? (
                <button onClick={() => setConfirmDelete(true)} className="text-[#8A8A8A] hover:text-red-400 transition-colors p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-red-500/10" aria-label="Eliminar orden">
                  <FiTrash2 size={16} />
                </button>
              ) : null}
            </div>
          )}
        </div>
      </Modal>

      <ProductDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
    </>
  );
};

export default OrderDetailModal;
