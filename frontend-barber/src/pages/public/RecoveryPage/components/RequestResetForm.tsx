import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import { Input, Button } from '../../../../components/common';
import { useFormValidation } from '../../../../hooks/useFormValidation';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { requestResetThunk, clearAuthState } from '../../../../store/slices/authSlice';
import type { RequestResetFormData } from '../../../../types/auth';

interface RequestResetFormProps {
  onSuccess?: () => void;
}

const initialValues: RequestResetFormData = {
  email: '',
};

export const RequestResetForm: React.FC<RequestResetFormProps> = ({ onSuccess }) => {
  const dispatch = useAppDispatch();
  const { isLoading, error, success } = useAppSelector((state) => state.auth);

  const { getFieldProps, validateAll, touched, errors, values: formValues } = useFormValidation(initialValues as unknown as Record<string, string>);

  useEffect(() => {
    if (success) {
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    }
  }, [success, onSuccess]);

  useEffect(() => {
    return () => {
      dispatch(clearAuthState());
    };
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateAll();
    if (!isValid) return;

    dispatch(requestResetThunk({ email: formValues.email }));
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' as const, stiffness: 300, damping: 20, delay: 0.2 }}
          className="w-16 h-16 rounded-full bg-[#22C55E]/20 flex items-center justify-center mb-4"
        >
          <FiCheck className="w-8 h-8 text-[#22C55E]" />
        </motion.div>
        <h3 className="text-[20px] font-bold text-white mb-2">¡Enviado!</h3>
        <p className="text-[14px] text-[#8A8A8A] text-center max-w-xs">
          Si el correo existe, recibirás instrucciones para restablecer tu contraseña
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="Ingresa tu correo electrónico"
          {...getFieldProps('email')}
          required
          error={touched.email ? errors.email : undefined}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {error && (
          <p className="text-[12px] text-red-500 text-center mb-3">{error}</p>
        )}
        <Button
          type="submit"
          loading={isLoading}
          icon={FiArrowRight}
          iconPosition="right"
          className="w-full"
        >
          Enviar instrucciones
        </Button>
      </motion.div>

      <p className="text-[12px] text-[#8A8A8A] text-center">
        Te enviaremos un enlace para restablecer tu contraseña
      </p>
    </form>
  );
};