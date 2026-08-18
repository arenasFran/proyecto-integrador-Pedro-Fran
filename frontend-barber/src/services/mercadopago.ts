let initializationPromise: Promise<void> | null = null;

export function initializeMercadoPago() {
  if (!initializationPromise) {
    initializationPromise = import('@mercadopago/sdk-react').then(({ initMercadoPago }) => {
      initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: 'es-UY' });
    });
  }

  return initializationPromise;
}
