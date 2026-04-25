export interface IUserInput {
  email: string;
  password?: string;
  name: string;
  lastname: string;
  phone?: string;
  role?: 'cliente' | 'empleado' | 'admin'
  authProvider?: 'local' | 'google'
  googleId?: string
}