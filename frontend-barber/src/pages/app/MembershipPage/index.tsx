import { useState } from 'react';
import { FiAward, FiCalendar, FiCheckCircle, FiClock, FiTrendingUp, FiXCircle, FiScissors, FiShoppingBag, FiCreditCard, FiDollarSign, FiRefreshCw } from 'react-icons/fi';
import { Navigate } from 'react-router-dom';
import { AnimatedContainer, Spinner, Button, ConfirmModal, useToast } from '../../../components/common';
import { useGetMyMembershipQuery, useCreateSubscriptionMutation, useCancelSubscriptionMutation, useRetryMembershipPaymentMutation, useInitiateMembershipPaymentMutation } from '../../../services/membershipApi';
import { getAccessToken } from '../../../services/api';
import { getTokenKind } from '../../../utils/token';
import PaymentModal from '../../../components/payment/PaymentModal';

export default function MembershipPage() {
  const token = getAccessToken();
  const kind = getTokenKind(token);

  const { data, isLoading } = useGetMyMembershipQuery();
  const [createSubscription, { isLoading: isCreatingSub }] = useCreateSubscriptionMutation();
  const [cancelSubscription, { isLoading: isCancellingSub }] = useCancelSubscriptionMutation();
  const [retryPayment, { isLoading: isRetrying }] = useRetryMembershipPaymentMutation();
  const [initiatePayment, { isLoading: isPaying }] = useInitiateMembershipPaymentMutation();

  const { showToast } = useToast();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [retryPreferenceId, setRetryPreferenceId] = useState('');

  if (!token) return <Navigate to="/login" replace />;
  if (kind === 'Admin' || kind === 'Empleado') return <Navigate to="/admin/membresias" replace />;

  const active = data?.active;
  const pending = data?.pending;
  const history = data?.history ?? [];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const remainingCoupons = active ? active.couponsTotal - active.couponsUsed : 0;
  const daysLeft = active
    ? Math.max(0, Math.ceil((new Date(active.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isSubscription = active?.mpPreapprovalId != null;

  const handlePurchaseOnline = async () => {
    try {
      const user = JSON.parse(atob(token.split('.')[1]));
      const result = await initiatePayment({ userId: user.id }).unwrap();
      if (result.preferenceId) {
        setRetryPreferenceId(result.preferenceId);
        setPaymentModalOpen(true);
      }
    } catch {
      showToast('Error al crear la suscripción. Intentá de nuevo.', 'error');
    }
  };

  const handleCancelSubscription = async () => {
    if (!active) return;
    setCancelModalOpen(false);
    try {
      await cancelSubscription(active.id).unwrap();
      showToast('Suscripción cancelada correctamente', 'success');
    } catch {
      showToast('Error al cancelar la suscripción', 'error');
    }
  };

  const handleRetryPayment = async () => {
    try {
      const user = JSON.parse(atob(token.split('.')[1]));
      const result = await retryPayment({ userId: user.id }).unwrap();
      if (result.preferenceId) {
        setRetryPreferenceId(result.preferenceId);
        setPaymentModalOpen(true);
      }
    } catch {
      showToast('Error al reintentar el pago. Intentá de nuevo.', 'error');
    }
  };

  const formatPaymentMethod = (method: string | null) => {
    switch (method) {
      case 'mercadopago': return 'Mercado Pago';
      case 'local': return 'Pago en local';
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <AnimatedContainer animation="fadeInDown">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FF5C00]/10">
              <FiAward className="text-[#FF5C00] text-lg" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-white">Mi Membresía</h1>
              <p className="text-[13px] text-[#8A8A8A]">Gestioná tu membresía y cupones</p>
            </div>
          </div>
        </AnimatedContainer>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : active ? (
          <>
            <AnimatedContainer animation="fadeInUp" delay={0.1}>
              <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-6 mb-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
                      <span className="text-[13px] font-medium text-[#22C55E]">Activa</span>
                      {isSubscription && (
                        <span className="text-[11px] text-[#8A8A8A] ml-2 flex items-center gap-1">
                          <FiCreditCard className="text-[#FF5C00]" />
                          Suscripción recurrente
                        </span>
                      )}
                      {active.paymentMethod === 'local' && (
                        <span className="text-[11px] text-[#8A8A8A] ml-2 flex items-center gap-1">
                          <FiDollarSign className="text-[#FF5C00]" />
                          Pago en local
                        </span>
                      )}
                    </div>
                    <h2 className="text-[24px] font-bold text-white">Membresía Mensual</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-[#8A8A8A]">Vence el</p>
                    <p className="text-[14px] font-semibold text-white flex items-center gap-1">
                      <FiCalendar className="text-[#FF5C00] text-sm" />
                      {formatDate(active.endDate)}
                    </p>
                  </div>
                </div>

                <div className="rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-5 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] text-[#8A8A8A]">Cupones de corte disponibles</span>
                    <span className="text-[22px] font-bold text-white">
                        {remainingCoupons}
                      <span className="text-[14px] text-[#8A8A8A]"> / {active.couponsTotal}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#282828] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#FF5C00] transition-all duration-500"
                      style={{ width: `${(active.couponsUsed / active.couponsTotal) * 100}%` }}
                    />
                  </div>
                  <p className="text-[12px] text-[#8A8A8A] mt-2">
                    {remainingCoupons > 0
                      ? `Te ${remainingCoupons === 1 ? 'queda' : 'quedan'} ${remainingCoupons} corte${remainingCoupons === 1 ? '' : 's'} este mes`
                      : 'Ya usaste todos tus cupones este mes'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FiCheckCircle className="text-[#22C55E] text-sm" />
                      <span className="text-[11px] text-[#8A8A8A]">Usados</span>
                    </div>
                    <span className="text-[18px] font-bold text-white">{active.couponsUsed}</span>
                  </div>
                  <div className="rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FiClock className="text-[#FF5C00] text-sm" />
                      <span className="text-[11px] text-[#8A8A8A]">Días restantes</span>
                    </div>
                    <span className="text-[18px] font-bold text-white">{daysLeft}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FiShoppingBag className="text-[#FF5C00] text-sm" />
                    <span className="text-[11px] text-[#8A8A8A]">Descuento en productos</span>
                  </div>
                  <span className="text-[18px] font-bold text-white">{active.productDiscount}% OFF</span>
                  <p className="text-[11px] text-[#22C55E] mt-1">Se aplica automáticamente al comprar en la tienda</p>
                </div>

                {formatPaymentMethod(active.paymentMethod) && (
                  <div className="mt-4 rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FiCreditCard className="text-[#FF5C00] text-sm" />
                      <span className="text-[11px] text-[#8A8A8A]">Método de pago</span>
                    </div>
                    <span className="text-[14px] font-semibold text-white">{formatPaymentMethod(active.paymentMethod)}</span>
                  </div>
                )}

                {isSubscription && (
                  <div className="mt-4 flex justify-end">
                    <Button variant="danger" onClick={() => setCancelModalOpen(true)} loading={isCancellingSub}>
                      Cancelar suscripción en Mercado Pago
                    </Button>
                  </div>
                )}
              </div>
            </AnimatedContainer>

            {history.length > 1 && (
              <AnimatedContainer animation="fadeInUp" delay={0.2}>
                <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-6">
                  <h3 className="text-[15px] font-semibold text-white mb-4">Historial</h3>
                  <div className="space-y-3">
                    {history.slice(1).map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-[12px] bg-[#1A1A1A] border border-[#282828] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-[8px] ${
                            m.status === 'expired' ? 'bg-[#8A8A8A]/10' : 'bg-red-500/10'
                          }`}>
                            {m.status === 'expired'
                              ? <FiCheckCircle className="text-[#8A8A8A] text-sm" />
                              : <FiXCircle className="text-red-400 text-sm" />}
                          </div>
                          <div>
                            <p className="text-[13px] text-white font-medium">
                              {m.status === 'expired' ? 'Vencida' : m.status}
                            </p>
                            <p className="text-[11px] text-[#8A8A8A]">{formatDate(m.startDate)} - {formatDate(m.endDate)}</p>
                          </div>
                        </div>
                        <span className="text-[12px] text-[#8A8A8A]">
                          {m.couponsUsed}/{m.couponsTotal} usados
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedContainer>
            )}
          </>
        ) : pending ? (
          <AnimatedContainer animation="fadeInUp" delay={0.1}>
            <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-[#FF5C00]/10">
                  <FiClock className="text-[#FF5C00] text-4xl" />
                </div>
              </div>
              <h2 className="text-[22px] font-bold text-white mb-2">Membresía pendiente</h2>
              <p className="text-[14px] text-[#8A8A8A] max-w-md mx-auto mb-8">
                {pending.paymentMethod === 'mercadopago'
                  ? 'Tu membresía está pendiente de confirmación por MercadoPago. Una vez aprobado el pago se activará automáticamente.'
                  : 'Solicitaste una membresía. Una vez que el personal la apruebe, se activará automáticamente.'}
              </p>
              <div className="rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-4 max-w-sm mx-auto">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#8A8A8A]">Estado</span>
                  <span className="flex items-center gap-1 text-[13px] text-[#FFB800]">
                    <span className="flex h-2 w-2 rounded-full bg-[#FFB800]" />
                    Pendiente
                  </span>
                </div>
              </div>

              {pending.paymentMethod === 'mercadopago' && (
                <div className="mt-6">
                  <p className="text-[12px] text-[#8A8A8A] mb-3">
                    ¿El pago anterior quedó pendiente? Volvé a intentarlo.
                  </p>
                  <Button
                    onClick={handleRetryPayment}
                    loading={isRetrying}
                    icon={FiRefreshCw}
                  >
                    Reintentar pago
                  </Button>
                </div>
              )}
            </div>
          </AnimatedContainer>
        ) : (
          <AnimatedContainer animation="fadeInUp" delay={0.1}>
            <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-[#FF5C00]/10">
                  <FiAward className="text-[#FF5C00] text-4xl" />
                </div>
              </div>
              <h2 className="text-[22px] font-bold text-white mb-2">Membresía Mensual</h2>
              <p className="text-[14px] text-[#8A8A8A] max-w-md mx-auto mb-8">
                Adquirí tu membresía y obtené 4 cortes por mes más un 10% de descuento en productos.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
                <div className="rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-4 text-left">
                  <FiScissors className="text-[#FF5C00] text-lg mb-2" />
                  <p className="text-[14px] font-semibold text-white">4 Cortes por mes</p>
                  <p className="text-[12px] text-[#8A8A8A]">Canjeá uno por cada visita</p>
                </div>
                <div className="rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-4 text-left">
                  <FiTrendingUp className="text-[#FF5C00] text-lg mb-2" />
                  <p className="text-[14px] font-semibold text-white">10% OFF en productos</p>
                  <p className="text-[12px] text-[#8A8A8A]">Descuento en productos de barbería</p>
                </div>
              </div>

              <div className="flex justify-center max-w-lg mx-auto mb-8">
                <Button
                  loading={isPaying}
                  onClick={handlePurchaseOnline}
                  icon={FiCreditCard}
                >
                  Suscribirme online
                </Button>
              </div>
              <p className="text-[11px] text-[#8A8A8A]">
                Suscripción mensual recurrente por $399/mes. Podés cancelar cuando quieras.
              </p>
            </div>
          </AnimatedContainer>
        )}

        {history.length > 0 && !active && !pending && (
          <AnimatedContainer animation="fadeInUp" delay={0.2}>
            <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-6 mt-6">
              <h3 className="text-[15px] font-semibold text-white mb-4">Membresías anteriores</h3>
              <div className="space-y-3">
                {history.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-[12px] bg-[#1A1A1A] border border-[#282828] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#8A8A8A]/10">
                        <FiCalendar className="text-[#8A8A8A] text-sm" />
                      </div>
                      <div>
                        <p className="text-[13px] text-white font-medium">
                          {formatDate(m.startDate)} - {formatDate(m.endDate)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[12px] text-[#8A8A8A]">
                      {m.couponsUsed}/{m.couponsTotal} usados
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedContainer>
        )}
      </div>

      <PaymentModal
        isOpen={paymentModalOpen}
        preferenceId={retryPreferenceId}
        onClose={() => {
          setPaymentModalOpen(false);
          setRetryPreferenceId('');
        }}
        title="Completar pago - Membresía"
      />

      <ConfirmModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelSubscription}
        title="Cancelar suscripción"
        message="Al cancelar la suscripción en MercadoPago, no se realizarán más cobros automáticos. La membresía actual se mantendrá activa hasta su fecha de vencimiento. ¿Querés continuar?"
        confirmText="Cancelar suscripción"
        variant="danger"
        loading={isCancellingSub}
      />
    </div>
  );
}
