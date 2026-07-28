import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { Button } from '../common';
import { formatCurrency } from '../../utils/formatCurrency';

const typeLabels: Record<string, string> = {
  appointment: 'Turno',
  membership: 'Membresía',
  product_order: 'Orden de compra',
};

const drawCheckmark = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] as const },
  },
};

interface PaymentSuccessModalProps {
  isOpen: boolean;
  paymentType?: string;
  amount?: number;
  onClose: () => void;
}

export default function PaymentSuccessModal({ isOpen, paymentType, amount, onClose }: PaymentSuccessModalProps) {
  const [showCheckmark, setShowCheckmark] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setShowCheckmark(true), 150);
      return () => clearTimeout(t);
    }
    setShowCheckmark(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-[24px] border border-[#1F1F1F] bg-[#121212] p-8 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#555] hover:text-white transition-colors duration-150 p-1 rounded-full hover:bg-[#1F1F1F]"
          aria-label="Cerrar"
        >
          <FiX className="text-[20px]" />
        </button>

        <div className="flex justify-center mb-4 mt-2">
          <motion.svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            initial={{ scale: 0 }}
            animate={{ scale: showCheckmark ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          >
            <motion.circle
              cx="40" cy="40" r="37"
              fill="#0A0E0A"
              stroke="#22C55E"
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
            />
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

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          className="text-[24px] font-bold text-white text-center mb-1"
        >
          ¡Pago confirmado!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.3 }}
          className="text-[14px] text-[#8A8A8A] text-center mb-6"
        >
          Tu {typeLabels[paymentType || ''] || 'pago'} fue procesado exitosamente.
        </motion.p>

        {amount && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="rounded-[16px] border border-[#1F1F1F] bg-[#0A0A0A] p-5 mb-6"
          >
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[#666]">Monto</span>
              <span className="text-[16px] text-white font-bold">{formatCurrency(amount)}</span>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.3 }}
        >
          <Button onClick={onClose} className="w-full">
            Entendido
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
