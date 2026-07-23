import { FiUser, FiCalendar, FiDollarSign, FiCreditCard, FiClock, FiCheckCircle, FiXCircle, FiTruck, FiAlertCircle, FiPackage, FiUserCheck, FiUserX } from 'react-icons/fi';
import type { Order, OrderStatus } from '../../types/order';
import { formatDateTime } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendiente', bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: <FiClock size={12} /> },
  paid: { label: 'Pagado', bg: 'bg-green-500/10', text: 'text-green-400', icon: <FiCheckCircle size={12} /> },
  delivered: { label: 'Entregado', bg: 'bg-blue-500/10', text: 'text-blue-400', icon: <FiTruck size={12} /> },
  cancelled: { label: 'Cancelado', bg: 'bg-red-500/10', text: 'text-red-400', icon: <FiXCircle size={12} /> },
  refunded: { label: 'Reembolsado', bg: 'bg-purple-500/10', text: 'text-purple-400', icon: <FiDollarSign size={12} /> },
  disputed: { label: 'En disputa', bg: 'bg-orange-500/10', text: 'text-orange-400', icon: <FiAlertCircle size={12} /> },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  account_money: 'Mercado Pago',
  visa: 'Visa',
  master: 'Mastercard',
  amex: 'American Express',
  debvisa: 'Visa Debito',
  debmaster: 'Mastercard Debito',
};

function getPaymentMethodLabel(method?: string): string {
  if (!method) return '';
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

interface OrderCardProps {
  order: Order;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, selected, onSelect }) => {
  const cfg = STATUS_CONFIG[order.status];
  const isAnonymous = !!order.clientName;

  return (
    <button
      onClick={() => onSelect?.(order.id)}
      className={`w-full rounded-[12px] border p-3 text-left transition-all cursor-pointer ${
        selected
          ? 'border-[#FF5C00] bg-[#FF5C00]/5'
          : 'border-[#282828] bg-[#121212] hover:border-[#383838]'
      }`}
      role="option"
      aria-selected={selected}
    >
      {/* Top: Status + Total */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
            {cfg.icon}
            {cfg.label}
          </span>
          {order.userName && (
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
              isAnonymous
                ? 'bg-gray-500/10 text-gray-400'
                : 'bg-green-500/10 text-green-400'
            }`}>
              {isAnonymous ? <FiUserX size={10} /> : <FiUserCheck size={10} />}
              {isAnonymous ? 'Anonimo' : 'Registrado'}
            </span>
          )}
        </div>
        <span className="text-[14px] font-bold text-[#FF5C00] shrink-0">{formatCurrency(order.total)}</span>
      </div>

      {/* Info line: date + customer */}
      <div className="flex items-center gap-3 text-[11px] text-[#8A8A8A]">
        <span className="inline-flex items-center gap-1">
          <FiCalendar size={10} className="text-[#6A6A6A]" />
          {formatDateTime(order.createdAt)}
        </span>
        {order.userName && (
          <span className="inline-flex items-center gap-1 truncate">
            <FiUser size={10} className="text-[#6A6A6A]" />
            {order.userName}
          </span>
        )}
      </div>

      {/* Bottom: products count + payment method */}
      <div className="flex items-center gap-2 mt-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] text-[#6A6A6A]">
          <FiPackage size={10} />
          {order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}
        </span>
        {order.paymentMethod && (
          <span className="inline-flex items-center gap-1 text-[11px] text-[#6A6A6A]">
            <FiCreditCard size={10} />
            {getPaymentMethodLabel(order.paymentMethod)}
          </span>
        )}
      </div>
    </button>
  );
};

export default OrderCard;
