import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { RegisterForm } from './components/RegisterForm';
import { PublicFooter } from '../../../components/client/PublicFooter';

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

export const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-[100dvh] bg-[#050505] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-sm"
        >
          <motion.div variants={itemVariants} className="relative text-center mb-4">
            <Link
              to="/"
              aria-label="Volver a la página principal"
              title="Volver a la página principal"
              className="group absolute left-0 top-8 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#282828] bg-[#121212]/90 text-[#8A8A8A] shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-x-0.5 hover:border-[#FF5C00]/60 hover:bg-[#FF5C00]/10 hover:text-[#FF5C00] hover:shadow-[0_0_20px_rgba(255,92,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5C00]/70"
            >
              <FiArrowLeft size={18} className="transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden="true" />
            </Link>
            <img src="/logo-barberia.PNG" alt="Barbería SA" className="h-72 w-auto mx-auto mb-0" />
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
            <RegisterForm />
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
        </motion.div>
      </div>

      <PublicFooter />
    </div>
  );
};

export default RegisterPage;
