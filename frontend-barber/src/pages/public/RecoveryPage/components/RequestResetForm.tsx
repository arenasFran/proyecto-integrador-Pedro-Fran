import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';
import { Input, Button } from '../../../../components/common';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { useFormValidation } from '../../../../hooks/useFormValidation';
import { useRequestResetMutation } from '../../../../services/authApi';
import type { RequestResetFormData } from '../../../../types/auth';

interface RequestResetFormProps {
  onSuccess?: (email: string) => void;
}

const initialValues: RequestResetFormData = {
  email: '',
};

export const RequestResetForm: React.FC<RequestResetFormProps> = ({ onSuccess }) => {
  const [requestReset, { isLoading, error }] = useRequestResetMutation();
  const submittedEmailRef = useRef('');

  const { getFieldProps, validateAll, touched, errors, values: formValues } = useFormValidation(initialValues);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateAll();
    if (!isValid) return;

    submittedEmailRef.current = formValues.email;
    try {
      await requestReset({ email: formValues.email }).unwrap();
      onSuccess?.(formValues.email);
    } catch {
      // error handled via mutation result
    }
  };

  const errorMessage = error ? getErrorMessage(error, 'Error al solicitar recuperación') : null;

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
          Enviar instrucciones
        </Button>
      </motion.div>

      <p className="text-[12px] text-[#8A8A8A] text-center">
        Te enviaremos un código de 6 dígitos para restablecer tu contraseña
      </p>
    </form>
  );
};
