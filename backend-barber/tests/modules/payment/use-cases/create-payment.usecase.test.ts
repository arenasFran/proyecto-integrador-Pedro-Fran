import { CreatePaymentUseCase } from '../../../../src/application/use-cases/payment/CreatePaymentUseCase';
import { Payment } from '../../../../src/domain/entities/Payment';
import {
  makeMockPaymentRepository,
  makeMockPaymentService,
} from '../../../test-utils/mocks';

jest.mock('../../../../src/infrastructure/config/env', () => ({
  getConfig: jest.fn().mockReturnValue({
    mpNotificationUrl: 'https://ngrok.test/api/payments/webhook',
    frontendUrl: 'http://localhost:5173',
  }),
}));

describe('CreatePaymentUseCase', () => {
  let paymentRepository: ReturnType<typeof makeMockPaymentRepository>;
  let paymentService: ReturnType<typeof makeMockPaymentService>;
  let useCase: CreatePaymentUseCase;

  const dto = {
    type: 'membership' as const,
    referenceId: 'user-1',
    amount: 399,
    userId: 'user-1',
    items: [{ title: 'Membresía Mensual', quantity: 1, unitPrice: 399 }],
    payerEmail: 'user@test.com',
  };

  beforeEach(() => {
    paymentRepository = makeMockPaymentRepository();
    paymentService = makeMockPaymentService();

    paymentService.createPreference.mockResolvedValue({
      preferenceId: 'pref-123',
      initPoint: 'https://mercadopago.com/init',
      sandboxInitPoint: 'https://sandbox.mercadopago.com/init',
    });

    paymentRepository.save.mockImplementation(async (payment: Payment) => {
      Object.defineProperty(payment, 'id', { value: 'pay-generated-id', writable: false });
      return payment;
    });

    useCase = new CreatePaymentUseCase(
      paymentRepository as any,
      paymentService as any,
    );
  });

  it('debe crear un Payment con status pending y guardarlo', async () => {
    const result = await useCase.execute(dto);

    expect(paymentRepository.save).toHaveBeenCalledTimes(2);
    const firstSaved = (paymentRepository.save as jest.Mock).mock.calls[0][0];
    expect(firstSaved.status).toBe('pending');
    expect(firstSaved.type).toBe('membership');
    expect(firstSaved.referenceId).toBe('user-1');
    expect(firstSaved.amount).toBe(399);
    expect(firstSaved.userId).toBe('user-1');
  });

  it('debe llamar a createPreference con los parámetros correctos', async () => {
    await useCase.execute(dto);

    expect(paymentService.createPreference).toHaveBeenCalledTimes(1);
    const params = (paymentService.createPreference as jest.Mock).mock.calls[0][0];
    expect(params.items).toEqual(dto.items);
    expect(params.externalReference).toBe('pay-generated-id');
    expect(params.notificationUrl).toBe('https://ngrok.test/api/payments/webhook');
    expect(params.backUrls).toEqual({
      success: 'http://localhost:5173/payment/result?status=success',
      failure: 'http://localhost:5173/payment/result?status=failure',
      pending: 'http://localhost:5173/payment/result?status=pending',
    });
    expect(params.payerEmail).toBe('user@test.com');
    expect(params.idempotencyKey).toBeDefined();
    expect(typeof params.idempotencyKey).toBe('string');
  });

  it('debe asignar el mpPreferenceId al payment y guardarlo de nuevo', async () => {
    await useCase.execute(dto);

    expect(paymentRepository.save).toHaveBeenCalledTimes(2);
    const secondSaved = (paymentRepository.save as jest.Mock).mock.calls[1][0];
    expect(secondSaved.mpPreferenceId).toBe('pref-123');
  });

  it('debe retornar preferenceId, initPoint, sandboxInitPoint y paymentId', async () => {
    const result = await useCase.execute(dto);

    expect(result).toEqual({
      preferenceId: 'pref-123',
      initPoint: 'https://mercadopago.com/init',
      sandboxInitPoint: 'https://sandbox.mercadopago.com/init',
      paymentId: 'pay-generated-id',
    });
  });

  it('debe pasar el externalReference como el id del payment persistido', async () => {
    paymentRepository.save.mockImplementation(async (payment: Payment) => {
      Object.defineProperty(payment, 'id', { value: 'pay-custom-42', writable: false });
      return payment;
    });

    await useCase.execute(dto);

    const params = (paymentService.createPreference as jest.Mock).mock.calls[0][0];
    expect(params.externalReference).toBe('pay-custom-42');
  });

  it('debe funcionar sin payerEmail', async () => {
    const dtoWithoutEmail = { ...dto, payerEmail: undefined };
    await useCase.execute(dtoWithoutEmail);

    const params = (paymentService.createPreference as jest.Mock).mock.calls[0][0];
    expect(params.payerEmail).toBeUndefined();
  });

  it('debe lanzar error si createPreference falla', async () => {
    paymentService.createPreference.mockRejectedValue(new Error('MP error'));

    await expect(useCase.execute(dto)).rejects.toThrow('MP error');
  });
});
