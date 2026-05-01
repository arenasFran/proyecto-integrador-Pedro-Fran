import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import { Input, Button } from '../../../../components/common';
import { useFormValidation } from '../../../../hooks/useFormValidation';
import type { RequestResetFormData } from '../../../../types/auth';

interface RequestResetFormProps {
  onSuccess?: () => void;
}

const initialValues: RequestResetFormData = {
  email: '',
};

export const RequestResetForm: React.FC<RequestResetFormProps> = ({ onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { getFieldProps, validateAll, touched, errors } = useFormValidation(initialValues as unknown as Record<string, string>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateAll();
    if (!isValid) return;

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    setIsSuccess(true);
    setTimeout(() => {
      onSuccess?.();
    }, 2000);
  };

  if (isSuccess) {
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