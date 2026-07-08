import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import { AnimatedContainer, Button } from '../../../components/common';
import { useGetPaymentByIdQuery } from '../../../services/paymentApi';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status');
  const paymentId = searchParams.get('payment_id');
  const externalRef = searchParams.get('external_reference');
  const [paymentType, setPaymentType] = useState<string>('unknown');

  const pollId = externalRef || paymentId;

  const { data: paymentData } = useGetPaymentByIdQuery(externalRef || '', {
    skip: !externalRef,
  });

  useEffect(() => {
    if (paymentData?.payment?.type) {
      setPaymentType(paymentData.payment.type);
    }
  }, [paymentData]);

  useEffect(() => {
    if (status === 'pending' && pollId) {
      const checkInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/payments/${pollId}`);
          const data = await res.json();
          if (data.payment?.status === 'approved') {
            clearInterval(checkInterval);
            window.location.reload();
          }
        } catch {
        }
      }, 3000);
      return () => clearInterval(checkInterval);
    }
  }, [status, pollId]);

  const getTitle = () => {
    switch (status) {
      case 'success': return '¡Pago aprobado!';
      case 'failure': return 'Pago rechazado';
      case 'pending': return 'Pago pendiente';
      default: return 'Resultado del pago';
    }
  };

  const getMessage = () => {
    const typeLabel = paymentType === 'appointment' ? 'turno'
      : paymentType === 'membership' ? 'membresía'
      : paymentType === 'product_order' ? 'orden'
      : 'pago';

    switch (status) {
      case 'success':
        return paymentType === 'membership'
          ? 'Tu membresía ya está activa. Disfrutá de tus beneficios.'
          : `Tu ${typeLabel} fue confirmado exitosamente.`;
      case 'failure':
        return `El ${typeLabel} no pudo procesarse. Intentá de nuevo con otro medio de pago.`;
      case 'pending':
        return `Estamos procesando tu ${typeLabel}. Te notificaremos cuando se confirme.`;
      default:
        return 'No se pudo determinar el estado del pago.';
    }
  };

  const getRedirectPath = () => {
    if (status === 'success') {
      switch (paymentType) {
        case 'appointment': return '/mis-turnos';
        case 'membership': return '/mi-membresia';
        case 'product_order': return '/mis-ordenes';
        default: return '/';
      }
    }
    switch (paymentType) {
      case 'appointment': return '/reservar';
      case 'membership': return '/mi-membresia';
      case 'product_order': return '/tienda';
      default: return '/';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'success': return <FiCheckCircle className="text-[#22C55E] text-5xl" />;
      case 'failure': return <FiXCircle className="text-red-400 text-5xl" />;
      case 'pending': return <FiClock className="text-yellow-400 text-5xl" />;
      default: return <FiXCircle className="text-[#8A8A8A] text-5xl" />;
    }
  };

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        navigate(getRedirectPath());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, paymentType]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <AnimatedContainer animation="fadeIn" className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-8 text-center">
        <div className="flex justify-center mb-6">
          {getIcon()}
        </div>

        <h1 className="text-[22px] font-bold text-white mb-2">{getTitle()}</h1>
        <p className="text-[14px] text-[#8A8A8A] mb-8">{getMessage()}</p>

        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate(getRedirectPath())}>
            {status === 'success' ? 'Continuar' : 'Volver'}
          </Button>

          {status === 'success' && (
            <p className="text-[12px] text-[#555]">
              Serás redirigido automáticamente en 3 segundos...
            </p>
          )}
        </div>
      </AnimatedContainer>
    </div>
  );
}
