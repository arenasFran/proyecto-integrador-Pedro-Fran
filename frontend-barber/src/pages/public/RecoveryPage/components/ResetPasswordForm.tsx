import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import { PasswordInput, Button, PasswordStrength } from '../../../../components/common';
import { useFormValidation } from '../../../../hooks/useFormValidation';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { resetPasswordThunk, clearAuthState } from '../../../../store/slices/authSlice';
import type { ResetPasswordFormData } from '../../../../types/auth';

interface ResetPasswordFormProps {
  onSuccess?: () => void;
}

const initialValues: ResetPasswordFormData = {
  token: '',
  password: '',
  repeatPassword: '',
};

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onSuccess }) => {
  const dispatch = useAppDispatch();
  const { isLoading, error, success } = useAppSelector((state) => state.auth);

  const { values, getFieldProps, validateAll, touched, errors } = useFormValidation(initialValues as unknown as Record<string, string>);

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

    dispatch(resetPasswordThunk({
      token: values.token,
      password: values.password,
      repeatPassword: values.repeatPassword,
    }));
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
        <h3 className="text-[20px] font-bold text-white mb-2">¡Contraseña actualizada!</h3>
        <p className="text-[14px] text-[#8A8A8A] text-center max-w-xs">
          Tu contraseña ha sido restablecida exitosamente
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
          Restablecer contraseña
        </Button>
      </motion.div>
    </form>
  );
};