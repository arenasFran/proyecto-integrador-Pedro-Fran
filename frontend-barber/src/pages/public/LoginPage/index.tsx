import { motion } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PublicFooter } from '../../../components/client/PublicFooter';
import { Button, Input, PasswordInput, useToast } from '../../../components/common';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { authApi, useCompleteGoogleProfileMutation, useGoogleLoginMutation, useSendTwoFactorCodeMutation, useVerifyTwoFactorCodeMutation } from '../../../services/authApi';
import { useAppDispatch } from '../../../store/hooks';
import { logout } from '../../../store/slices/authSlice';
import type { LoginFormData, TwoFactorCodeFormData } from '../../../types/auth';
import { getErrorMessage } from '../../../utils/errorMessages';
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

const profileInitialValues = {
  name: '',
  lastname: '',
  phone: '',
};

export const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [sendTwoFactorCode, { isLoading: isSending }] = useSendTwoFactorCodeMutation();
  const [verifyTwoFactorCode, { isLoading: isVerifying }] = useVerifyTwoFactorCodeMutation();
  const [googleLoginMutation, { isLoading: isGoogleLoading }] = useGoogleLoginMutation();
  const [completeGoogleProfileMutation, { isLoading: isCompleting }] = useCompleteGoogleProfileMutation();

  const [twoFactorPendingEmail, setTwoFactorPendingEmail] = useState<string | null>(null);
  const [requiresProfileCompletion, setRequiresProfileCompletion] = useState<string | null>(null);
  const [profileCompletionName, setProfileCompletionName] = useState('');
  const [profileCompletionLastname, setProfileCompletionLastname] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const location = useLocation();
  const toastHandled = useRef(false);
  const returnUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    returnUrlRef.current = q.get('returnUrl');
  }, [location.search]);

  useEffect(() => {
    const state = location.state as { toast?: string; toastType?: 'success' | 'error' } | null;
    if (state?.toast && !toastHandled.current) {
      toastHandled.current = true;
      showToast(state.toast, state.toastType || 'success');
      window.history.replaceState({}, document.title);
    }
  }, [location.state, showToast]);

  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const googleInitializedRef = useRef(false);

  const {
    values: credentialsValues,
    errors: credentialsErrors,
    touched: credentialsTouched,
    validateAll: validateCredentials,
    getFieldProps: getCredentialsFieldProps,
  } = useFormValidation(credentialsInitialValues);

  const {
    values: codeValues,
    errors: codeErrors,
    touched: codeTouched,
    validateAll: validateCode,
    getFieldProps: getCodeFieldProps,
    resetForm: resetCodeForm,
  } = useFormValidation(codeInitialValues);

  const {
    values: profileValues,
    errors: profileErrors,
    touched: profileTouched,
    validateAll: validateProfile,
    getFieldProps: getProfileFieldProps,
    setValues: setProfileValues,
  } = useFormValidation(profileInitialValues);

  const isCodeStep = Boolean(twoFactorPendingEmail);
  const isLoading = isSending || isVerifying || isGoogleLoading || isCompleting;

  const prevIsCodeStep = useRef(isCodeStep);
  useEffect(() => {
    if (prevIsCodeStep.current && !isCodeStep) {
      resetCodeForm();
    }
    prevIsCodeStep.current = isCodeStep;
  }, [isCodeStep, resetCodeForm]);

  useEffect(() => {
    if (!requiresProfileCompletion) return;
    setProfileValues({
      name: profileCompletionName,
      lastname: profileCompletionLastname,
      phone: '',
    });
  }, [requiresProfileCompletion, profileCompletionName, profileCompletionLastname, setProfileValues]);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    try {
      const result = await googleLoginMutation({ token: credential }).unwrap();
      if ('requiresProfileCompletion' in result) {
        setRequiresProfileCompletion(result.partialToken);
        setProfileCompletionName(result.name || '');
        setProfileCompletionLastname(result.lastname || '');
        return;
      }
      if ('token' in result) {
        try {
          await dispatch(authApi.endpoints.getProfile.initiate(undefined, { forceRefetch: true }));
        } catch {
          // Profile fetch failed — navigate anyway
        }
        const role = getTokenKind(result.token);
        const target = returnUrlRef.current ?? (role === 'Admin' ? '/admin/dashboard' : '/mis-turnos');
        navigate(target, { replace: true });
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Error al iniciar sesión con Google');
      showToast(message, 'error');
    }
  }, [googleLoginMutation, dispatch, navigate, showToast]);

  useEffect(() => {
    if (isCodeStep || !googleClientId) return;
    if (googleInitializedRef.current) return;

    const scriptId = 'google-identity-services';
    let currentScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    let loadHandler: (() => void) | null = null;
    let aborted = false;

    const initializeGoogleButton = () => {
      if (aborted) return;
      if (!googleButtonRef.current || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (!response.credential) return;
          handleGoogleCredential(response.credential);
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

    if (!currentScript) {
      currentScript = document.createElement('script');
      currentScript.id = scriptId;
      currentScript.src = 'https://accounts.google.com/gsi/client';
      currentScript.async = true;
      currentScript.defer = true;
      document.body.appendChild(currentScript);
    }

    loadHandler = initializeGoogleButton;
    currentScript.addEventListener('load', loadHandler);

    return () => {
      aborted = true;
      if (currentScript && loadHandler) {
        currentScript.removeEventListener('load', loadHandler);
      }
    };
  }, [dispatch, googleClientId, isCodeStep, handleGoogleCredential]);

  const handleCredentialsSubmit = async () => {
    const isValid = validateCredentials();
    if (!isValid) return;

    setSuccessMessage(null);

    try {
      const result = await sendTwoFactorCode({
        email: credentialsValues.email,
        password: credentialsValues.password,
      }).unwrap();
      setTwoFactorPendingEmail(credentialsValues.email);
      setSuccessMessage(result.message);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Error al enviar el código'), 'error');
    }
  };

  const handleCodeSubmit = async () => {
    if (!twoFactorPendingEmail) return;
    const isValid = validateCode();
    if (!isValid) return;

    try {
      const result = await verifyTwoFactorCode({
        email: twoFactorPendingEmail,
        code: codeValues.token,
      }).unwrap();
      try {
        await dispatch(authApi.endpoints.getProfile.initiate(undefined, { forceRefetch: true }));
      } catch {
        // Profile fetch failed — navigate anyway
      }
      const role = getTokenKind(result.token);
      const target = returnUrlRef.current ?? (role === 'Admin' ? '/admin/dashboard' : '/mis-turnos');
      navigate(target, { replace: true });
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Error al verificar el código'), 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requiresProfileCompletion) {
      await handleProfileSubmit();
      return;
    }
    if (isCodeStep) {
      await handleCodeSubmit();
      return;
    }
    await handleCredentialsSubmit();
  };

  const handleResendCode = async () => {
    setSuccessMessage(null);
    try {
      const result = await sendTwoFactorCode({
        email: credentialsValues.email,
        password: credentialsValues.password,
      }).unwrap();
      setSuccessMessage(result.message);
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Error al reenviar el código'), 'error');
    }
  };

  const handleBackToCredentials = () => {
    setTwoFactorPendingEmail(null);
    setSuccessMessage(null);
    dispatch(logout());
  };

  const handleProfileSubmit = async () => {
    const isValid = validateProfile();
    if (!isValid) return;
    if (!requiresProfileCompletion) return;

    try {
      const result = await completeGoogleProfileMutation({
        partialToken: requiresProfileCompletion,
        name: profileValues.name,
        lastname: profileValues.lastname,
        phone: profileValues.phone,
      }).unwrap();
      setRequiresProfileCompletion(null);
      try {
        await dispatch(authApi.endpoints.getProfile.initiate(undefined, { forceRefetch: true }));
      } catch {
        // Profile fetch failed — navigate anyway
      }
      const role = getTokenKind(result.token);
      const target = returnUrlRef.current ?? (role === 'Admin' ? '/admin/dashboard' : '/mis-turnos');
      navigate(target, { replace: true });
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Error al completar el perfil'), 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          <motion.div variants={itemVariants} className="text-center mb-6">
            <img src="/logo-barberia.PNG" alt="Barbería SA" className="h-72 w-auto mx-auto mb-1" />
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
              {requiresProfileCompletion ? (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-1 text-center"
                  >
                    <span className="text-[14px] font-medium text-[#22C55E]">Registro con Google exitoso</span>
                    <span className="text-[12px] text-[#8A8A8A]">Solo falta un paso más: completá tus datos</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Input
                      label="Nombre"
                      type="text"
                      placeholder="Tu nombre"
                      {...getProfileFieldProps('name')}
                      required
                      error={profileTouched.name ? profileErrors.name : undefined}
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Input
                      label="Apellido (opcional)"
                      type="text"
                      placeholder="Tu apellido"
                      {...getProfileFieldProps('lastname')}
                      error={profileTouched.lastname ? profileErrors.lastname : undefined}
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Input
                      label="Teléfono"
                      type="tel"
                      placeholder="598 91 234 567"
                      {...getProfileFieldProps('phone')}
                      required
                      error={profileTouched.phone ? profileErrors.phone : undefined}
                    />
                  </motion.div>
                </>
              ) : !isCodeStep ? (
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
                    Código enviado al email registrado
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
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center"
                  >
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={isLoading}
                      className="text-[#FF5C00] text-[14px] font-medium hover:text-[#FF5C00]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reenviar código
                    </button>
                  </motion.div>
                </>
              )}

              {successMessage && (
                <p className="text-[12px] text-[#22C55E] text-center">{successMessage}</p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col gap-2"
              >
                <Button type="submit" loading={isLoading} className="w-full">
                  {requiresProfileCompletion ? 'Completar registro' : isCodeStep ? 'Verificar código' : 'Enviar código de verificación'}
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
                {requiresProfileCompletion && (
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      setRequiresProfileCompletion(null);
                      setProfileCompletionName('');
                      setProfileCompletionLastname('');
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </motion.div>

              {!isCodeStep && !requiresProfileCompletion && (
                <div className="flex flex-col gap-3 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#282828]" />
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[#8A8A8A]">
                      o
                    </span>
                    <div className="h-px flex-1 bg-[#282828]" />
                  </div>
                  <div ref={googleButtonRef} className="flex justify-center w-full overflow-hidden" />
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
      </div>

      <PublicFooter />
    </div>
  );
};

export default LoginPage;
