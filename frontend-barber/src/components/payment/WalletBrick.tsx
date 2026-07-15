import { useMemo, useState } from 'react';
import { Wallet } from '@mercadopago/sdk-react';

interface WalletBrickProps {
  preferenceId: string;
  onError?: (error: unknown) => void;
  onReady?: () => void;
}

export default function WalletBrick({ preferenceId, onError, onReady }: WalletBrickProps) {
  const [brickError, setBrickError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const initialization = useMemo(() => ({ preferenceId, redirectMode: 'blank' }), [preferenceId]);

  if (brickError) {
    const fallbackUrl = `https://www.mercadopago.com.uy/checkout/v1/redirect?pref_id=${preferenceId}`;
    return (
      <div className="text-center py-4">
        <p className="text-[13px] text-red-400 mb-3">
          No se pudo cargar el botón de pago. Verificá que tu navegador no esté bloqueando ventanas emergentes.
        </p>
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-[12px] bg-[#009EE3] px-6 py-2 text-[14px] font-semibold text-white hover:bg-[#0086C4] transition-colors"
        >
          Ir a pagar con Mercado Pago
        </a>
      </div>
    );
  }

  return (
    <>
      {!isReady && (
        <div className="flex items-center justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#009EE3] border-t-transparent" />
          <span className="ml-2 text-[13px] text-[#8A8A8A]">Cargando medio de pago...</span>
        </div>
      )}
      <div className={isReady ? '' : 'opacity-0 absolute pointer-events-none'}>
        <Wallet
          initialization={initialization}
          onReady={() => {
            setIsReady(true);
            onReady?.();
          }}
          onError={() => {
            setBrickError(true);
            onError?.(new Error('Wallet brick error'));
          }}
        />
      </div>
    </>
  );
}
