import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiArrowRight } from 'react-icons/fi';
import { Input, PasswordInput, Button, PasswordStrength } from '../../../../components/common';
import { useFormValidation } from '../../../../hooks/useFormValidation';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { registerThunk, clearAuthState } from '../../../../store/slices/authSlice';
import type { RegisterFormData } from '../../../../types/auth';

interface RegisterFormProps {
  onSuccess?: () => void;
}

const initialValues: RegisterFormData = {
  email: '',
  password: '',
  repeatPassword: '',
  name: '',
  lastname: '',
  phone: '',
};

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const dispatch = useAppDispatch();
  const { isLoading, error, registerSuccess } = useAppSelector((state) => state.auth);

  const { values, errors, touched, validateAll, getFieldProps } = useFormValidation(initialValues );

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!registerSuccess) return;
    const timeoutId = window.setTimeout(() => {
      onSuccessRef.current?.();
    }, 2000);
    return () => window.clearTimeout(timeoutId);
  }, [registerSuccess]);

  useEffect(() => {
    return () => {
      dispatch(clearAuthState());
    };
  }, [dispatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateAll();
    if (!isValid) return;

    dispatch(registerThunk({
      email: values.email,
      password: values.password,
      repeatPassword: values.repeatPassword,
      name: values.name,
      lastname: values.lastname,
      phone: values.phone,
    }));
  };

  if (registerSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
          className="w-14 h-14 rounded-full bg-[#22C55E]/20 flex items-center justify-center mb-4"
        >
          <FiCheck className="w-7 h-7 text-[#22C55E]" />
        </motion.div>
        <h3 className="text-[18px] font-bold text-white mb-1">¡Registro exitoso!</h3>
        <p className="text-[12px] text-[#8A8A8A] text-center">
          Tu cuenta ha sido creada
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Nombre"
          type="text"
          placeholder="Nombre"
          {...getFieldProps('name')}
          required
          error={touched.name ? errors.name : undefined}
        />
        <Input
          label="Apellido"
          type="text"
          placeholder="Apellido"
          {...getFieldProps('lastname')}
          required
          error={touched.lastname ? errors.lastname : undefined}
        />
      </div>

      <Input
        label="Email"
        type="email"
        placeholder="correo@email.com"
        {...getFieldProps('email')}
        required
        error={touched.email ? errors.email : undefined}
      />

      <Input
        label="Teléfono"
        type="tel"
        placeholder="+54 9 11 1234 5678"
        {...getFieldProps('phone')}
        required
        error={touched.phone ? errors.phone : undefined}
      />

      <PasswordInput
        label="Contraseña"
        placeholder="Mínimo 8 caracteres, mayúscula, minúscula y número"
        {...getFieldProps('password')}
        required
        error={touched.password ? errors.password : undefined}
      />
      {values.password && <PasswordStrength password={values.password} />}

      <PasswordInput
        label="Confirmar"
        placeholder="Repite tu contraseña"
        {...getFieldProps('repeatPassword')}
        required
        error={touched.repeatPassword ? errors.repeatPassword : undefined}
      />

      {error && (
        <p className="text-[12px] text-red-500 text-center">{error}</p>
      )}

      <Button
        type="submit"
        loading={isLoading}
        icon={FiArrowRight}
        iconPosition="right"
        className="w-full mt-1"
      >
        Crear cuenta
      </Button>
    </form>
  );
};
