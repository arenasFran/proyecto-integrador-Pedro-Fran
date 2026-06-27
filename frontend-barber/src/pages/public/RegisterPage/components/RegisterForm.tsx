import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { Input, PasswordInput, Button, PasswordStrength } from '../../../../components/common';
import { useFormValidation } from '../../../../hooks/useFormValidation';
import { useRegisterMutation } from '../../../../services/authApi';
import type { RegisterFormData } from '../../../../types/auth';

const initialValues: RegisterFormData = {
  email: '',
  password: '',
  repeatPassword: '',
  name: '',
  lastname: '',
  phone: '',
};

export const RegisterForm: React.FC = () => {
  const [register, { isLoading, error }] = useRegisterMutation();
  const navigate = useNavigate();

  const { values, errors, touched, validateAll, getFieldProps } = useFormValidation(initialValues);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateAll();
    if (!isValid) return;

    try {
      await register({
        email: values.email,
        password: values.password,
        repeatPassword: values.repeatPassword,
        name: values.name,
        lastname: values.lastname,
        phone: values.phone,
      }).unwrap();
      navigate('/login', { state: { toast: 'Registro exitoso. Ya podés iniciar sesión.', toastType: 'success' } });
    } catch {
      // error handled via mutation result
    }
  };

  const errorMessage = error ? ((error as { data?: string }).data ?? 'Error al registrar') : null;

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

      {errorMessage && (
        <p className="text-[12px] text-red-500 text-center">{errorMessage}</p>
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
