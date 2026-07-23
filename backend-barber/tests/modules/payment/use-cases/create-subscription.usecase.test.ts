import { CreateSubscriptionUseCase } from '../../../../src/application/use-cases/payment/CreateSubscriptionUseCase';
import { makeMockPaymentService } from '../../../test-utils/mocks';

jest.mock('../../../../src/infrastructure/config/env', () => ({
  getConfig: jest.fn().mockReturnValue({
    membershipPriceUyu: 399,
    frontendUrl: 'http://localhost:5173',
  }),
}));

describe('CreateSubscriptionUseCase', () => {
  let paymentService: ReturnType<typeof makeMockPaymentService>;
  let useCase: CreateSubscriptionUseCase;

  const dto = {
    userId: 'user-1',
    payerEmail: 'user@test.com',
  };

  beforeEach(() => {
    paymentService = makeMockPaymentService();
    paymentService.createPreapproval.mockResolvedValue({
      preapprovalId: 'preapp-123',
      initPoint: 'https://mercadopago.com/subscribe',
    });

    useCase = new CreateSubscriptionUseCase(paymentService as any);
  });

  it('debe llamar a createPreapproval con los parámetros correctos', async () => {
    await useCase.execute(dto);

    expect(paymentService.createPreapproval).toHaveBeenCalledTimes(1);
    const params = (paymentService.createPreapproval as jest.Mock).mock.calls[0][0];
    expect(params.externalReference).toBe('user-1');
    expect(params.payerEmail).toBe('user@test.com');
    expect(params.transactionAmount).toBe(399);
    expect(params.reason).toBe('Membresía Mensual');
    expect(params.backUrl).toBe('http://localhost:5173/membership/subscription/success');
  });

  it('debe retornar preapprovalId e initPoint', async () => {
    const result = await useCase.execute(dto);

    expect(result).toEqual({
      preapprovalId: 'preapp-123',
      initPoint: 'https://mercadopago.com/subscribe',
    });
  });

  it('debe usar el membershipPriceUyu del config', async () => {
    const { getConfig } = require('../../../../src/infrastructure/config/env');
    (getConfig as jest.Mock).mockReturnValue({
      membershipPriceUyu: 500,
      frontendUrl: 'http://localhost:5173',
    });

    await useCase.execute(dto);

    const params = (paymentService.createPreapproval as jest.Mock).mock.calls[0][0];
    expect(params.transactionAmount).toBe(500);
  });

  it('debe lanzar error si createPreapproval falla', async () => {
    paymentService.createPreapproval.mockRejectedValue(new Error('MP error'));

    await expect(useCase.execute(dto)).rejects.toThrow('MP error');
  });
});
