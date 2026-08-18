import { FiArrowUpRight, FiCalendar, FiCreditCard, FiPackage } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import type { Order } from '../../../../types/order';
import { formatCurrency } from '../../../../utils/formatCurrency';
import { formatDateTime } from '../../../../utils/formatDate';
import { getOrderStatusConfig, getPaymentMethodLabel } from './ordersConfig';

interface OrdersOrderRowProps {
  order: Order;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function OrdersOrderRow({ order, selected, onSelect }: OrdersOrderRowProps) {
  const navigate = useNavigate();
  const status = getOrderStatusConfig(order.status, order.paymentMethod);
  const StatusIcon = status.icon;
  const customerName = order.userName || order.clientName || 'Cliente sin nombre';
  const customerEmail = order.userEmail || order.clientEmail;
  const clientId = order.userId && !order.userId.startsWith('manual_') ? order.userId : null;
  const firstItem = order.items[0];
  const itemSummary = firstItem
    ? `${firstItem.name}${order.items.length > 1 ? ` +${order.items.length - 1}` : ''}`
    : 'Sin productos';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(order.id);
    }
  };

  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={() => onSelect(order.id)}
      onKeyDown={handleKeyDown}
      className={`group grid cursor-pointer items-center gap-x-3 border-b border-[#202020] px-3 py-3 text-left transition-colors last:border-b-0 focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5C00] sm:grid-cols-[minmax(0,1fr)_auto] sm:px-4 xl:grid-cols-[minmax(175px,1.3fr)_minmax(145px,1fr)_minmax(110px,.9fr)_minmax(120px,.85fr)_auto] ${
        selected ? 'bg-[#FF5C00]/[0.07]' : 'hover:bg-white/[0.025]'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${status.bg} ${status.text}`} aria-hidden="true">
          <StatusIcon size={15} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-mono text-[11px] font-medium text-white">#{order.id.slice(-8).toUpperCase()}</p>
            <span className={`hidden rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[#6A6A6A]">
            <FiCalendar size={10} aria-hidden="true" />
            {formatDateTime(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="min-w-0 pl-10 sm:pl-0">
        {clientId ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/admin/clientes/${clientId}`);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            className="block max-w-full truncate text-left text-[12px] font-medium text-[#E8E8E8] transition-colors hover:text-[#FF8A4C] hover:underline"
            aria-label={`Ver cliente ${customerName}`}
          >
            {customerName}
          </button>
        ) : (
          <p className="truncate text-[12px] font-medium text-[#E8E8E8]">{customerName}</p>
        )}
        <p className="truncate text-[11px] text-[#6A6A6A]">{customerEmail || 'Sin email registrado'}</p>
      </div>

      <div className="min-w-0 pl-10 sm:pl-0">
        <p className="flex items-center gap-1 truncate text-[12px] text-[#C8C8C8]">
          <FiPackage className="shrink-0 text-[#6A6A6A]" size={11} aria-hidden="true" />
          {itemSummary}
        </p>
        <p className="text-[11px] text-[#6A6A6A]">{order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}</p>
      </div>

      <div className="hidden min-w-0 xl:block">
        <p className="flex items-center gap-1 truncate text-[11px] text-[#8A8A8A]">
          <FiCreditCard size={11} aria-hidden="true" />
          {getPaymentMethodLabel(order.paymentMethod)}
        </p>
        <p className="mt-0.5 text-[14px] font-semibold text-[#FF8A4C]">{formatCurrency(order.total)}</p>
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="text-[14px] font-semibold text-[#FF8A4C] xl:hidden">{formatCurrency(order.total)}</span>
        <FiArrowUpRight className={`text-[#555] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${selected ? 'text-[#FF8A4C]' : ''}`} size={15} aria-hidden="true" />
      </div>

      <div className="col-span-full flex items-center gap-2 pl-10 text-[10px] text-[#6A6A6A] sm:hidden">
        <span className={`inline-flex rounded-full px-1.5 py-0.5 font-medium ${status.bg} ${status.text}`}>{status.label}</span>
        <span className="flex items-center gap-1"><FiCreditCard size={10} aria-hidden="true" />{getPaymentMethodLabel(order.paymentMethod)}</span>
      </div>
    </div>
  );
}
