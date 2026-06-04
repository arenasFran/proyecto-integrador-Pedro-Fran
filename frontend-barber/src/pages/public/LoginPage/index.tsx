import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { MdContentCut } from 'react-icons/md';
import { Button, Input, PasswordInput } from '../../../components/common';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  clearAuthState,
  googleLoginThunk,
  sendTwoFactorCodeThunk,
  verifyTwoFactorCodeThunk,
} from '../../../store/slices/authSlice';
import type { LoginFormData, TwoFactorCodeFormData } from '../../../types/auth';
import { getTokenKind } from '../../../utils/token';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const credentialsInitialValues: LoginFormData = {
  email: '',
  password: '',
};

const codeInitialValues: TwoFactorCodeFormData = {
  token: '',
};

export const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error, loginSuccess, loginToken, twoFactorSendSuccess, twoFactorPendingEmail } =
    useAppSelector((state) => state.auth);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const googleInitializedRef = useRef(false);

  const {
    values: credentialsValues,
    errors: credentialsErrors,
    touched: credentialsTouched,
    validateAll: validateCredentials,
    getFieldProps: getCredentialsFieldProps,
  } = useFormValidation(credentialsInitialValues as unknown as Record<string, string>);

  const {
    values: codeValues,
    errors: codeErrors,
    touched: codeTouched,
    validateAll: validateCode,
    getFieldProps: getCodeFieldProps,
    resetForm: resetCodeForm,
  } = useFormValidation(codeInitialValues as unknown as Record<string, string>);

  const isCodeStep = Boolean(twoFactorPendingEmail);

  useEffect(() => {
    if (!isCodeStep) {
      resetCodeForm();
    }
  }, [isCodeStep, resetCodeForm]);

  useEffect(() => {
    return () => {
      dispatch(clearAuthState());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!loginToken) return;
    localStorage.setItem('authToken', loginToken);
    const role = getTokenKind(loginToken);
    if (role === 'Admin') {
      navigate('/admin/profesionales');
      return;
    }
    navigate('/');
  }, [loginToken, navigate]);

  useEffect(() => {
    if (isCodeStep || !googleClientId || googleInitializedRef.current) return;

    const initializeGoogleButton = () => {
      if (!googleButtonRef.current || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (!response.credential) return;
          dispatch(googleLoginThunk({ token: response.credential }));
        },
      });
      googleInitializedRef.current = true;
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: googleButtonRef.current.clientWidth || 320,
        shape: 'rectangular',
        logo_alignment: 'left',
        locale: 'es',
      });
    };

    if (window.google) {
      initializeGoogleButton();
      return;
    }

    const scriptId = 'google-identity-services';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', initializeGoogleButton, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleButton;
    document.body.appendChild(script);
  }, [dispatch, googleClientId, isCodeStep]);

  const handleCredentialsSubmit = () => {
    const isValid = validateCredentials();
    if (!isValid) return;

    dispatch(
      sendTwoFactorCodeThunk({
        email: credentialsValues.email,
        password: credentialsValues.password,
      })
    );
  };

  const handleCodeSubmit = () => {
    if (!twoFactorPendingEmail) return;
    const isValid = validateCode();
    if (!isValid) return;

    dispatch(
      verifyTwoFactorCodeThunk({
        email: twoFactorPendingEmail,
        code: codeValues.token,
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCodeStep) {
      handleCodeSubmit();
      return;
    }
    handleCredentialsSubmit();
  };

  const handleBackToCredentials = () => {
    dispatch(clearAuthState());
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF5C00]/10 rounded-2xl mb-4">
            <MdContentCut className="w-8 h-8 text-[#FF5C00]" />
          </div>
          <h1 className="text-[32px] font-extrabold text-white tracking-tight mb-2">
            Iniciar sesión
          </h1>
          <p className="text-[14px] text-[#8A8A8A]">
            {isCodeStep ? 'Ingresa el código de verificación' : 'Bienvenido de nuevo'}
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-[#121212] border border-[#282828] rounded-[24px] p-6"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {!isCodeStep ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Input
                    label="Correo electrónico"
                    type="email"
                    placeholder="Ingresa tu correo"
                    {...getCredentialsFieldProps('email')}
                    required
                    error={credentialsTouched.email ? credentialsErrors.email : undefined}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <PasswordInput
                    label="Contraseña"
                    placeholder="Ingresa tu contraseña"
                    {...getCredentialsFieldProps('password')}
                    required
                    error={credentialsTouched.password ? credentialsErrors.password : undefined}
                  />
                </motion.div>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[12px] text-[#8A8A8A] text-center"
                >
                  Código enviado a <span className="text-white">{twoFactorPendingEmail}</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Input
                    label="Código de verificación"
                    type="text"
                    placeholder="Ingresa el código de 6 dígitos"
                    {...getCodeFieldProps('token')}
                    required
                    error={codeTouched.token ? codeErrors.token : undefined}
                  />
                </motion.div>
              </>
            )}

            {error && (
              <p className="text-[12px] text-red-500 text-center">{error}</p>
            )}
            {twoFactorSendSuccess && (
              <p className="text-[12px] text-[#22C55E] text-center">{twoFactorSendSuccess}</p>
            )}
            {loginSuccess && (
              <p className="text-[12px] text-[#22C55E] text-center">{loginSuccess}</p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col gap-2"
            >
              <Button type="submit" loading={isLoading} className="w-full">
                {isCodeStep ? 'Verificar código' : 'Enviar código de verificación'}
              </Button>
              {isCodeStep && (
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleBackToCredentials}
                >
                  Volver
                </Button>
              )}
            </motion.div>

            {!isCodeStep && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#282828]" />
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#8A8A8A]">
                    o
                  </span>
                  <div className="h-px flex-1 bg-[#282828]" />
                </div>
                <div ref={googleButtonRef} className="flex justify-center" />
                {!googleClientId && (
                  <p className="text-[11px] text-[#8A8A8A] text-center">
                    Configurá VITE_GOOGLE_CLIENT_ID para usar Google Sign-In.
                  </p>
                )}
              </div>
            )}
          </form>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-6 text-center">
          <p className="text-[14px] text-[#8A8A8A]">
            ¿No tienes cuenta?{' '}
            <Link
              to="/register"
              className="text-[#FF5C00] font-medium hover:text-[#FF5C00]/80 transition-colors"
            >
              Crear cuenta
            </Link>
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-4 text-center">
          <Link
            to="/recovery"
            className="text-[12px] text-[#8A8A8A] hover:text-white transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </motion.div>
      </motion.div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF5C00]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#FF5C00]/3 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default LoginPage;