import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import { PasswordInput, Button, PasswordStrength } from '../../../../components/common';
import { useFormValidation } from '../../../../hooks/useFormValidation';
import { useResetPasswordMutation } from '../../../../services/authApi';
import type { ResetPasswordFormData } from '../../../../types/auth';

interface ResetPasswordFormProps {
  onSuccess?: () => void;
  email: string;
}

const initialValues: ResetPasswordFormData = {
  token: '',
  password: '',
  repeatPassword: '',
  email: '',
};

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onSuccess, email }) => {
  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);

  const formInit = { ...initialValues, email };
  const { values, getFieldProps, validateAll, touched, errors } = useFormValidation(formInit);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!resetPasswordSuccess) return;
    const timeoutId = window.setTimeout(() => {
      onSuccessRef.current?.();
    }, 2000);
    return () => window.clearTimeout(timeoutId);
  }, [resetPasswordSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateAll();
    if (!isValid) return;

    try {
      await resetPassword({
        token: values.token,
        password: values.password,
        repeatPassword: values.repeatPassword,
        email: values.email,
      }).unwrap();
      setResetPasswordSuccess(true);
    } catch {
      // error handled via mutation result
    }
  };

  if (resetPasswordSuccess) {
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
        <h3 className="text-[20px] font-bold text-white mb-2">¡Contraseña actualizada!</h3>
        <p className="text-[14px] text-[#8A8A8A] text-center max-w-xs">
          Tu contraseña ha sido restablecida exitosamente
        </p>
      </motion.div>
    );
  }

  const errorMessage = error ? ((error as { data?: string }).data ?? 'Error al restablecer contraseña') : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <PasswordInput
          label="Token de recuperación"
          placeholder="Ingresa el token recibido por email"
          {...getFieldProps('token')}
          required
          error={touched.token ? errors.token : undefined}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <PasswordInput
          label="Nueva contraseña"
          placeholder="Ingresa tu nueva contraseña"
          {...getFieldProps('password')}
          required
          error={touched.password ? errors.password : undefined}
        />
        {values.password && <PasswordStrength password={values.password} />}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <PasswordInput
          label="Confirmar contraseña"
          placeholder="Confirma tu nueva contraseña"
          {...getFieldProps('repeatPassword')}
          required
          error={touched.repeatPassword ? errors.repeatPassword : undefined}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {errorMessage && (
          <p className="text-[12px] text-red-500 text-center mb-3">{errorMessage}</p>
        )}
        <Button
          type="submit"
          loading={isLoading}
          icon={FiArrowRight}
          iconPosition="right"
          className="w-full"
        >
          Restablecer contraseña
        </Button>
      </motion.div>
    </form>
  );
};
