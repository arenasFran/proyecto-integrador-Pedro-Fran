import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { PasswordInput, Button, PasswordStrength } from '../../../../components/common';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { useFormValidation } from '../../../../hooks/useFormValidation';
import { useResetPasswordMutation } from '../../../../services/authApi';
import type { ResetPasswordFormData } from '../../../../types/auth';

interface ResetPasswordFormProps {
  email: string;
  initialToken?: string;
}

const initialValues: ResetPasswordFormData = {
  token: '',
  password: '',
  repeatPassword: '',
  email: '',
};

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ email, initialToken }) => {
  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();
  const navigate = useNavigate();

  const formInit = { ...initialValues, email, token: initialToken ?? '' };
  const { values, getFieldProps, validateAll, touched, errors } = useFormValidation(formInit);

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
      navigate('/login', { state: { toast: 'Contraseña actualizada exitosamente. Iniciá sesión.', toastType: 'success' } });
    } catch {
      // error handled via mutation result
    }
  };

  const errorMessage = error ? getErrorMessage(error, 'Error al restablecer contraseña') : null;

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
        <PasswordStrength password={values.password} />
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
