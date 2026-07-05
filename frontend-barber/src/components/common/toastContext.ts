import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export { ToastContext };
export type { ToastContextValue };
