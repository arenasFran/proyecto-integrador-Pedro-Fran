import { Payment } from '../../../src/domain/entities/Payment';

describe('Payment entity', () => {
  const makeData = () => ({
    type: 'product_order' as const,
    referenceId: 'ref-1',
    amount: 1000,
    userId: 'u1',
  });

  describe('create', () => {
    it('debe crear el pago con status pending', () => {
      const payment = Payment.create(makeData());
      expect(payment.status).toBe('pending');
      expect(payment.mpPaymentId).toBeUndefined();
    });

    it('debe usar UYU como currency por defecto', () => {
      const payment = Payment.create(makeData());
      expect(payment.currency).toBe('UYU');
    });

    it('debe permitir una currency personalizada', () => {
      const payment = Payment.create({ ...makeData(), currency: 'USD' });
      expect(payment.currency).toBe('USD');
    });

    it('debe permitir asociar un mpPreferenceId al crear', () => {
      const payment = Payment.create({ ...makeData(), mpPreferenceId: 'pref-1' });
      expect(payment.mpPreferenceId).toBe('pref-1');
    });
  });

  describe('approve', () => {
    it('debe cambiar el status a approved y guardar el mpPaymentId', () => {
      const payment = Payment.create(makeData());
      payment.approve('mp-1');
      expect(payment.status).toBe('approved');
      expect(payment.mpPaymentId).toBe('mp-1');
    });

    it('no debe hacer nada si el pago ya no está pending', () => {
      const payment = Payment.create(makeData());
      payment.approve('mp-1');
      payment.approve('mp-2');
      expect(payment.mpPaymentId).toBe('mp-1');
    });
  });

  describe('reject', () => {
    it('debe cambiar el status a rejected', () => {
      const payment = Payment.create(makeData());
      payment.reject();
      expect(payment.status).toBe('rejected');
    });

    it('no debe hacer nada si el pago ya no está pending', () => {
      const payment = Payment.create(makeData());
      payment.approve('mp-1');
      payment.reject();
      expect(payment.status).toBe('approved');
    });
  });

  describe('cancel', () => {
    it('debe cambiar el status a cancelled si no está aprobado', () => {
      const payment = Payment.create(makeData());
      payment.cancel();
      expect(payment.status).toBe('cancelled');
    });

    it('no debe cancelar un pago ya aprobado', () => {
      const payment = Payment.create(makeData());
      payment.approve('mp-1');
      payment.cancel();
      expect(payment.status).toBe('approved');
    });
  });

  describe('refund', () => {
    it('debe cambiar el status a refunded y guardar el mpPaymentId', () => {
      const payment = Payment.create(makeData());
      payment.approve('mp-1');
      payment.refund('mp-1');
      expect(payment.status).toBe('refunded');
      expect(payment.mpPaymentId).toBe('mp-1');
    });

    it('no debe hacer nada si ya está refunded', () => {
      const payment = Payment.create(makeData());
      payment.approve('mp-1');
      payment.refund('mp-1');
      payment.refund('mp-2');
      expect(payment.mpPaymentId).toBe('mp-1');
    });
  });

  describe('chargeBack', () => {
    it('debe cambiar el status a charge_back', () => {
      const payment = Payment.create(makeData());
      payment.chargeBack('mp-1');
      expect(payment.status).toBe('charge_back');
      expect(payment.mpPaymentId).toBe('mp-1');
    });

    it('no debe hacer nada si ya está en charge_back', () => {
      const payment = Payment.create(makeData());
      payment.chargeBack('mp-1');
      payment.chargeBack('mp-2');
      expect(payment.mpPaymentId).toBe('mp-1');
    });
  });

  describe('inMediation', () => {
    it('debe cambiar el status a in_mediation', () => {
      const payment = Payment.create(makeData());
      payment.inMediation('mp-1');
      expect(payment.status).toBe('in_mediation');
      expect(payment.mpPaymentId).toBe('mp-1');
    });

    it('no debe hacer nada si ya está en mediación', () => {
      const payment = Payment.create(makeData());
      payment.inMediation('mp-1');
      payment.inMediation('mp-2');
      expect(payment.mpPaymentId).toBe('mp-1');
    });
  });

  describe('assignPreference', () => {
    it('debe actualizar el mpPreferenceId', () => {
      const payment = Payment.create(makeData());
      payment.assignPreference('pref-2');
      expect(payment.mpPreferenceId).toBe('pref-2');
    });
  });

  describe('enrich', () => {
    it('debe actualizar solo los campos de metadata provistos', () => {
      const payment = Payment.create(makeData());
      payment.enrich({ mpStatusDetail: 'accredited', mpInstallments: 3 });
      expect(payment.mpStatusDetail).toBe('accredited');
      expect(payment.mpInstallments).toBe(3);
      expect(payment.mpPaymentMethodId).toBeUndefined();
    });

    it('debe actualizar todos los campos de metadata cuando se proveen', () => {
      const payment = Payment.create(makeData());
      const dateApproved = new Date();
      payment.enrich({
        mpStatusDetail: 'accredited',
        mpPaymentMethodId: 'visa',
        mpPaymentTypeId: 'credit_card',
        mpInstallments: 1,
        mpTotalPaidAmount: 1000,
        mpNetReceivedAmount: 950,
        mpFeeAmount: 50,
        mpCardLastFourDigits: '1234',
        mpCardIssuerId: 'issuer-1',
        mpDateApproved: dateApproved,
        mpOperationType: 'regular_payment',
      });
      expect(payment.mpPaymentMethodId).toBe('visa');
      expect(payment.mpPaymentTypeId).toBe('credit_card');
      expect(payment.mpTotalPaidAmount).toBe(1000);
      expect(payment.mpNetReceivedAmount).toBe(950);
      expect(payment.mpFeeAmount).toBe(50);
      expect(payment.mpCardLastFourDigits).toBe('1234');
      expect(payment.mpCardIssuerId).toBe('issuer-1');
      expect(payment.mpDateApproved).toBe(dateApproved);
      expect(payment.mpOperationType).toBe('regular_payment');
    });

    it('no debe pisar mpInstallments con 0 si no se especifica', () => {
      const payment = Payment.create(makeData());
      payment.enrich({ mpInstallments: 0 });
      expect(payment.mpInstallments).toBe(0);
    });
  });

  describe('restore', () => {
    it('debe reconstruir un pago a partir de props persistidas', () => {
      const now = new Date();
      const payment = Payment.restore({
        id: 'pay-1',
        type: 'membership',
        referenceId: 'ref-1',
        status: 'approved',
        mpPaymentId: 'mp-1',
        mpPreferenceId: 'pref-1',
        amount: 500,
        currency: 'UYU',
        userId: 'u1',
        createdAt: now,
        updatedAt: now,
      });
      expect(payment.id).toBe('pay-1');
      expect(payment.type).toBe('membership');
      expect(payment.status).toBe('approved');
    });
  });

  describe('toPrimitives', () => {
    it('debe devolver un objeto plano con las propiedades del pago', () => {
      const payment = Payment.create(makeData());
      const primitives = payment.toPrimitives();
      expect(primitives).toMatchObject({ referenceId: 'ref-1', amount: 1000, status: 'pending' });
    });
  });
});
