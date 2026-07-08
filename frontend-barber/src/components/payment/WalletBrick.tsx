import { Wallet } from '@mercadopago/sdk-react';

interface WalletBrickProps {
  preferenceId: string;
  onError?: (error: unknown) => void;
  onReady?: () => void;
}

export default function WalletBrick({ preferenceId, onError, onReady }: WalletBrickProps) {
  return (
    <Wallet
      initialization={{ preferenceId }}
      onReady={onReady}
      onError={(error) => onError?.(error)}
    />
  );
}
