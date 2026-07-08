import { useEffect } from 'react';
import { AnimatedContainer, Button } from '../common';
import WalletBrick from './WalletBrick';

interface PaymentModalProps {
  isOpen: boolean;
  preferenceId: string;
  paymentId?: string;
  onClose: () => void;
  onPaymentSuccess?: () => void;
  title?: string;
}

export default function PaymentModal({ isOpen, preferenceId, paymentId, onClose, onPaymentSuccess, title }: PaymentModalProps) {
  useEffect(() => {
    if (!isOpen || !paymentId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/${paymentId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.data?.payment?.status === 'approved') {
          clearInterval(interval);
          onPaymentSuccess?.();
        }
      } catch {
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, paymentId, onPaymentSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <AnimatedContainer animation="scaleIn" className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-bold text-white">{title || 'Completar pago'}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#8A8A8A] hover:text-white hover:bg-[#1A1A1A] transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-[13px] text-[#8A8A8A] mb-6">
          Elegí tu medio de pago para completar la transacción de forma segura.
        </p>

        <WalletBrick
          preferenceId={preferenceId}
          onReady={() => {}}
          onError={(error) => {
            console.error('[PaymentModal] Error en Wallet Brick:', error);
          }}
        />

        <div className="mt-4">
          <Button variant="ghost" onClick={onClose} className="w-full">
            Cancelar
          </Button>
        </div>
      </AnimatedContainer>
    </div>
  );
}
