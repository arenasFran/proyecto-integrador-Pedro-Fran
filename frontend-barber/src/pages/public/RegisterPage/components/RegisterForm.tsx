import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { Input, PasswordInput, Button } from '../../../../components/common';
import { useFormValidation } from '../../../../hooks/useFormValidation';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { useRegisterMutation } from '../../../../services/authApi';
import type { RegisterFormData } from '../../../../types/auth';
import { legalConfig } from '../../../../constants/legal';

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
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptanceError, setAcceptanceError] = useState(false);

  const { values, errors, touched, validateAll, getFieldProps } = useFormValidation(initialValues);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateAll();
    if (!acceptedLegal) {
      setAcceptanceError(true);
      return;
    }
    setAcceptanceError(false);
    if (!isValid) return;

    try {
      await register({
        email: values.email,
        password: values.password,
        repeatPassword: values.repeatPassword,
        name: values.name,
        lastname: values.lastname,
        phone: values.phone,
        termsVersion: legalConfig.termsVersion,
        privacyVersion: legalConfig.privacyVersion,
      }).unwrap();
      navigate('/login', { state: { toast: 'Registro exitoso. Ya podés iniciar sesión.', toastType: 'success' } });
    } catch {
      // error handled via mutation result
    }
  };

  const errorMessage = error ? getErrorMessage(error, 'Error al registrar') : null;

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
        placeholder="598 91 234 567"
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

      <PasswordInput
        label="Confirmar"
        placeholder="Repite tu contraseña"
        {...getFieldProps('repeatPassword')}
        required
        error={touched.repeatPassword ? errors.repeatPassword : undefined}
      />

      <label className="flex items-start gap-2.5 mt-1 cursor-pointer">
        <input
          type="checkbox"
          checked={acceptedLegal}
          onChange={(e) => {
            setAcceptedLegal(e.target.checked);
            if (e.target.checked) setAcceptanceError(false);
          }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF5C00]"
        />
        <span className="text-[12px] leading-snug text-[#8A8A8A]">
          He leído y acepto los{' '}
          <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-[#FF5C00] hover:underline">
            Términos y Condiciones
          </a>{' '}
          y la{' '}
          <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-[#FF5C00] hover:underline">
            Política de Privacidad
          </a>
          .
        </span>
      </label>
      {acceptanceError && (
        <p className="text-[12px] text-red-500">Debés aceptar los Términos y Condiciones y la Política de Privacidad.</p>
      )}

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
