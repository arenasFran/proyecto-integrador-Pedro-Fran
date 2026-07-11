import { useState } from 'react';
import {
  FiUser, FiMail, FiCalendar, FiDollarSign, FiCreditCard, FiHash, FiClock,
  FiCheckCircle, FiXCircle, FiTruck, FiTrash2, FiPackage, FiChevronDown,
  FiChevronUp,   FiAlertCircle, FiGrid, FiX, FiShoppingBag,
} from 'react-icons/fi';
import type { Order, OrderStatus } from '../../types/order';
import { formatDateTime } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';
import { Button } from '../common';
import { ProductDetailModal } from './ProductDetailModal';

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendiente', bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: <FiClock size={12} /> },
  paid: { label: 'Pagado', bg: 'bg-green-500/10', text: 'text-green-400', icon: <FiCheckCircle size={12} /> },
  delivered: { label: 'Entregado', bg: 'bg-blue-500/10', text: 'text-blue-400', icon: <FiTruck size={12} /> },
  cancelled: { label: 'Cancelado', bg: 'bg-red-500/10', text: 'text-red-400', icon: <FiXCircle size={12} /> },
  refunded: { label: 'Reembolsado', bg: 'bg-purple-500/10', text: 'text-purple-400', icon: <FiDollarSign size={12} /> },
  disputed: { label: 'En disputa', bg: 'bg-orange-500/10', text: 'text-orange-400', icon: <FiAlertCircle size={12} /> },
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
  return labels[method] ?? method;
}

interface OrderDetailPanelProps {
  order: Order | null;
  onClose: () => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
  onStatusChange?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
}

export const OrderDetailPanel: React.FC<OrderDetailPanelProps> = ({
  order,
  onClose,
  isUpdating = false,
  isDeleting = false,
  onStatusChange,
  onDelete,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ products: true });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);

  if (!order) {
    return (
      <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-6 lg:sticky lg:top-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FiShoppingBag size={40} className="text-[#555] mb-3" />
          <p className="text-[15px] text-[#8A8A8A]">Selecciona una orden</p>
          <p className="text-[12px] text-[#6A6A6A] mt-1">Haz clic en una orden de la lista para ver su detalle completo</p>
        </div>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const statusCfg = STATUS_CONFIG[order.status];
  const isPending = order.status === 'pending';
  const isPaid = order.status === 'paid';

  return (
    <>
      <div className="rounded-[16px] border border-[#282828] bg-[#121212] overflow-hidden lg:sticky lg:top-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#282828]">
          <div>
            <p className="text-[11px] text-[#6A6A6A] font-mono">ID: {order.id.slice(-8).toUpperCase()}</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCfg.bg} ${statusCfg.text} mt-0.5`}>
              {statusCfg.icon}
              {statusCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-[20px] font-bold text-[#FF5C00]">{formatCurrency(order.total)}</p>
            <button onClick={onClose} className="lg:hidden h-8 w-8 flex items-center justify-center rounded-[8px] text-[#8A8A8A] hover:text-white hover:bg-[#1A1A1A] transition-colors" aria-label="Cerrar">
              <FiX size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Customer Info */}
          <div className="mb-4">
            <p className="text-[11px] text-[#6A6A6A] font-medium mb-2 uppercase tracking-wider">Cliente</p>
            <div className="space-y-1.5">
              {order.userName && (
                <div className="flex items-center gap-2 text-[13px]">
                  <FiUser size={13} className="text-[#6A6A6A] shrink-0" />
                  <span className="text-white">{order.userName}</span>
                </div>
              )}
              {order.userEmail && (
                <div className="flex items-center gap-2 text-[13px]">
                  <FiMail size={13} className="text-[#6A6A6A] shrink-0" />
                  <span className="text-[#8A8A8A]">{order.userEmail}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[13px]">
                <FiCalendar size={13} className="text-[#6A6A6A] shrink-0" />
                <span className="text-[#8A8A8A]">{formatDateTime(order.createdAt)}</span>
              </div>
              {order.paymentMethod && (
                <div className="flex items-center gap-2 text-[13px]">
                  <FiCreditCard size={13} className="text-[#6A6A6A] shrink-0" />
                  <span className="text-[#8A8A8A]">{getPaymentMethodLabel(order.paymentMethod)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="mb-4">
            <button
              onClick={() => toggleSection('products')}
              className="flex items-center gap-1.5 text-[11px] text-[#6A6A6A] font-medium uppercase tracking-wider w-full text-left py-1 hover:text-white transition-colors"
              aria-expanded={expandedSections['products'] ?? true}
            >
              <FiPackage size={12} />
              Productos ({order.items.length})
              {expandedSections['products'] ?? true ? <FiChevronUp size={12} className="ml-auto" /> : <FiChevronDown size={12} className="ml-auto" />}
            </button>
            {(expandedSections['products'] ?? true) && (
              <div className="mt-2 space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-[8px] bg-[#1A1A1A]">
                    <button
                      onClick={() => setDetailProductId(item.productId)}
                      className="w-12 h-12 shrink-0 rounded-[8px] bg-[#242424] border border-[#282828] overflow-hidden hover:border-[#FF5C00]/40 transition-colors cursor-pointer flex items-center justify-center"
                      title="Ver detalle del producto"
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <FiGrid size={16} className="text-[#555]" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white truncate">{item.name}</p>
                      <p className="text-[12px] text-[#6A6A6A]">{formatCurrency(item.price)} x {item.quantity}</p>
                    </div>
                    <p className="text-[13px] text-white font-medium shrink-0">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between text-[13px] pt-2 border-t border-[#282828]">
                  <span className="text-[#8A8A8A] font-medium">Total</span>
                  <span className="text-white font-bold">{formatCurrency(order.total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Mercado Pago Details */}
          {(order.mpPaymentId || order.mpStatusDetail) && (
            <div className="mb-4">
              <button
                onClick={() => toggleSection('payment')}
                className="flex items-center gap-1.5 text-[11px] text-[#6A6A6A] font-medium uppercase tracking-wider w-full text-left py-1 hover:text-white transition-colors"
                aria-expanded={expandedSections['payment'] ?? false}
              >
                <FiHash size={12} />
                Mercado Pago
                {expandedSections['payment'] ? <FiChevronUp size={12} className="ml-auto" /> : <FiChevronDown size={12} className="ml-auto" />}
              </button>
              {expandedSections['payment'] && (
                <div className="mt-2 space-y-1.5 text-[13px]">
                  {order.mpPaymentId && (
                    <div className="flex items-center gap-2">
                      <span className="text-[#6A6A6A] w-24 shrink-0">ID Pago MP:</span>
                      <span className="text-[#8A8A8A] font-mono break-all">{order.mpPaymentId}</span>
                    </div>
                  )}
                  {order.mpStatusDetail && (
                    <div className="flex items-center gap-2">
                      <span className="text-[#6A6A6A] w-24 shrink-0">Estado MP:</span>
                      <span className="text-[#8A8A8A]">{getMpStatusLabel(order.mpStatusDetail)}</span>
                    </div>
                  )}
                  {order.paymentId && (
                    <div className="flex items-center gap-2">
                      <span className="text-[#6A6A6A] w-24 shrink-0">ID Local:</span>
                      <span className="text-[#8A8A8A] font-mono break-all">{order.paymentId}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status History */}
          {order.statusHistory.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => toggleSection('history')}
                className="flex items-center gap-1.5 text-[11px] text-[#6A6A6A] font-medium uppercase tracking-wider w-full text-left py-1 hover:text-white transition-colors"
                aria-expanded={expandedSections['history'] ?? false}
              >
                <FiClock size={12} />
                Historial de estados ({order.statusHistory.length})
                {expandedSections['history'] ? <FiChevronUp size={12} className="ml-auto" /> : <FiChevronDown size={12} className="ml-auto" />}
              </button>
              {expandedSections['history'] && (
                <div className="mt-2 space-y-1.5">
                  {[...order.statusHistory].reverse().map((entry, idx) => {
                    const cfg = STATUS_CONFIG[entry.status];
                    return (
                      <div key={idx} className="flex items-center gap-2 text-[12px]">
                        <div className={`w-2 h-2 rounded-full ${cfg.bg}`} />
                        <span className={`text-[11px] font-medium ${cfg.text}`}>{cfg.label}</span>
                        <span className="text-[#6A6A6A]">{formatDateTime(entry.timestamp)}</span>
                        <span className="text-[#555]">- {entry.actor}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {(isPending || isPaid) && (
            <div className="border-t border-[#282828] pt-4">
              <p className="text-[11px] text-[#6A6A6A] font-medium mb-3 uppercase tracking-wider">Acciones</p>
              <div className="flex flex-wrap gap-2">
                {isPending && (
                  <>
                    <Button size="sm" variant="outline" className="text-[12px]" onClick={() => onStatusChange?.(order.id, 'paid')} loading={isUpdating}>
                      <FiDollarSign className="mr-1" size={14} /> Pagar
                    </Button>
                    <Button size="sm" variant="outline" className="text-[12px]" onClick={() => onStatusChange?.(order.id, 'delivered')} loading={isUpdating}>
                      <FiTruck className="mr-1" size={14} /> Pagar y entregar
                    </Button>
                  </>
                )}
                {isPaid && (
                  <Button size="sm" variant="outline" className="text-[12px]" onClick={() => onStatusChange?.(order.id, 'delivered')} loading={isUpdating}>
                    <FiTruck className="mr-1" size={14} /> Entregar
                  </Button>
                )}
                {(isPending || isPaid) && (
                  <Button size="sm" variant="ghost" className="text-[12px] text-red-400" onClick={() => onStatusChange?.(order.id, 'cancelled')} loading={isUpdating}>
                    <FiXCircle className="mr-1" size={14} /> Cancelar
                  </Button>
                )}
                {confirmDelete ? (
                  <div className="flex gap-1 w-full mt-2">
                    <Button size="sm" variant="ghost" className="text-[12px]" onClick={() => setConfirmDelete(false)} disabled={isDeleting}>Volver</Button>
                    <Button size="sm" variant="danger" className="text-[12px]" onClick={() => { onDelete?.(order.id); setConfirmDelete(false); }} loading={isDeleting}>Eliminar</Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="text-[#8A8A8A] hover:text-red-400 transition-colors p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-red-500/10"
                    aria-label="Eliminar orden"
                  >
                    <FiTrash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ProductDetailModal productId={detailProductId} onClose={() => setDetailProductId(null)} />
    </>
  );
};

export default OrderDetailPanel;
