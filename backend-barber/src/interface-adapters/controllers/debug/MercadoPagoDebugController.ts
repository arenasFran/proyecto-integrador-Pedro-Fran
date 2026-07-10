import { Request, Response } from 'express';
import { getConfig } from '../../../infrastructure/config/env';

export class MercadoPagoDebugController {
  getMe = async (_req: Request, res: Response) => {
    try {
      const token = getConfig().mpAccessToken;

      if (!token) {
        console.error('[MP-DEBUG] MP_ACCESS_TOKEN no está configurado');
        return res.status(500).json({ error: 'MP_ACCESS_TOKEN no configurado' });
      }

      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      console.log('[MP-DEBUG] ===== USERS/ME =====');
      console.log('id:', data.id);
      console.log('nickname:', data.nickname);
      console.log('email:', data.email);
      console.log('site_id:', data.site_id);
      console.log('country_id:', data.country_id);
      console.log('status:', data.status);
      console.log('identification:', JSON.stringify(data.identification));
      console.log('tags:', JSON.stringify(data.tags));
      console.log('live_mode:', data.live_mode);
      console.log(JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error('[MP-DEBUG] Error status:', response.status);
        console.error('[MP-DEBUG] Error headers:', JSON.stringify([...response.headers]));
        console.error('[MP-DEBUG] Error body:', JSON.stringify(data));
        return res.status(response.status).json(data);
      }

      return res.json(data);
    } catch (error) {
      console.error('[MP-DEBUG] Error inesperado:', error);
      return res.status(500).json({ error: 'Error al consultar Mercado Pago' });
    }
  };

  getPaymentById = async (req: Request, res: Response) => {
    try {
      const token = getConfig().mpAccessToken;

      if (!token) {
        console.error('[MP-DEBUG] MP_ACCESS_TOKEN no está configurado');
        return res.status(500).json({ error: 'MP_ACCESS_TOKEN no configurado' });
      }

      const paymentId = req.params.id;
      console.log('[MP-DEBUG] Consultando payment_id:', paymentId);

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      console.log('[MP-DEBUG] ===== V1/PAYMENTS/:ID =====');
      console.log('[MP-DEBUG] status:', response.status);
      console.log('[MP-DEBUG] response completo:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        console.error('[MP-DEBUG] Error status:', response.status);
        console.error('[MP-DEBUG] Error headers:', JSON.stringify([...response.headers]));
        console.error('[MP-DEBUG] Error body:', JSON.stringify(data));
        return res.status(response.status).json(data);
      }

      return res.json(data);
    } catch (error) {
      console.error('[MP-DEBUG] Error inesperado:', error);
      return res.status(500).json({ error: 'Error al consultar pago en Mercado Pago' });
    }
  };
}
