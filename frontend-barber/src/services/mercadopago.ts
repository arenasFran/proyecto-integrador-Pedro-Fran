import { initMercadoPago } from '@mercadopago/sdk-react';

let isInitialized = false;

export function initializeMercadoPago() {
  if (isInitialized) return;

  initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: 'es-UY' });
  isInitialized = true;
}
