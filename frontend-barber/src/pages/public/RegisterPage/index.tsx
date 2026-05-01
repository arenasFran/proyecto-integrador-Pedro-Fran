import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { RegisterForm } from './components/RegisterForm';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

interface RegisterPageProps {
  onNavigateToLogin?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateToLogin }) => {
  return (
    <div className="min-h-[100dvh] bg-[#050505] flex items-center justify-center px-4 py-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm"
      >
        <motion.div variants={itemVariants} className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FF5C00]/10 rounded-xl mb-3">
            <Scissors className="w-6 h-6 text-[#FF5C00]" />
          </div>
          <h1 className="text-[24px] font-bold text-white tracking-tight mb-1">
            Crear cuenta
          </h1>
          <p className="text-[13px] text-[#8A8A8A]">
            Únete a nuestra comunidad
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-[#121212] border border-[#282828] rounded-[20px] p-4"
        >
          <RegisterForm onSuccess={onNavigateToLogin} />
        </motion.div>

        <motion.div variants={itemVariants} className="mt-4 text-center">
          <p className="text-[13px] text-[#8A8A8A]">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="text-[#FF5C00] font-medium hover:text-[#FF5C00]/80 transition-colors"
            >
              Iniciar sesión
            </Link>
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-2 text-center">
          <Link
            to="/recovery"
            className="text-[11px] text-[#8A8A8A] hover:text-white transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </motion.div>
      </motion.div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#FF5C00]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-[#FF5C00]/3 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default RegisterPage;