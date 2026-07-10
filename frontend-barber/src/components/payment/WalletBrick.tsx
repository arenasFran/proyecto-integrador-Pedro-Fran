import { useMemo } from 'react';
import { Wallet } from '@mercadopago/sdk-react';

interface WalletBrickProps {
  preferenceId: string;
  onError?: (error: unknown) => void;
  onReady?: () => void;
}

export default function WalletBrick({ preferenceId, onError, onReady }: WalletBrickProps) {
  const initialization = useMemo(() => ({ preferenceId, redirectMode: 'blank' }), [preferenceId]);

  return (
    <Wallet
      initialization={initialization}
      onReady={onReady}
      onError={onError}
    />
  );
}
