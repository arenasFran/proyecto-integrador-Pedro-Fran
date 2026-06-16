export type ResetPasswordDTO = {
  token: string;
  password: string;
  repeatPassword: string;
  email: string;
};
