import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCalendar, FiChevronDown, FiClock, FiLogOut, FiScissors, FiStar, FiUser } from 'react-icons/fi';
import { Button } from '../../../components/common';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { logout } from '../../../store/slices/authSlice';
import { getTokenUser } from '../../../utils/token';
import { getAccessToken } from '../../../services/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const features = [
  {
    icon: FiCalendar,
    title: 'Reservá online',
    description: 'Elegí barbero, servicio y horario sin llamar. Todo desde tu navegador.',
  },
  {
    icon: FiClock,
    title: 'Sin esperas',
    description: 'Llegá a tu hora exacta. Optimizamos la agenda para respetar tu tiempo.',
  },
  {
    icon: FiStar,
    title: 'Mejores barberos',
    description: 'Profesionales con experiencia en cortes modernos, barba y styling.',
  },
  {
    icon: FiUser,
    title: 'Gestioná tus turnos',
    description: 'Cancelá o reprogramá desde tu cuenta. Sin vueltas.',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const token = getAccessToken();
  const tokenUser = getTokenUser(token);
  const isAuthenticated = Boolean(token && tokenUser);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // logout optimista
    }
    dispatch(logout());
    setDropdownOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 border-b border-[#282828] bg-[#121212]/80 backdrop-blur-lg"
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-[14px] font-semibold text-white">
            <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-[#FF5C00]/10">
              <FiScissors className="text-[#FF5C00] text-sm" />
            </div>
            ELITE CUT
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-[12px] border border-[#282828] bg-[#1A1A1A] px-3 py-1.5 text-[13px] text-white hover:border-[#FF5C00]/50 transition-colors"
                >
                  <div className="rounded-full bg-[#FF5C00]/10 p-1">
                    <FiUser className="text-[#FF5C00] text-sm" />
                  </div>
                  <span className="hidden sm:inline">
                    {user ? `${user.name}` : tokenUser?.email ?? 'Usuario'}
                  </span>
                  <FiChevronDown className={`text-[#8A8A8A] text-sm transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-[12px] border border-[#282828] bg-[#1A1A1A] py-1 shadow-lg">
                    <button
                      onClick={() => { setDropdownOpen(false); navigate('/mis-turnos'); }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-white hover:bg-[#242424] transition-colors"
                    >
                      <FiCalendar className="text-[#FF5C00]" />
                      Mis turnos
                    </button>
                    <div className="border-t border-[#282828]" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-red-400 hover:bg-[#242424] transition-colors"
                    >
                      <FiLogOut />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Iniciar sesión
                </Button>
                <Button onClick={() => navigate('/register')}>
                  Registrarse
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.header>

      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-[#FF5C00]/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-[#FF5C00]/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-32 sm:px-6 lg:px-8 sm:pt-28 lg:pt-36">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full border border-[#282828] bg-[#1A1A1A] px-4 py-2 text-[12px] text-[#8A8A8A] mb-6">
              <FiScissors className="text-[#FF5C00]" />
              Barbería profesional
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-[40px] font-extrabold tracking-[-0.03em] leading-[1.1] sm:text-[56px] lg:text-[64px]">
              Tu look empieza{' '}
              <span className="text-[#FF5C00]">con un click</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="mt-5 text-[15px] text-[#8A8A8A] max-w-xl mx-auto leading-relaxed sm:text-[17px]">
              Reservá tu turno con los mejores barberos de la ciudad. Cortes modernos, barba impecable y un servicio que te hace volver.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                icon={FiCalendar}
                iconPosition="right"
                onClick={() => navigate('/reservar')}
              >
                Reservá tu turno
              </Button>
              <Button
                variant="outline"
                size="lg"
                icon={FiArrowRight}
                iconPosition="right"
                onClick={() => navigate('/register')}
              >
                Crear cuenta
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.section>

      <section className="border-t border-[#282828] bg-[#121212]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-[28px] font-extrabold tracking-[-0.02em] sm:text-[36px]">
              ¿Por qué elegirnos?
            </h2>
            <p className="mt-3 text-[14px] text-[#8A8A8A] max-w-lg mx-auto">
              Hacemos que cuidar tu imagen sea fácil, rápido y sin complicaciones.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="rounded-[20px] border border-[#282828] bg-[#1A1A1A] p-6 hover:border-[#FF5C00]/30 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#FF5C00]/10 mb-4">
                  <feature.icon className="text-[#FF5C00] text-lg" />
                </div>
                <h3 className="text-[16px] font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-[13px] text-[#8A8A8A] leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#282828] bg-[#050505]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-[24px] border border-[#282828] bg-[#121212] p-8 sm:p-12 text-center"
          >
            <FiScissors className="mx-auto text-[#FF5C00] text-3xl mb-4" />
            <h2 className="text-[26px] font-extrabold tracking-[-0.02em] sm:text-[34px]">
              Listo para tu próximo corte?
            </h2>
            <p className="mt-3 text-[14px] text-[#8A8A8A] max-w-md mx-auto mb-8">
              Reservá en segundos. Sin registro obligatorio.
            </p>
            <Button
              size="lg"
              icon={FiCalendar}
              iconPosition="right"
              onClick={() => navigate('/reservar')}
            >
              Reservá tu turno
            </Button>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-[#282828] bg-[#050505]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
              <FiScissors className="text-[#FF5C00]" />
              ELITE CUT
            </div>
            <p className="text-[12px] text-[#8A8A8A]">
              &copy; {new Date().getFullYear()} Elite Cut. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
