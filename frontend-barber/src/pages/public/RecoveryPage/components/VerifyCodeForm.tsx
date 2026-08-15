import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';
import { Input, Button } from '../../../../components/common';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { useFormValidation } from '../../../../hooks/useFormValidation';
import { useVerifyResetCodeMutation } from '../../../../services/authApi';
import type { VerifyResetCodeFormData } from '../../../../types/auth';

interface VerifyCodeFormProps {
  email: string;
  onSuccess?: (code: string) => void;
}

const initialValues: VerifyResetCodeFormData = {
  email: '',
  code: '',
};

export const VerifyCodeForm: React.FC<VerifyCodeFormProps> = ({ email, onSuccess }) => {
  const [verifyResetCode, { isLoading, error }] = useVerifyResetCodeMutation();
  const submittedCodeRef = useRef('');

  const formInit = { ...initialValues, email };
  const { values, getFieldProps, validateAll, touched, errors } = useFormValidation(formInit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = validateAll();
    if (!isValid) return;

    submittedCodeRef.current = values.code;
    try {
      await verifyResetCode({ email: values.email, code: values.code }).unwrap();
      onSuccess?.(values.code);
    } catch {
      // error handled via mutation result
    }
  };

  const errorMessage = error ? getErrorMessage(error, 'Error al verificar el código') : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Input
          label="Código de recuperación"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Ingresa el código de 6 dígitos"
          {...getFieldProps('code')}
          required
          error={touched.code ? errors.code : undefined}
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
          Verificar código
        </Button>
      </motion.div>
    </form>
  );
};
