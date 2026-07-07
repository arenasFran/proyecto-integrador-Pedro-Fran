import { act, renderHook } from '@testing-library/react';
import { useFormValidation } from './useFormValidation';
import { ERROR_MESSAGES } from '../constants/validation';

const initialValues = {
  email: '',
  password: '',
  repeatPassword: '',
  name: '',
  lastname: '',
  phone: '',
  token: '',
};

const validValues = {
  email: 'test@example.com',
  password: 'Password1!',
  repeatPassword: 'Password1!',
  name: 'John',
  lastname: 'Doe',
  phone: '598 91 234 567',
  token: '123456',
};

const createChangeEvent = (value: string) => ({
  target: { value },
}) as React.ChangeEvent<HTMLInputElement>;

describe('useFormValidation', () => {
  it('initializes values, errors, and touched', () => {
    const { result } = renderHook(() => useFormValidation(initialValues));

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });

  it('updates values on handleChange', () => {
    const { result } = renderHook(() => useFormValidation(initialValues));

    act(() => {
      result.current.handleChange('email')(createChangeEvent('test@example.com'));
    });

    expect(result.current.values.email).toBe('test@example.com');
  });

  it('does not validate on change when field is not touched', () => {
    const { result } = renderHook(() => useFormValidation(initialValues));

    act(() => {
      result.current.handleChange('email')(createChangeEvent('invalid-email'));
    });

    expect(result.current.errors.email).toBeUndefined();
  });

  it('validates on blur and marks field as touched', () => {
    const { result } = renderHook(() => useFormValidation(initialValues));

    act(() => {
      result.current.handleChange('email')(createChangeEvent('invalid-email'));
    });

    act(() => {
      result.current.handleBlur('email')();
    });

    expect(result.current.touched.email).toBe(true);
    expect(result.current.errors.email).toBe(ERROR_MESSAGES.email);
  });

  it('revalidates on change after field is touched', () => {
    const { result } = renderHook(() => useFormValidation(initialValues));

    act(() => {
      result.current.handleChange('email')(createChangeEvent('invalid-email'));
      result.current.handleBlur('email')();
    });

    act(() => {
      result.current.handleChange('email')(createChangeEvent('valid@email.com'));
    });

    expect(result.current.errors.email).toBeUndefined();
  });

  it('validateAll returns false and marks all fields as touched on errors', () => {
    const { result } = renderHook(() => useFormValidation(initialValues));

    let isValid = true;
    act(() => {
      isValid = result.current.validateAll();
    });

    expect(isValid).toBe(false);
    expect(result.current.touched).toEqual({
      email: true,
      password: true,
      repeatPassword: true,
      name: true,
      lastname: true,
      phone: true,
      token: true,
    });
    expect(result.current.errors.email).toBe(ERROR_MESSAGES.required);
    expect(result.current.errors.password).toBe(ERROR_MESSAGES.required);
  });

  it('validateAll returns true when all fields are valid', () => {
    const { result } = renderHook(() => useFormValidation(initialValues));

    act(() => {
      result.current.setValues(validValues);
    });

    let isValid = false;
    act(() => {
      isValid = result.current.validateAll();
    });

    expect(isValid).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it('detects password mismatch for repeatPassword', () => {
    const { result } = renderHook(() => useFormValidation(initialValues));

    act(() => {
      result.current.setValues({
        ...initialValues,
        password: 'Password1!',
        repeatPassword: 'Password2!',
      });
    });

    act(() => {
      result.current.handleBlur('repeatPassword')();
    });

    expect(result.current.errors.repeatPassword).toBe(ERROR_MESSAGES.passwordMismatch);
  });

  it('resetForm restores initial values and clears state', () => {
    const { result } = renderHook(() => useFormValidation(initialValues));

    act(() => {
      result.current.setValues(validValues);
      result.current.setErrors({ email: ERROR_MESSAGES.email });
      result.current.handleBlur('email')();
    });

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });

  it('getFieldProps returns value and handlers', () => {
    const { result } = renderHook(() => useFormValidation(initialValues));

    const props = result.current.getFieldProps('email');
    expect(props.value).toBe('');
    expect(typeof props.onChange).toBe('function');
    expect(typeof props.onBlur).toBe('function');

    act(() => {
      props.onChange(createChangeEvent('user@test.com'));
    });

    expect(result.current.values.email).toBe('user@test.com');
  });

  it('validates specific fields correctly', () => {
    const { result } = renderHook(() => useFormValidation(initialValues));

    act(() => {
      result.current.setValues({
        email: 'bad',
        password: '123',
        repeatPassword: '1234',
        name: 'Jo',
        lastname: 'Do',
        phone: 'abc',
        token: '123',
      });
    });

    act(() => {
      result.current.validateAll();
    });

    expect(result.current.errors.email).toBe(ERROR_MESSAGES.email);
    expect(result.current.errors.password).toBe(ERROR_MESSAGES.password);
    expect(result.current.errors.repeatPassword).toBe(ERROR_MESSAGES.passwordMismatch);
    expect(result.current.errors.name).toBe(ERROR_MESSAGES.name);
    expect(result.current.errors.lastname).toBe(ERROR_MESSAGES.lastname);
    expect(result.current.errors.phone).toBe(ERROR_MESSAGES.phone);
    expect(result.current.errors.token).toBe(ERROR_MESSAGES.token);
  });
});
