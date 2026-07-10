import { useEffect, useRef, memo } from 'react';
import { Wallet } from '@mercadopago/sdk-react';
import { AnimatedContainer, Button } from '../common';

const WalletBrick = memo(function WalletBrick({ preferenceId, onError }: { preferenceId: string; onError: () => void }) {
  return (
    <Wallet
      initialization={{ preferenceId, redirectMode: 'blank' }}
      onError={onError}
    />
  );
});

interface PaymentModalProps {
  isOpen: boolean;
  preferenceId: string;
  onClose: () => void;
  title?: string;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function PaymentModal({ isOpen, preferenceId, onClose, title }: PaymentModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || !preferenceId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/payments/by-preference/${preferenceId}`);
        const json = await res.json();
        if (json?.payment?.status === 'approved') {
          onCloseRef.current();
        }
      } catch {
        // ignore network errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, preferenceId]);

  if (!isOpen || !preferenceId) return null;

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
          Hacé clic en el botón de Mercado Pago para completar el pago de forma segura.
        </p>

        <Wallet
          initialization={{ preferenceId, redirectMode: 'blank' }}
          onError={onClose}
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
