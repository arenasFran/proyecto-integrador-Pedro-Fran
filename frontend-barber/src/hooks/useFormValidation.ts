import { useState, useCallback } from 'react';
import type { FormErrors } from '../types/auth';
import { VALIDATION_RULES, ERROR_MESSAGES } from '../constants/validation';

const validationSchema: Record<string, (value: string, allValues?: Record<string, string>) => string | undefined> = {
  email: (value) => {
    if (!value) return ERROR_MESSAGES.required;
    if (!VALIDATION_RULES.email.pattern.test(value)) return ERROR_MESSAGES.email;
    return undefined;
  },
  password: (value) => {
    if (!value) return ERROR_MESSAGES.required;
    if (value.length < VALIDATION_RULES.password.minLength) return ERROR_MESSAGES.password;
    if (!VALIDATION_RULES.password.uppercase.test(value)) return VALIDATION_RULES.password.uppercaseMessage;
    if (!VALIDATION_RULES.password.lowercase.test(value)) return VALIDATION_RULES.password.lowercaseMessage;
    if (!VALIDATION_RULES.password.digit.test(value)) return VALIDATION_RULES.password.digitMessage;
    return undefined;
  },
  repeatPassword: (value, allValues) => {
    if (!value) return ERROR_MESSAGES.required;
    if (allValues?.password && value !== allValues.password) return ERROR_MESSAGES.passwordMismatch;
    return undefined;
  },
  name: (value) => {
    if (!value) return ERROR_MESSAGES.required;
    if (value.length < VALIDATION_RULES.name.minLength) return ERROR_MESSAGES.name;
    return undefined;
  },
  lastname: (value) => {
    if (!value) return ERROR_MESSAGES.required;
    if (value.length < VALIDATION_RULES.lastname.minLength) return ERROR_MESSAGES.lastname;
    return undefined;
  },
  phone: (value) => {
    if (!value) return ERROR_MESSAGES.required;
    if (!VALIDATION_RULES.phone.pattern.test(value)) return ERROR_MESSAGES.phone;
    return undefined;
  },
  token: (value) => {
    if (!value) return ERROR_MESSAGES.required;
    if (value.length < VALIDATION_RULES.token.minLength) return ERROR_MESSAGES.token;
    return undefined;
  },
};

export function useFormValidation(initialValues: Record<string, string>) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback(
    (field: string, value: string): string | undefined => {
      const validator = validationSchema[field];
      if (validator) {
        return validator(value, values);
      }
      return undefined;
    },
    [values]
  );

  const handleChange = useCallback(
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setValues((prev) => ({ ...prev, [field]: value }));
      
      if (touched[field]) {
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    },
    [validateField, touched]
  );

  const handleBlur = useCallback(
    (field: string) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validateField(field, values[field]);
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    [validateField, values]
  );

  const validateAll = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(values).forEach((field) => {
      const error = validateField(field, values[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(
      Object.keys(values).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Record<string, boolean>
      )
    );

    return isValid;
  }, [validateField, values]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const getFieldProps = useCallback(
    (field: string) => ({
      value: values[field] || '',
      onChange: handleChange(field),
      onBlur: handleBlur(field),
    }),
    [values, handleChange, handleBlur]
  );

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    resetForm,
    getFieldProps,
    setValues,
    setErrors,
  };
}