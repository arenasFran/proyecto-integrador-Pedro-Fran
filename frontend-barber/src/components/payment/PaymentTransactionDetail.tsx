import type { Payment } from '../../types/payment';
import { formatDateTime } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';

const methodLabel: Record<string, string> = {
  master: 'Mastercard',
  visa: 'Visa',
  amex: 'American Express',
  elo: 'Elo',
  naranja: 'Naranja',
  cabal: 'Cabal',
  maestro: 'Maestro',
};

const methodLogos: Record<string, string> = {
  master: 'https://http2.mlstatic.com/storage/logos-api-admin/ce454480-445f-11eb-bf78-3b1ee7bf744b-m.svg',
  visa: 'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
  amex: 'https://http2.mlstatic.com/storage/logos-api-admin/312238e0-563b-11eb-9e47-69f47efeb6c5-m.svg',
};

const statusColors: Record<string, string> = {
  approved: 'text-[#22C55E] bg-[#22C55E]/10',
  rejected: 'text-red-400 bg-red-500/10',
  refunded: 'text-yellow-400 bg-yellow-500/10',
  pending: 'text-[#FFB800] bg-[#FFB800]/10',
  cancelled: 'text-[#8A8A8A] bg-[#8A8A8A]/10',
};

function formatDateStr(s: string): string {
  return formatDateTime(s);
}

interface PaymentTransactionDetailProps {
  payment: Payment;
}

export default function PaymentTransactionDetail({ payment }: PaymentTransactionDetailProps) {
  const methodName = payment.mpPaymentMethodId ? (methodLabel[payment.mpPaymentMethodId] || payment.mpPaymentMethodId.toUpperCase()) : null;
  const logo = payment.mpPaymentMethodId ? methodLogos[payment.mpPaymentMethodId] : null;

  return (
    <div className="rounded-[12px] border border-[#282828] bg-[#0A0A0A] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[#8A8A8A] uppercase tracking-wider">Transacción</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors[payment.status] || 'text-[#8A8A8A] bg-[#1A1A1A]'}`}>
          {payment.mpStatusDetail ? payment.mpStatusDetail.replace(/_/g, ' ') : payment.status}
        </span>
      </div>

      <div className="space-y-2">
        {methodName && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#666]">Método</span>
            <span className="flex items-center gap-1.5 text-[12px] text-white">
              {logo && <img src={logo} alt={methodName} className="h-4" />}
              {methodName}
              {payment.mpCardLastFourDigits && (
                <span className="text-[#666]">···{payment.mpCardLastFourDigits}</span>
              )}
            </span>
          </div>
        )}

        {payment.mpPaymentTypeId && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#666]">Tipo</span>
            <span className="text-[12px] text-white capitalize">{payment.mpPaymentTypeId.replace(/_/g, ' ')}</span>
          </div>
        )}

        {payment.mpInstallments != null && payment.mpInstallments > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#666]">Cuotas</span>
            <span className="text-[12px] text-white">{payment.mpInstallments}x</span>
          </div>
        )}

        <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#666]">{payment.status === 'approved' ? 'Pagado' : 'Monto'}</span>
          <span className="text-[12px] text-white font-medium">
            {formatCurrency(payment.mpTotalPaidAmount || payment.amount)}
          </span>
        </div>

        {payment.mpNetReceivedAmount != null && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#666]">Neto recibido</span>
            <span className="text-[12px] text-[#22C55E] font-medium">{formatCurrency(payment.mpNetReceivedAmount)}</span>
          </div>
        )}

        {payment.mpFeeAmount != null && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#666]">Comisión MP</span>
            <span className="text-[12px] text-red-400">-{formatCurrency(payment.mpFeeAmount)}</span>
          </div>
        )}

        {payment.mpDateApproved && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#666]">Aprobado</span>
            <span className="text-[12px] text-[#8A8A8A]">{formatDateStr(payment.mpDateApproved)}</span>
          </div>
        )}

        {payment.mpPaymentId && (
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[#666]">ID MP</span>
            <span className="text-[11px] text-[#555] font-mono">{payment.mpPaymentId}</span>
          </div>
        )}
      </div>
    </div>
  );
}
