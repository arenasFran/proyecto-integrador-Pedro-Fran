import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MdContentCut } from 'react-icons/md';
import { Input, Button } from '../../../components/common';

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

export const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
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
            Bienvenido de nuevo
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-[#121212] border border-[#282828] rounded-[24px] p-6"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="Ingresa tu correo"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Input
                label="Contraseña"
                type="password"
                placeholder="Ingresa tu contraseña"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button type="submit" loading={isLoading} className="w-full">
                Iniciar sesión
              </Button>
            </motion.div>
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