import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
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
          <motion.div variants={itemVariants} className="text-center mb-4">
            <img src="/logo-barberia.PNG" alt="Barbería SA" className="h-56 w-auto mx-auto mb-1" />
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