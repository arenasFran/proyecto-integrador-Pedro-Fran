import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiLock } from 'react-icons/fi';
import { RequestResetForm } from './components/RequestResetForm';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import { StepIndicator } from './components/StepIndicator';

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

export const RecoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');

  const handleRequestSuccess = (email: string) => {
    setResetEmail(email);
    setCurrentStep(2);
  };

  const handleResetSuccess = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        <motion.div variants={itemVariants} className="mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-[#8A8A8A] hover:text-white transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span className="text-[14px]">Volver al login</span>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF5C00]/10 rounded-2xl mb-4">
            <FiLock className="w-8 h-8 text-[#FF5C00]" />
          </div>
          <h1 className="text-[32px] font-extrabold text-white tracking-tight mb-2">
            Recuperar contraseña
          </h1>
          <p className="text-[14px] text-[#8A8A8A]">
            {currentStep === 1
              ? 'Ingresa tu email para recibir instrucciones'
              : 'Ingresa el token y nueva contraseña'}
          </p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <StepIndicator
            currentStep={currentStep}
            steps={[
              { label: 'Solicitar' },
              { label: 'Restablecer' },
            ]}
          />
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-[#121212] border border-[#282828] rounded-[24px] p-6"
        >
          {currentStep === 1 ? (
            <RequestResetForm onSuccess={handleRequestSuccess} />
          ) : (
            <ResetPasswordForm email={resetEmail} onSuccess={handleResetSuccess} />
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="mt-6 text-center">
          <p className="text-[14px] text-[#8A8A8A]">
            ¿No recibiste el email?{' '}
            <button
              onClick={() => setCurrentStep(1)}
              className="text-[#FF5C00] font-medium hover:text-[#FF5C00]/80 transition-colors"
            >
              Reenviar
            </button>
          </p>
        </motion.div>
      </motion.div>

    </div>
  );
};

export default RecoveryPage;