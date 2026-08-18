import type { IconType } from 'react-icons';
import {
  FiCheckCircle,
  FiClock,
  FiPackage,
  FiTruck,
  FiXCircle,
} from 'react-icons/fi';
import type { OrderStatus } from '../../../../types/order';

export type OrderStatusConfig = {
  label: string;
  bg: string;
  text: string;
  dot: string;
  icon: IconType;
};

export const ORDER_STATUS_CONFIG: Partial<Record<OrderStatus, OrderStatusConfig>> = {
  pending: { label: 'Pendiente', bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400', icon: FiClock },
  paid: { label: 'Pagado', bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-400', icon: FiCheckCircle },
  delivered: { label: 'Entregado', bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400', icon: FiTruck },
  cancelled: { label: 'Cancelado', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', icon: FiXCircle },
};

const UNKNOWN_STATUS_CONFIG: OrderStatusConfig = {
  label: 'Estado no disponible',
  bg: 'bg-gray-500/10',
  text: 'text-gray-400',
  dot: 'bg-gray-400',
  icon: FiPackage,
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  account_money: 'Mercado Pago',
  visa: 'Visa',
  master: 'Mastercard',
  amex: 'American Express',
  local: 'Pago al levantar',
  online: 'Pago online',
  debvisa: 'Visa débito',
  debmaster: 'Mastercard débito',
};

export function getOrderStatusConfig(status: OrderStatus, paymentMethod?: string): OrderStatusConfig {
  if (status === 'pending' && paymentMethod === 'local') {
    return { ...(ORDER_STATUS_CONFIG.pending ?? UNKNOWN_STATUS_CONFIG), label: 'Pago al levantar' };
  }
  return ORDER_STATUS_CONFIG[status] ?? UNKNOWN_STATUS_CONFIG;
}

export function getPaymentMethodLabel(method?: string): string {
  if (!method) return 'No especificado';
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export const STATUS_FILTERS: { value: '' | OrderStatus; label: string; icon: IconType }[] = [
  { value: '', label: 'Todos', icon: FiPackage },
  { value: 'pending', label: 'Pendientes', icon: FiClock },
  { value: 'paid', label: 'Pagadas', icon: FiCheckCircle },
  { value: 'delivered', label: 'Entregadas', icon: FiTruck },
  { value: 'cancelled', label: 'Canceladas', icon: FiXCircle },
];
