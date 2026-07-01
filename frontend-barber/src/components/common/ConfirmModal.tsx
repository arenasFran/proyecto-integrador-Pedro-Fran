import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6"
      >
        <h3 className="text-[18px] font-bold text-white mb-2">{title}</h3>
        <p className="text-[13px] text-[#8A8A8A] mb-6">{message}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            loading={loading}
            variant={variant === 'danger' ? 'danger' : 'primary'}
          >
            {confirmText}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
