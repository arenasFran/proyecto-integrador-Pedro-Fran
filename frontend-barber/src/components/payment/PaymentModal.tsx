import { useEffect, useState } from 'react';
import { Wallet } from '@mercadopago/sdk-react';
import { AnimatedContainer, Button } from '../common';
import PaymentSuccessModal from './PaymentSuccessModal';
import { getAccessToken } from '../../services/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface PaymentModalProps {
  isOpen: boolean;
  preferenceId: string;
  onClose: () => void;
  title?: string;
}

export default function PaymentModal({ isOpen, preferenceId, onClose, title }: PaymentModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [walletReady, setWalletReady] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [approvedType, setApprovedType] = useState<string>('');
  const [approvedAmount, setApprovedAmount] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || !preferenceId) return;

    const interval = setInterval(async () => {
      try {
        const token = getAccessToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`${BASE_URL}/api/payments/by-preference/${preferenceId}`, { headers });
        const json = await res.json();
        if (json?.payment?.status === 'approved') {
          setApprovedType(json.payment.type);
          setApprovedAmount(json.payment.amount);
          setShowSuccess(true);
          clearInterval(interval);
        }
      } catch {
        // ignore network errors during polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, preferenceId]);

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onClose();
  };

  if (!isOpen && !showSuccess) return null;

  return (
    <>
      {showSuccess && (
        <PaymentSuccessModal
          isOpen={showSuccess}
          paymentType={approvedType}
          amount={approvedAmount}
          onClose={handleSuccessClose}
        />
      )}

      {isOpen && preferenceId && !showSuccess && (
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

            {error ? (
              <div className="text-center mb-6">
                <p className="text-[13px] text-red-400 mb-4">{error}</p>
                <Button onClick={() => window.open(`https://www.mercadopago.com.uy/checkout/v1/redirect?pref_id=${preferenceId}`, '_blank')} className="w-full mb-2">
                  Abrir enlace de pago manual
                </Button>
                <Button variant="ghost" onClick={() => setError(null)} className="w-full">
                  Reintentar
                </Button>
              </div>
            ) : (
              <>
                <p className="text-[13px] text-[#8A8A8A] mb-6">
                  Hacé clic en el botón de Mercado Pago para completar el pago de forma segura.
                </p>

                {!walletReady && (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#009EE3] border-t-transparent" />
                    <span className="ml-2 text-[13px] text-[#8A8A8A]">Cargando medio de pago...</span>
                  </div>
                )}

                <div className={walletReady ? '' : 'opacity-0 absolute pointer-events-none'}>
                  <Wallet
                    initialization={{ preferenceId, redirectMode: 'blank' }}
                    onReady={() => setWalletReady(true)}
                    onError={() => setError('No se pudo abrir la ventana de pago. Verificá que tu navegador no esté bloqueando ventanas emergentes.')}
                  />
                </div>

                <div className="mt-4">
                  <Button variant="ghost" onClick={onClose} className="w-full">
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </AnimatedContainer>
        </div>
      )}
    </>
  );
}
