import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCalendar, FiChevronDown, FiLogOut, FiUser } from 'react-icons/fi';
import { Button } from '../../../components/common';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { logout } from '../../../store/slices/authSlice';
import { getTokenUser } from '../../../utils/token';
import { getAccessToken } from '../../../services/api';

const staggerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const services = [
  {
    name: 'Corte clásico',
    desc: 'Tijera y máquina, terminación prolija, lavado incluido.',
    price: '$ 450',
    bgPosition: '20% 78%',
  },
  {
    name: 'Barba y perfilado',
    desc: 'Navaja caliente, toallas y aceite. Salís con otra cara.',
    price: '$ 380',
    bgPosition: '60% 10%',
  },
  {
    name: 'Corte + barba',
    desc: 'El combo de siempre, a un precio mejor que separado.',
    price: '$ 720',
    bgPosition: '80% 55%',
  },
  {
    name: 'Afeitado tradicional',
    desc: 'Espuma, navaja y paciencia. El servicio de la casa.',
    price: '$ 400',
    bgPosition: '40% 95%',
  },
];

const faqItems = [
  {
    q: '¿Necesito reservar con anticipación?',
    a: 'No es obligatorio, pero te recomendamos reservar para no esperar. Los viernes y sábados se llenan rápido.',
  },
  {
    q: '¿Puedo elegir barbero?',
    a: 'Sí, al reservar vas a ver la disponibilidad de cada uno. Si no tenés preferencia, te asignamos el primero libre.',
  },
  {
    q: '¿Qué pasa si llego tarde?',
    a: 'Tenés 10 minutos de margen. Después de eso, el turno pasa a la lista de espera del día.',
  },
  {
    q: '¿Cómo cancelo o cambio un turno?',
    a: 'Desde tu cuenta, hasta el día anterior sin costo. El mismo día, te pedimos que nos avises por WhatsApp.',
  },
  {
    q: '¿Aceptan pago con tarjeta?',
    a: 'Sí, tarjeta, transferencia o efectivo. Se paga en el local al terminar el servicio.',
  },
];

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

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* ─── HEADER ─── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#050505]/85 to-transparent"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-[5vw]">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-barberia.PNG" alt="Barbería SA" className="h-16 w-auto" />
            <span className="text-[15px] font-bold text-white">Barbería SA</span>
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
                <Button variant="ghost" onClick={() => navigate('/login')} className="text-[13px]">
                  Iniciar sesión
                </Button>
                <Button onClick={() => navigate('/register')} className="text-[13px]">
                  Registrarse
                </Button>
              </>
            )}
            <Button onClick={() => navigate('/reservar')} className="text-[13px]">
              Reservar turno
            </Button>
          </div>
        </div>
      </motion.header>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-end">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/hero.jpg')" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(5,5,5,0.35) 0%, rgba(5,5,5,0.15) 30%, rgba(5,5,5,0.55) 68%, rgba(5,5,5,0.97) 100%)',
            }}
          />
        </div>

        <motion.div
          variants={staggerVariants}
          initial="hidden"
          animate="visible"
          className="relative w-full px-[5vw] pb-24 grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-10 items-end"
        >
          <div>
            <motion.span variants={fadeUp} className="text-[11px] uppercase tracking-widest text-[#FF5C00] inline-flex items-center gap-2">
              <span className="w-4 h-px bg-[#FF5C00] inline-block" />
              Barbería de barrio, oficio de verdad
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="font-extrabold uppercase leading-[0.94] tracking-[-0.03em] text-[44px] sm:text-[64px] lg:text-[96px] mt-4 mb-6"
            >
              Turno<br />con <span className="text-[#FF5C00]" style={{ textShadow: '0 0 22px rgba(255,92,0,0.45)' }}>estilo</span>,<br />sin vueltas.
            </motion.h1>

            <motion.p variants={fadeUp} className="text-[#8A8A8A] text-[17px] leading-relaxed max-w-[440px] mb-8">
              Corte, barba y afeitado a la antigua, en un espacio pensado para tomarte tu tiempo. Elegís el horario, nosotros ponemos la navaja.
            </motion.p>

            <motion.div variants={fadeUp} className="flex gap-4 flex-wrap">
              <Button onClick={() => navigate('/reservar')}>
                Reservar turno
              </Button>
              <Button variant="outline" onClick={() => scrollTo('servicios')}>
                Ver servicios
              </Button>
            </motion.div>
          </div>

          <div className="hidden lg:block justify-self-end text-right border-r border-white/20 pr-6">
            <div className="mb-5">
              <b className="text-4xl font-extrabold text-[#FF5C00] block tracking-[-0.02em]">+8</b>
              <span className="text-xs text-[#8A8A8A] tracking-wide">años en el barrio</span>
            </div>
            <div className="mb-5">
              <b className="text-4xl font-extrabold text-[#FF5C00] block tracking-[-0.02em]">4.9</b>
              <span className="text-xs text-[#8A8A8A] tracking-wide">puntaje de clientes</span>
            </div>
            <div>
              <b className="text-4xl font-extrabold text-[#FF5C00] block tracking-[-0.02em]">15min</b>
              <span className="text-xs text-[#8A8A8A] tracking-wide">de espera promedio</span>
            </div>
          </div>
        </motion.div>

        <div className="absolute bottom-6 left-[5vw] text-[11px] uppercase tracking-widest text-[#8A8A8A] flex items-center gap-3">
          <span className="w-px h-8 bg-gradient-to-b from-[#FF5C00] to-transparent" />
          Deslizá
        </div>
      </section>

      {/* ─── SERVICIOS ─── */}
      <section id="servicios" className="bg-[#1A1A1A] px-[5vw] py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mb-14"
        >
          <span className="text-[11px] uppercase tracking-widest text-[#FF5C00] inline-flex items-center gap-2">
            <span className="w-4 h-px bg-[#FF5C00] inline-block" />
            Lo que hacemos
          </span>
          <h2 className="font-extrabold uppercase tracking-[-0.02em] text-[32px] sm:text-[52px] mt-4">
            Servicios
          </h2>
          <p className="text-[#8A8A8A] mt-3 text-base leading-relaxed">
            Cuatro cosas, bien hechas. Sin menú de 40 ítems ni promos confusas.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10">
          {services.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group relative overflow-hidden bg-[#1A1A1A] hover:bg-[#242424] transition min-h-[280px] flex flex-col justify-end p-8"
            >
              <div
                className="absolute inset-0 opacity-[0.16] group-hover:opacity-[0.28] group-hover:scale-105 transition-all duration-500"
                style={{
                  backgroundImage: "url('/hero.jpg')",
                  backgroundSize: '220% auto',
                  backgroundPosition: s.bgPosition,
                  filter: 'saturate(0.7)',
                }}
              />
              <div className="relative z-10">
                <h3 className="text-2xl font-extrabold uppercase mb-2 tracking-[-0.02em]">{s.name}</h3>
                <p className="text-[#8A8A8A] text-sm mb-4 leading-relaxed">{s.desc}</p>
                <span className="text-[15px] text-[#FF5C00]">{s.price}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── CÓMO RESERVAR ─── */}
      <section className="bg-[#050505] border-y border-[#282828] px-[5vw] py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mb-14"
        >
          <span className="text-[11px] uppercase tracking-widest text-[#FF5C00] inline-flex items-center gap-2">
            <span className="w-4 h-px bg-[#FF5C00] inline-block" />
            Cómo funciona
          </span>
          <h2 className="font-extrabold uppercase tracking-[-0.02em] text-[32px] sm:text-[52px] mt-4">
            Reservá en 3 pasos
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { step: '01', title: 'Elegís el servicio', desc: 'Corte, barba o el combo. Vas a ver la duración y el precio antes de confirmar.' },
            { step: '02', title: 'Elegís día y barbero', desc: 'Mirás la agenda real de cada barbero y elegís el horario que te queda cómodo.' },
            { step: '03', title: 'Confirmás y listo', desc: 'Te llega la confirmación al toque. Podés cancelar o reprogramar hasta el día anterior.' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <span
                className="text-6xl font-extrabold leading-none block mb-3"
                style={{ color: 'transparent', WebkitTextStroke: '1.5px rgba(255,92,0,0.5)' }}
              >
                {item.step}
              </span>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-[#8A8A8A] text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 flex items-center gap-6 flex-wrap"
        >
          <Button onClick={() => navigate('/reservar')}>
            Reservar turno ahora
          </Button>
          <p className="text-[#8A8A8A] text-sm max-w-[260px]">
            También podés escribirnos si preferís coordinar por WhatsApp.
          </p>
        </motion.div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="bg-[#1A1A1A] px-[5vw] py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mb-14"
        >
          <span className="text-[11px] uppercase tracking-widest text-[#FF5C00] inline-flex items-center gap-2">
            <span className="w-4 h-px bg-[#FF5C00] inline-block" />
            Antes de venir
          </span>
          <h2 className="font-extrabold uppercase tracking-[-0.02em] text-[32px] sm:text-[52px] mt-4">
            Preguntas frecuentes
          </h2>
        </motion.div>

        <div className="max-w-3xl">
          {faqItems.map((item, i) => (
            <div key={i} className="border-b border-white/20">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left flex justify-between items-center py-6 font-semibold text-lg"
              >
                {item.q}
                <span
                  className={`font-mono text-[#FF5C00] text-xl ml-5 transition-transform duration-250 ${
                    openFaq === i ? 'rotate-45' : ''
                  }`}
                >
                  +
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openFaq === i ? 'max-h-[500px]' : 'max-h-0'
                }`}
              >
                <p className="text-[#8A8A8A] text-sm leading-relaxed pb-6 max-w-[620px]">
                  {item.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── UBICACIÓN ─── */}
      <section className="bg-[#050505] px-[5vw] py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mb-14"
        >
          <span className="text-[11px] uppercase tracking-widest text-[#FF5C00] inline-flex items-center gap-2">
            <span className="w-4 h-px bg-[#FF5C00] inline-block" />
            Encontranos
          </span>
          <h2 className="font-extrabold uppercase tracking-[-0.02em] text-[32px] sm:text-[52px] mt-4">
            Ubicación y contacto
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <ul className="list-none p-0 mb-8">
              {[
                { label: 'Dirección', value: 'Av. Principal 1234, Montevideo' },
                { label: 'Horario', value: 'Mar. a sáb. 10:00–20:00', sub: '· Lun. cerrado' },
                { label: 'Teléfono', value: '+598 99 123 456' },
                { label: 'Email', value: 'hola@srbarberia.uy', muted: true },
              ].map((item) => (
                <li key={item.label} className="flex gap-4 py-4 border-b border-white/10 text-[15px]">
                  <b className="text-[11px] uppercase tracking-wide text-[#FF5C00] min-w-[110px] shrink-0 pt-0.5">
                    {item.label}
                  </b>
                  <span className={item.muted ? 'text-[#8A8A8A]' : ''}>
                    {item.value}
                    {item.sub && <span className="text-[#8A8A8A]"> {item.sub}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-4">
              {['IG', 'WA', 'FB'].map((label) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-11 h-11 border border-white/20 rounded-full flex items-center justify-center text-[13px] hover:border-[#FF5C00] hover:text-[#FF5C00] transition"
                >
                  {label}
                </a>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative aspect-[4/3] bg-[#242424] border border-white/20 overflow-hidden flex items-center justify-center"
          >
            <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <rect width="400" height="300" fill="#1f1a15" />
              <g stroke="rgba(255,255,255,0.12)" strokeWidth="1">
                <line x1="0" y1="60" x2="400" y2="60" />
                <line x1="0" y1="140" x2="400" y2="140" />
                <line x1="0" y1="220" x2="400" y2="220" />
                <line x1="90" y1="0" x2="90" y2="300" />
                <line x1="210" y1="0" x2="210" y2="300" />
                <line x1="320" y1="0" x2="320" y2="300" />
              </g>
              <path d="M0 180 L120 180 L150 120 L400 120" stroke="rgba(255,92,0,0.35)" strokeWidth="3" fill="none" />
            </svg>
            <div
              className="absolute top-[48%] left-[52%] w-3.5 h-3.5 rounded-full bg-[#FF5C00]"
              style={{ boxShadow: '0 0 0 0 rgba(255,92,0,0.55)' }}
            />
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#1A1A1A] border-t border-[#282828] px-[5vw] pt-14 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr] gap-10 pb-11 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo-barberia.PNG" alt="Barbería SA" className="h-12 w-auto" />
              <span className="text-[15px] font-bold text-white">Barbería SA</span>
            </div>
            <p className="text-[#8A8A8A] text-sm leading-relaxed max-w-[280px]">
              Oficio de barbero, agenda de hoy. Reservá tu turno en menos de un minuto.
            </p>
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-wide text-[#8A8A8A] mb-4">Navegar</h4>
            <button onClick={() => scrollTo('servicios')} className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">
              Servicios
            </button>
            <button onClick={() => navigate('/reservar')} className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">
              Reservar
            </button>
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-wide text-[#8A8A8A] mb-4">Cuenta</h4>
            <button onClick={() => navigate('/login')} className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">
              Iniciar sesión
            </button>
            <button onClick={() => navigate('/register')} className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">
              Registrarse
            </button>
            <button onClick={() => navigate('/mis-turnos')} className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">
              Mis turnos
            </button>
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-wide text-[#8A8A8A] mb-4">Seguinos</h4>
            <a href="#" className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">Instagram</a>
            <a href="#" className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">WhatsApp</a>
            <a href="#" className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">Facebook</a>
          </div>
        </div>
        <div className="flex justify-between items-center pt-6 text-xs text-[#8A8A8A] flex-wrap gap-3">
          <span>&copy; {new Date().getFullYear()} Barbería SA. Todos los derechos reservados.</span>
          <span>Montevideo, Uruguay</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
