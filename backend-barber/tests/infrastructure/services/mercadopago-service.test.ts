jest.mock('mercadopago', () => {
  const mockPaymentInstance = {
    get: jest.fn(),
  };
  const mockPayment = jest.fn(() => mockPaymentInstance);

  const mockPreferenceInstance = {
    create: jest.fn(),
  };
  const mockPreference = jest.fn(() => mockPreferenceInstance);

  const MercadoPagoConfig = jest.fn().mockImplementation(({ accessToken }) => ({
    accessToken,
  }));

  return {
    __esModule: true,
    default: MercadoPagoConfig,
    MercadoPagoConfig,
    Payment: mockPayment,
    Preference: mockPreference,
    WebhookSignatureValidator: {
      validate: jest.fn(),
    },
  };
});

import { MercadoPagoService } from '../../../src/infrastructure/services/MercadoPagoService';

const SDK = jest.requireMock('mercadopago');

describe('MercadoPagoService', () => {
  let service: MercadoPagoService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MercadoPagoService('TEST-access-token-12345', 'my-webhook-secret');
  });

  describe('validateWebhookSignature', () => {
    it('debe retornar true si el SDK valida correctamente', () => {
      SDK.WebhookSignatureValidator.validate.mockImplementation(() => undefined);

      const result = service.validateWebhookSignature({
        xSignature: 'ts=1704908010,v1=abc123',
        xRequestId: 'req-123',
        dataId: '123456',
      });

      expect(result).toBe(true);
      expect(SDK.WebhookSignatureValidator.validate).toHaveBeenCalledWith({
        xSignature: 'ts=1704908010,v1=abc123',
        xRequestId: 'req-123',
        dataId: '123456',
        secret: 'my-webhook-secret',
      });
    });

    it('debe retornar false si el SDK lanza error', () => {
      SDK.WebhookSignatureValidator.validate.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const result = service.validateWebhookSignature({
        xSignature: 'ts=1704908010,v1=bad-hash',
        xRequestId: 'req-123',
        dataId: '123456',
      });

      expect(result).toBe(false);
    });

    it('debe retornar false si no hay webhook secret configurado', () => {
      service = new MercadoPagoService('TEST-access-token');

      const result = service.validateWebhookSignature({
        xSignature: 'ts=1704908010,v1=abc123',
        xRequestId: 'req-123',
        dataId: '123456',
      });

      expect(result).toBe(false);
      expect(SDK.WebhookSignatureValidator.validate).not.toHaveBeenCalled();
    });
  });

  describe('getPayment', () => {
    const mockPaymentInstance = new SDK.Payment();

    it('debe retornar datos mapeados cuando el pago existe', async () => {
      mockPaymentInstance.get.mockResolvedValue({
        id: '123456',
        status: 'approved',
        status_detail: 'accredited',
        transaction_amount: 1500,
        payment_method_id: 'visa',
        payer: { email: 'buyer@test.com' },
        external_reference: 'ref-1',
      });

      const result = await service.getPayment('123456');

      expect(result).toEqual({
        id: '123456',
        status: 'approved',
        statusDetail: 'accredited',
        transactionAmount: 1500,
        paymentMethodId: 'visa',
        payerEmail: 'buyer@test.com',
        externalReference: 'ref-1',
      });
      expect(mockPaymentInstance.get).toHaveBeenCalledWith({ id: '123456' });
    });

    it('debe retornar null si la respuesta no tiene id', async () => {
      mockPaymentInstance.get.mockResolvedValue({});

      const result = await service.getPayment('999');

      expect(result).toBeNull();
    });

    it('debe retornar null si el SDK lanza error (pago no existe)', async () => {
      mockPaymentInstance.get.mockRejectedValue(new Error('Payment not found'));

      const result = await service.getPayment('999');

      expect(result).toBeNull();
    });

    it('debe lanzar error si no hay access token', async () => {
      service = new MercadoPagoService(undefined);

      await expect(service.getPayment('123')).rejects.toThrow(
        'MercadoPago no está configurado',
      );
    });
  });

  describe('createPreference', () => {
    const mockPreferenceInstance = new SDK.Preference();
    const defaultParams = {
      items: [{ title: 'Corte de pelo', quantity: 1, unitPrice: 500 }],
      externalReference: 'ref-1',
      backUrls: {
        success: 'http://localhost/success',
        failure: 'http://localhost/failure',
        pending: 'http://localhost/pending',
      },
      notificationUrl: 'https://api.example.com/webhook',
      payerEmail: 'buyer@test.com',
    };

    it('debe crear preferencia y retornar datos mapeados', async () => {
      mockPreferenceInstance.create.mockResolvedValue({
        id: 'pref-123',
        init_point: 'https://mercadopago.com/init',
        sandbox_init_point: 'https://sandbox.mercadopago.com/init',
      });

      const result = await service.createPreference(defaultParams);

      expect(result).toEqual({
        preferenceId: 'pref-123',
        initPoint: 'https://mercadopago.com/init',
        sandboxInitPoint: 'https://sandbox.mercadopago.com/init',
      });
    });

    it('debe lanzar error si no hay access token', async () => {
      service = new MercadoPagoService(undefined);

      await expect(service.createPreference(defaultParams)).rejects.toThrow(
        'MercadoPago no está configurado',
      );
    });
  });
});
