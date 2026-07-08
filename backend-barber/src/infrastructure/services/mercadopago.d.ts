import 'mercadopago/dist/clients/payment/commonTypes';

declare module 'mercadopago/dist/clients/payment/commonTypes' {
  interface PaymentResponse {
    preapproval_id?: string;
  }
}
