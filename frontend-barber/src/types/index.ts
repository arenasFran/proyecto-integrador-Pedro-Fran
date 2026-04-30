export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'barber' | 'client';
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}