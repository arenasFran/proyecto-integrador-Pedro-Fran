import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiXCircle, FiX, FiClock } from 'react-icons/fi';
import { StatusScreen } from '@mercadopago/sdk-react';
import { Button } from '../../../components/common';
import { useGetPaymentByIdQuery } from '../../../services/paymentApi';
import { formatDateTime } from '../../../utils/formatDate';
import { formatCurrency } from '../../../utils/formatCurrency';

const drawCheckmark = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] as const },
  },
};

const typeLabels: Record<string, string> = {
  appointment: 'Turno',
  membership: 'Membresía',
  product_order: 'Orden de compra',
};

const detailVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.35 + i * 0.08, duration: 0.4, ease: 'easeOut' as const },
  }),
};

function formatDate(dateStr: string): string {
  return formatDateTime(dateStr);
}

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status');
  const mpPaymentId = searchParams.get('payment_id');
  const externalRef = searchParams.get('external_reference');
  const [paymentType, setPaymentType] = useState<string>('unknown');
  const [showCheckmark, setShowCheckmark] = useState(false);

  const { data: paymentData } = useGetPaymentByIdQuery(externalRef || '', {
    skip: !externalRef,
  });

  useEffect(() => {
    if (paymentData?.payment?.type) {
      setPaymentType(paymentData.payment.type);
    }
  }, [paymentData]);

  useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(() => setShowCheckmark(true), 100);
      return () => clearTimeout(t);
    }
  }, [status]);

  if (mpPaymentId && (status === 'success' || status === 'failure' || status === 'pending')) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <StatusScreen initialization={{ paymentId: mpPaymentId }} />
          <div className="mt-6 text-center">
            <Button onClick={() => navigate('/')} variant="ghost">Volver al inicio</Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-8 text-center"
        >
          <div className="flex justify-center mb-6">
            <FiClock className="text-yellow-400 text-5xl animate-pulse" />
          </div>
          <h1 className="text-[22px] font-bold text-white mb-2">Pago pendiente</h1>
          <p className="text-[14px] text-[#8A8A8A] mb-8">
            Estamos procesando tu {typeLabels[paymentType] || 'pago'}. Te notificaremos cuando se confirme.
          </p>
          <Button onClick={() => navigate('/')}>Volver al inicio</Button>
        </motion.div>
      </div>
    );
  }

  if (status === 'failure') {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-8 text-center"
        >
          <div className="flex justify-center mb-6">
            <FiXCircle className="text-red-400 text-5xl" />
          </div>
          <h1 className="text-[22px] font-bold text-white mb-2">Pago rechazado</h1>
          <p className="text-[14px] text-[#8A8A8A] mb-8">
            El {typeLabels[paymentType] || 'pago'} no pudo procesarse. Intentá de nuevo con otro medio de pago.
          </p>
          <Button onClick={() => navigate('/tienda')}>Volver a la tienda</Button>
        </motion.div>
      </div>
    );
  }

  const payment = paymentData?.payment;
  const details: { label: string; value: string }[] = [
    { label: 'Tipo', value: typeLabels[paymentType] || 'Pago' },
    ...(payment?.amount ? [  { label: 'Monto', value: formatCurrency(payment.amount) }] : []),
    ...(payment?.createdAt ? [{ label: 'Fecha', value: formatDate(payment.createdAt) }] : []),
    ...(payment?.mpPaymentId ? [{ label: 'ID MercadoPago', value: payment.mpPaymentId }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 relative overflow-hidden">
      {/* background glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.06 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="absolute w-[300px] h-[300px] rounded-full bg-[#22C55E] blur-[120px] pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-[24px] border border-[#1F1F1F] bg-[#121212] p-8 relative"
      >
        {/* close button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 text-[#555] hover:text-white transition-colors duration-150 p-1 rounded-full hover:bg-[#1F1F1F]"
          aria-label="Cerrar"
        >
          <FiX className="text-[20px]" />
        </button>

        {/* checkmark */}
        <div className="flex justify-center mb-4 mt-2">
          <motion.svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            initial={{ scale: 0 }}
            animate={{ scale: showCheckmark ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
          >
            {/* circle background */}
            <motion.circle
              cx="40" cy="40" r="37"
              fill="#0A0E0A"
              stroke="#22C55E"
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
            />
            {/* checkmark */}
            <motion.path
              d="M24 40.5L35 52L55 29"
              stroke="#22C55E"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              variants={drawCheckmark}
              initial="hidden"
              animate={showCheckmark ? 'visible' : 'hidden'}
            />
          </motion.svg>
        </div>

        {/* title */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.3 }}
          className="text-[24px] font-bold text-white text-center mb-1"
        >
          ¡Pago confirmado!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.3 }}
          className="text-[14px] text-[#8A8A8A] text-center mb-8"
        >
          Tu {typeLabels[paymentType] || 'pago'} fue procesado exitosamente.
        </motion.p>

        {/* details */}
        {details.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="rounded-[16px] border border-[#1F1F1F] bg-[#0A0A0A] p-5 mb-8"
          >
            <div className="space-y-3">
              {details.map((d, i) => (
                <motion.div
                  key={d.label}
                  custom={i}
                  variants={detailVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex justify-between items-center"
                >
                  <span className="text-[13px] text-[#666]">{d.label}</span>
                  <span className="text-[13px] text-white font-medium truncate ml-4">{d.value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <Button onClick={() => navigate('/')} className="w-full">
          Volver al inicio
        </Button>
      </motion.div>
    </div>
  );
}
