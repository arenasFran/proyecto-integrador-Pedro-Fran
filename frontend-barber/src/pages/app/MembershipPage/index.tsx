import { useMemo, useState } from 'react';
import { FiAward, FiCalendar, FiCheckCircle, FiClock, FiCreditCard, FiDollarSign, FiRefreshCw, FiScissors, FiShoppingBag, FiTrendingUp } from 'react-icons/fi';
import { Navigate, useNavigate } from 'react-router-dom';
import { AnimatedContainer, Button, ClientPageShell, ClientState, StatusBadge, Spinner, useToast } from '../../../components/common';
import PaymentModal from '../../../components/payment/PaymentModal';
import { useGetMyMembershipQuery, useGetCouponHistoryQuery, useInitiateMembershipPaymentMutation, useRetryMembershipPaymentMutation } from '../../../services/membershipApi';
import { getAccessToken } from '../../../services/api';
import { getTokenKind, getTokenUser } from '../../../utils/token';
import { formatCurrency } from '../../../utils/formatCurrency';

const formatDate = (date: string) => new Date(date).toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' });

export default function MembershipPage() {
  const token = getAccessToken();
  const kind = getTokenKind(token);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data, isLoading, error, refetch } = useGetMyMembershipQuery();
  const [retryPayment, { isLoading: isRetrying }] = useRetryMembershipPaymentMutation();
  const [initiatePayment, { isLoading: isPaying }] = useInitiateMembershipPaymentMutation();
  const active = data?.active;
  const pending = data?.pending;
  const history = data?.history ?? [];
  const { data: couponHistory } = useGetCouponHistoryQuery(active?.id ?? '', { skip: !active?.id });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [preferenceId, setPreferenceId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [now] = useState(() => Date.now());

  const daysLeft = useMemo(() => active ? Math.max(0, Math.ceil((new Date(active.endDate).getTime() - now) / 86400000)) : 0, [active, now]);
  const remainingCoupons = active ? Math.max(0, active.couponsTotal - active.couponsUsed) : 0;
  const usagePercent = active ? Math.min(100, (active.couponsUsed / Math.max(active.couponsTotal, 1)) * 100) : 0;

  if (!token) return <Navigate to="/login" replace />;
  if (kind === 'Admin' || kind === 'Empleado') return <Navigate to="/admin/membresias" replace />;

  const openPayment = async (retry: boolean) => {
    try {
      const user = getTokenUser(token);
      if (!user) throw new Error('Sesión inválida');
      const result = await (retry ? retryPayment({ userId: user.id }) : initiatePayment({ userId: user.id })).unwrap();
      if (result.preferenceId) {
        setPreferenceId(result.preferenceId);
        setPaymentModalOpen(true);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al iniciar el pago. Intentá de nuevo.', 'error');
    }
  };

  return (
    <ClientPageShell eyebrow="Mi membresía" icon={FiAward}>
      {error ? <ClientState icon={FiRefreshCw} title="No pudimos cargar tu membresía" description="Revisá tu conexión y volvé a intentarlo." actionLabel="Reintentar" onAction={() => void refetch()} tone="danger" /> : isLoading ? <div className="flex justify-center rounded-2xl border border-[#292929] bg-[#121212] py-20"><Spinner size="lg" /></div> : active ? <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <AnimatedContainer animation="fadeInUp" className="overflow-hidden rounded-2xl border border-[#FF5C00]/25 bg-[#121212]">
          <div className="h-1 bg-gradient-to-r from-[#FF5C00] via-[#FF8A4C] to-transparent" />
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge label="Activa" tone="success" icon={<FiCheckCircle aria-hidden="true" />} />{active.paymentMethod && <StatusBadge label={active.paymentMethod === 'mercadopago' ? 'Mercado Pago' : 'Pago en local'} tone="neutral" />}</div><h2 className="mt-3 text-[22px] font-semibold text-white">Membresía mensual</h2><p className="mt-1 text-[12px] text-[#777]">Vigente desde {formatDate(active.startDate)}</p></div><div className="sm:text-right"><p className="text-[11px] uppercase tracking-[0.13em] text-[#666]">Vence el</p><p className="mt-1 flex items-center gap-1.5 text-[14px] font-medium text-white sm:justify-end"><FiCalendar className="text-[#FF7A33]" aria-hidden="true" />{formatDate(active.endDate)}</p></div></div>
            <div className="mt-6 rounded-xl border border-[#292929] bg-[#181818] p-4"><div className="flex items-end justify-between gap-3"><div><p className="text-[11px] uppercase tracking-[0.12em] text-[#777]">Cupones de corte</p><p className="mt-1 text-[13px] text-[#aaa]">{remainingCoupons > 0 ? `Te quedan ${remainingCoupons} visita${remainingCoupons === 1 ? '' : 's'} disponibles` : 'Ya usaste todos tus cupones'}</p></div><p className="text-[25px] font-semibold text-white">{remainingCoupons}<span className="text-[14px] font-normal text-[#777]"> / {active.couponsTotal}</span></p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#2a2a2a]"><div className="h-full rounded-full bg-[#FF5C00] transition-[width] duration-500" style={{ width: `${usagePercent}%` }} /></div><p className="mt-2 text-[11px] text-[#666]">{active.couponsUsed} utilizados de {active.couponsTotal}</p></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-[#292929] bg-[#181818] p-4"><FiClock className="text-[#FF7A33]" aria-hidden="true" /><p className="mt-3 text-[11px] text-[#777]">Días restantes</p><p className="mt-1 text-[20px] font-semibold text-white">{daysLeft}</p></div><div className="rounded-xl border border-[#292929] bg-[#181818] p-4"><FiShoppingBag className="text-[#FF7A33]" aria-hidden="true" /><p className="mt-3 text-[11px] text-[#777]">Descuento en tienda</p><p className="mt-1 text-[20px] font-semibold text-white">{active.productDiscount}%</p></div><div className="rounded-xl border border-[#292929] bg-[#181818] p-4"><FiDollarSign className="text-[#FF7A33]" aria-hidden="true" /><p className="mt-3 text-[11px] text-[#777]">Valor pagado</p><p className="mt-1 text-[20px] font-semibold text-white">{formatCurrency(active.price)}</p></div></div>
          </div>
        </AnimatedContainer>

        <div className="grid content-start gap-5"><div className="rounded-2xl border border-[#292929] bg-[#121212] p-5"><div className="flex items-center gap-2"><FiTrendingUp className="text-[#FF7A33]" aria-hidden="true" /><h3 className="text-[14px] font-semibold text-white">Tu beneficio</h3></div><p className="mt-3 text-[13px] leading-5 text-[#909090]">Podés usar un cupón por visita y obtener {active.productDiscount}% de descuento en productos.</p><Button className="mt-4 w-full" onClick={() => navigate('/tienda')} icon={FiShoppingBag}>Ver tienda</Button></div><div className="rounded-2xl border border-[#292929] bg-[#121212] p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-[14px] font-semibold text-white">Historial de cupones</h3><span className="text-[11px] text-[#666]">{couponHistory?.history.length ?? 0}</span></div>{couponHistory?.history.length ? <div className="mt-4 grid gap-2">{couponHistory.history.slice(0, showHistory ? undefined : 3).map((item) => <div key={item.appointmentId} className="flex items-center justify-between gap-3 border-b border-[#242424] pb-2 last:border-0"><div className="min-w-0"><p className="truncate text-[12px] text-white">{item.serviceName}</p><p className="text-[11px] text-[#666]">{formatDate(item.date)} · {item.startTime}</p></div><StatusBadge label={item.couponRestored ? 'Restaurado' : item.status} tone={item.couponRestored ? 'success' : item.status === 'Cancelado' ? 'danger' : 'purple'} /></div>)}{couponHistory.history.length > 3 && <button type="button" onClick={() => setShowHistory((value) => !value)} className="pt-1 text-left text-[11px] font-medium text-[#FF8A4C]">{showHistory ? 'Ver menos' : 'Ver todo el historial'}</button>}</div> : <p className="mt-3 text-[12px] text-[#666]">Todavía no usaste cupones.</p>}</div></div>
      </div> : pending ? <AnimatedContainer animation="fadeInUp" className="rounded-2xl border border-amber-500/25 bg-[#121212] p-6 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"><FiClock aria-hidden="true" /></div><h2 className="mt-4 text-[19px] font-semibold text-white">Membresía pendiente</h2><p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#858585]">{pending.paymentMethod === 'mercadopago' ? 'Estamos esperando la confirmación de Mercado Pago.' : 'El personal debe aprobar tu membresía para activarla.'}</p>{pending.paymentMethod === 'mercadopago' && <Button className="mt-5" loading={isRetrying} onClick={() => void openPayment(true)} icon={FiRefreshCw}>Reintentar pago</Button>}</AnimatedContainer> : <AnimatedContainer animation="fadeInUp" className="rounded-2xl border border-[#292929] bg-[#121212] p-6 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF5C00]/10 text-[#FF7A33]"><FiAward aria-hidden="true" /></div><h2 className="mt-4 text-[20px] font-semibold text-white">Membresía mensual</h2><p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#858585]">Cuatro cortes por mes y {10}% de descuento en productos de barbería.</p><div className="mx-auto mt-6 grid max-w-lg gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#292929] bg-[#181818] p-4 text-left"><FiScissors className="text-[#FF7A33]" aria-hidden="true" /><p className="mt-3 text-[14px] font-semibold text-white">4 cortes por mes</p><p className="mt-1 text-[12px] text-[#777]">Un cupón por visita.</p></div><div className="rounded-xl border border-[#292929] bg-[#181818] p-4 text-left"><FiShoppingBag className="text-[#FF7A33]" aria-hidden="true" /><p className="mt-3 text-[14px] font-semibold text-white">10% en productos</p><p className="mt-1 text-[12px] text-[#777]">Se aplica al confirmar la compra.</p></div></div><div className="mx-auto mt-5 max-w-sm rounded-xl border border-[#FF5C00]/25 bg-[#FF5C00]/[0.05] p-4"><div className="flex items-center justify-center gap-2"><FiCreditCard className="text-[#FF7A33]" aria-hidden="true" /><span className="text-[14px] font-semibold text-white">Pago único</span></div><p className="mt-2 text-[24px] font-semibold text-white">{formatCurrency(399)}</p><Button className="mt-4 w-full" loading={isPaying} onClick={() => void openPayment(false)} icon={FiDollarSign}>Pagar online</Button></div></AnimatedContainer>}

      {!active && !pending && history.length > 0 && <div className="rounded-2xl border border-[#292929] bg-[#121212] p-5"><h3 className="text-[14px] font-semibold text-white">Membresías anteriores</h3><div className="mt-3 grid gap-2">{history.map((membership) => <div key={membership.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#292929] bg-[#181818] px-3 py-2.5"><div><p className="text-[12px] text-white">{formatDate(membership.startDate)} - {formatDate(membership.endDate)}</p><p className="mt-0.5 text-[11px] text-[#666]">{membership.couponsUsed}/{membership.couponsTotal} cupones usados</p></div><StatusBadge label={membership.status === 'expired' ? 'Vencida' : membership.status} tone={membership.status === 'expired' ? 'neutral' : 'danger'} /></div>)}</div></div>}
      <PaymentModal isOpen={paymentModalOpen} preferenceId={preferenceId} onClose={() => { setPaymentModalOpen(false); setPreferenceId(''); void refetch(); }} title="Completar pago - Membresía" />
    </ClientPageShell>
  );
}
