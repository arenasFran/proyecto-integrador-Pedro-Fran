import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import {
  FiArrowUpRight,
  FiAward,
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiClock,
  FiCoffee,
  FiGrid,
  FiInstagram,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiPackage,
  FiPhone,
  FiShoppingBag,
  FiShoppingCart,
  FiTag,
  FiUser,
  FiX
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { getAccessToken } from '../../../services/api';
import { useGetCategoriesQuery, useGetPublicCatalogQuery } from '../../../services/productApi';
import { useGetServicesQuery } from '../../../services/service.api';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { logout } from '../../../store/slices/authSlice';
import type { Product } from '../../../types/product';
import { formatCurrency } from '../../../utils/formatCurrency';
import { getTokenUser } from '../../../utils/token';
import './landing-page.css';
import ShinyText from './ShinyText';
import StrokeText from './StrokeText';

const services = [
  {
    number: '01',
    name: 'Corte clásico',
    desc: 'Tijera y máquina, lavado incluido y una terminación prolija.',
    price: '$ 490',
    image: '/corte%20de%20pelo.jpeg',
    position: '50% 25%',
  },
  {
    number: '02',
    name: 'Corte a máquina',
    desc: 'Rápido, parejo y bien definido para salir listo en poco tiempo.',
    price: '$ 350',
    image: '/corte%20a%20maquina.png',
    position: '50% 50%',
  },
  {
    number: '03',
    name: 'Barba',
    desc: 'Navaja caliente, toallas y aceite. Salís con otra cara.',
    price: '$ 250',
    image: '/corte%20de%20barba.jpeg',
    position: '35% 35%',
  },
];


const aboutStats = [
  { value: '+XX', label: 'clientes' },
  { value: '+10', label: 'años de experiencia' },
  { value: '+4.5', label: 'stars en Google Reviews' },
];

const faqItems = [
  {
    q: '¿Necesito reservar con anticipación?',
    a: 'Sí. Podés reservar desde esta web en menos de un minuto o escribirnos por WhatsApp si preferís coordinar directamente.',
  },
  {
    q: '¿Puedo elegir barbero?',
    a: 'Sí, al reservar vas a ver la disponibilidad de cada uno. Si no tenés preferencia, te asignamos el primer horario libre.',
  },
  {
    q: '¿Qué pasa si llego tarde?',
    a: 'Tenés 10 minutos de margen. Después de ese tiempo, el turno puede cancelarse para cuidar la agenda de todos.',
  },
  {
    q: '¿Cómo cancelo o cambio un turno?',
    a: 'Podés hacerlo desde tu cuenta hasta el día anterior sin costo. El mismo día, avisanos por WhatsApp o Instagram.',
  },
  {
    q: '¿Qué incluye la membresía?',
    a: 'Incluye 4 cortes mensuales y 10% de descuento en productos de la tienda. Es una forma simple de mantener tu rutina resuelta.',
  },
];

const revealVariants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const staggerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const LandingProductCard: React.FC<{ product: Product; isAuthenticated: boolean }> = ({ product, isAuthenticated }) => {
  const gallery = [product.imageUrl, ...product.gallery].filter(Boolean).slice(0, 4);
  const unavailable = product.status !== 'active' || product.stock === 0;

  return (
  <article className="catalog-card">
    <div className="catalog-card-media">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} loading="lazy" />
      ) : (
        <FiGrid aria-hidden="true" />
      )}
      <span className="catalog-card-category">
        <FiTag aria-hidden="true" />
        <span>{product.category || 'Cuidado personal'}</span>
      </span>
      {unavailable && <span className="catalog-card-badge">{product.stock === 0 ? 'Sin stock' : 'No disponible'}</span>}
    </div>
    <div className="catalog-card-content">
      <div className="catalog-card-topline">
        <strong>{formatCurrency(product.price)}</strong>
      </div>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      {gallery.length > 1 && (
        <div className="catalog-card-gallery" aria-label={`Fotos de ${product.name}`}>
          {gallery.map((image, index) => <img key={`${image}-${index}`} src={image} alt="" loading="lazy" />)}
        </div>
      )}
      <div className="catalog-card-footer">
        {!isAuthenticated ? (
          <Link className="landing-button landing-button-primary catalog-buy-link" to="/login?returnUrl=/tienda">
            <span>Comprar</span>
            <FiShoppingCart aria-hidden="true" />
          </Link>
        ) : (
          <span className="catalog-card-note">Disponible en tienda</span>
        )}
      </div>
    </div>
  </article>
  );
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const reduceMotion = useReducedMotion();
  const user = useAppSelector((state) => state.auth.user);
  const loginToken = useAppSelector((state) => state.auth.loginToken);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const token = getAccessToken();
  const tokenUser = getTokenUser(token);
  const isAuthenticated = Boolean(loginToken || (token && tokenUser));
  const roleKind = user?.kind || tokenUser?.kind || 'Registrado';
  const isAdmin = roleKind === 'Admin';
  const isEmployee = roleKind === 'Empleado';
  const isStaffUser = isAdmin || isEmployee;
  const displayName = user?.name || user?.email || tokenUser?.email || 'Usuario';
  const adminMenuSections = [
    {
      title: 'Dashboard',
      items: [
        { label: 'Métricas', to: '/admin/dashboard', icon: FiBarChart2 },
        { label: 'Turnos', to: '/admin/turnos', icon: FiCalendar },
        { label: 'Calendario', to: '/admin/calendario', icon: FiCalendar },
      ],
    },
    {
      title: 'Gestión',
      items: [
        { label: 'Profesionales', to: '/admin/profesionales', icon: FiUser },
        { label: 'Servicios', to: '/admin/servicios', icon: FiCheck },
        { label: 'Productos', to: '/admin/productos', icon: FiPackage },
        { label: 'Órdenes', to: '/admin/ordenes', icon: FiShoppingBag },
      ],
    },
    {
      title: 'Clientes',
      items: [
        { label: 'Clientes', to: '/admin/clientes', icon: FiUser },
        { label: 'Membresías', to: '/admin/membresias', icon: FiAward },
        { label: 'Perfil', to: '/admin/perfil', icon: FiUser },
      ],
    },
  ];
  const employeeMenuSections = [
    {
      title: 'Operación',
      items: [
        { label: 'Turnos', to: '/admin/turnos', icon: FiCalendar },
        { label: 'Calendario', to: '/admin/calendario', icon: FiCalendar },
        { label: 'Servicios', to: '/admin/servicios', icon: FiCheck },
      ],
    },
    {
      title: 'Tienda',
      items: [
        { label: 'Productos', to: '/admin/productos', icon: FiPackage },
        { label: 'Órdenes', to: '/admin/ordenes', icon: FiShoppingBag },
      ],
    },
    {
      title: 'Perfil',
      items: [
        { label: 'Clientes', to: '/admin/clientes', icon: FiUser },
        { label: 'Perfil', to: '/admin/perfil', icon: FiUser },
      ],
    },
  ];
  const { data: productsData, isLoading: productsLoading } = useGetPublicCatalogQuery({
    category: selectedCategory || undefined,
    limit: 100,
  });
  const { data: categoriesData } = useGetCategoriesQuery();
  const { data: servicesData } = useGetServicesQuery();
  const products = productsData?.products ?? [];
  const categories = categoriesData?.categories ?? [];
  const landingServices = services.map((fallbackService, index) => {
    const service = servicesData?.[index];
    if (!service) return fallbackService;

    return {
      ...fallbackService,
      name: service.name || fallbackService.name,
      desc: service.description || fallbackService.desc,
      price: typeof service.price === 'number' ? formatCurrency(service.price) : fallbackService.price,
      image: service.imageUrl || fallbackService.image,
    };
  });
  const motionReveal = reduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : revealVariants;
  const motionItem = reduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : itemVariants;

  useEffect(() => {
    const handleScroll = () => setHeaderScrolled(window.scrollY > 24);
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    setMobileMenuOpen(false);
  };

  const goTo = (path: string) => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Logout remains optimistic if the API is unavailable.
    }
    dispatch(logout());
    setDropdownOpen(false);
  };

  return (
    <div className="landing-page">
      <header className={`landing-header ${headerScrolled ? 'is-scrolled' : ''}`}>
        <div className="landing-container landing-header-inner">
          <Link to="/" className="landing-brand" aria-label="Barbería SA, inicio">
            <img src="/logo-barberia-notittle.PNG" alt="" className="landing-brand-mark" />
            <span>
              <strong>
                <StrokeText
                  text="BARBERÍA SA"
                  strokeColor="#ff9d66"
                  fillColor="#ffffff"
                  strokeWidth={0.8}
                  drawDuration={1.25}
                  fillDelay={0.08}
                  stagger={0.04}
                  trigger="mount"
                  fillMode="wipe"
                  fontSize={16}
                  fontWeight={800}
                  letterSpacing={-0.55}
                  className="landing-brand-stroke"
                />
              </strong>
            </span>
          </Link>

          <nav className="landing-nav" aria-label="Navegación principal">
            <button type="button" onClick={() => scrollTo('servicios')}>Servicios</button>
            <button type="button" onClick={() => scrollTo('nosotros')}>Nosotros</button>
            <button type="button" onClick={() => scrollTo('tienda')}>Tienda</button>
            <button type="button" onClick={() => scrollTo('faqs')}>FAQs</button>
            <button type="button" onClick={() => scrollTo('contacto')}>Contacto</button>
          </nav>

          <div className="landing-header-actions">
            {isAuthenticated ? (
              <div className="landing-account" ref={dropdownRef}>
                <button
                  type="button"
                  className="landing-account-trigger"
                  aria-expanded={dropdownOpen}
                  onClick={() => setDropdownOpen((open) => !open)}
                >
                  <span className="landing-account-icon"><FiUser /></span>
                  <span className="landing-account-name">{displayName}</span>
                  <FiChevronDown className={dropdownOpen ? 'is-open' : ''} />
                </button>
                {dropdownOpen && (
                  <div className="landing-account-menu">
                    {isAdmin && adminMenuSections.map((section) => (
                      <div className="landing-account-section" key={section.title}>
                        <span className="landing-account-section-title">{section.title}</span>
                        {section.items.map((item) => (
                          <button key={item.to} type="button" onClick={() => goTo(item.to)}>
                            {React.createElement(item.icon)} {item.label}
                          </button>
                        ))}
                      </div>
                    ))}

                    {isEmployee && employeeMenuSections.map((section) => (
                      <div className="landing-account-section" key={section.title}>
                        <span className="landing-account-section-title">{section.title}</span>
                        {section.items.map((item) => (
                          <button key={item.to} type="button" onClick={() => goTo(item.to)}>
                            {React.createElement(item.icon)} {item.label}
                          </button>
                        ))}
                      </div>
                    ))}

                    {!isStaffUser && (
                      <>
                        <div className="landing-account-section">
                          <span className="landing-account-section-title">Cuenta</span>
                          <button type="button" onClick={() => goTo('/mis-turnos')}><FiCalendar /> Mis turnos</button>
                          <button type="button" onClick={() => goTo('/reservar')}><FiCalendar /> Reservar turno</button>
                        </div>

                        <div className="landing-account-section">
                          <span className="landing-account-section-title">Tienda</span>
                          <button type="button" onClick={() => goTo('/tienda')}><FiPackage /> Tienda</button>
                          <button type="button" onClick={() => goTo('/mis-ordenes')}><FiShoppingBag /> Mis órdenes</button>
                          <button type="button" onClick={() => goTo('/mi-membresia')}><FiAward /> Mi membresía</button>
                        </div>

                        <div className="landing-account-section">
                          <span className="landing-account-section-title">General</span>
                          <button type="button" onClick={() => goTo('/perfil')}><FiUser /> Perfil</button>
                          <button type="button" onClick={() => scrollTo('contacto')}><FiMapPin /> Contacto</button>
                        </div>
                      </>
                    )}

                    <div className="landing-account-divider" />
                    <button type="button" className="is-danger" onClick={handleLogout}><FiLogOut /> Cerrar sesión</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="landing-guest-actions" ref={dropdownRef}>
                <button type="button" className="landing-button landing-button-primary landing-header-cta" onClick={() => goTo('/reservar')}>
                  Reservar
                </button>
                <button
                  type="button"
                  className="landing-account-trigger landing-guest-trigger"
                  aria-expanded={dropdownOpen}
                  aria-label="Abrir opciones de cuenta"
                  onClick={() => setDropdownOpen((open) => !open)}
                >
                  <span className="landing-account-icon"><FiMenu /></span>
                </button>
                {dropdownOpen && (
                  <div className="landing-account-menu landing-guest-menu">
                    <button type="button" onClick={() => goTo('/login')}><FiUser /> Iniciar sesión</button>
                    <button type="button" onClick={() => goTo('/register')}><FiUser /> Crear cuenta</button>
                  </div>
                )}
              </div>
            )}

            {isAuthenticated && !isStaffUser && (
              <button type="button" className="landing-button landing-button-primary landing-header-cta" onClick={() => goTo('/reservar')}>
                Reservar
              </button>
            )}
            <button
              type="button"
              className="landing-menu-toggle"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="landing-mobile-menu">
            <div className="landing-container">
              {isAuthenticated && isAdmin && (
                <>
                  <button type="button" onClick={() => goTo('/admin/dashboard')}>Métricas</button>
                  <button type="button" onClick={() => goTo('/admin/profesionales')}>Profesionales</button>
                  <button type="button" onClick={() => goTo('/admin/turnos')}>Turnos</button>
                  <button type="button" onClick={() => goTo('/admin/calendario')}>Calendario</button>
                  <button type="button" onClick={() => goTo('/admin/servicios')}>Servicios</button>
                  <button type="button" onClick={() => goTo('/admin/productos')}>Productos</button>
                  <button type="button" onClick={() => goTo('/admin/ordenes')}>Órdenes</button>
                  <button type="button" onClick={() => goTo('/admin/clientes')}>Clientes</button>
                  <button type="button" onClick={() => goTo('/admin/membresias')}>Membresías</button>
                  <button type="button" onClick={() => goTo('/admin/perfil')}>Perfil</button>
                </>
              )}

              {isAuthenticated && isEmployee && (
                <>
                  <button type="button" onClick={() => goTo('/admin/turnos')}>Turnos</button>
                  <button type="button" onClick={() => goTo('/admin/calendario')}>Calendario</button>
                  <button type="button" onClick={() => goTo('/admin/servicios')}>Servicios</button>
                  <button type="button" onClick={() => goTo('/admin/productos')}>Productos</button>
                  <button type="button" onClick={() => goTo('/admin/ordenes')}>Órdenes</button>
                  <button type="button" onClick={() => goTo('/admin/clientes')}>Clientes</button>
                  <button type="button" onClick={() => goTo('/admin/perfil')}>Perfil</button>
                </>
              )}

              {(!isAuthenticated || (!isAdmin && !isEmployee)) && (
                ['servicios', 'tienda', 'nosotros', 'faqs', 'contacto'].map((id) => (
                  <button type="button" key={id} onClick={() => scrollTo(id)}>
                    {id === 'faqs' ? 'FAQs' : id[0].toUpperCase() + id.slice(1)}
                  </button>
                ))
              )}

              {!isAuthenticated && (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Iniciar sesión</Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>Crear cuenta</Link>
                </>
              )}

              {!isStaffUser && !isAuthenticated && (
                <button type="button" className="landing-button landing-button-primary" onClick={() => goTo('/reservar')}>Reservar turno <FiArrowUpRight /></button>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-glow hero-glow-one" aria-hidden="true" />
          <div className="hero-glow hero-glow-two" aria-hidden="true" />
          <div className="landing-container hero-layout">
            <motion.div
              className="hero-copy"
              variants={staggerVariants}
              initial="hidden"
              animate="visible"
            >
        
              <motion.h1 id="hero-title" variants={motionItem}>
                <StrokeText
                  text="Corte"
                  strokeColor="#ff9d66"
                  fillColor="#ffffff"
                  strokeWidth={1}
                  drawDuration={1.55}
                  startDelay={0}
                  fillDelay={0.1}
                  stagger={0.06}
                  ease="power2.out"
                  trigger="scroll"
                  fillMode="wipe"
                  fontSize={120}
                  letterSpacing={-4}
                  className="hero-stroke-component hero-word-line"
                />
                <StrokeText
                  text="con"
                  strokeColor="#ff9d66"
                  fillColor="#ffffff"
                  strokeWidth={1}
                  drawDuration={1.35}
                  startDelay={0.24}
                  fillDelay={0.08}
                  stagger={0.06}
                  ease="power2.out"
                  trigger="scroll"
                  fillMode="wipe"
                  fontSize={120}
                  letterSpacing={-4}
                  className="hero-stroke-component hero-word-line"
                />
                <StrokeText
                  text="estilo."
                  strokeColor="#ff5c00"
                  fillColor="#ff5c00"
                  strokeWidth={1}
                  drawDuration={1.8}
                  startDelay={0.48}
                  fillDelay={0.12}
                  stagger={0.055}
                  ease="power2.out"
                  trigger="scroll"
                  fillMode="wipe"
                  fontSize={132}
                  fontWeight={400}
                  letterSpacing={-5}
                  className="hero-stroke-component hero-word-line hero-italic-word"
                />
                <StrokeText
                  text="Sin"
                  strokeColor="#ff9d66"
                  fillColor="#ffffff"
                  strokeWidth={1}
                  drawDuration={1.3}
                  startDelay={0.78}
                  fillDelay={0.06}
                  stagger={0.058}
                  ease="power2.out"
                  trigger="scroll"
                  fillMode="wipe"
                  fontSize={120}
                  letterSpacing={-4}
                  className="hero-stroke-component hero-word-line"
                />
                <StrokeText
                  text="vueltas."
                  strokeColor="#ff9d66"
                  fillColor="#ffffff"
                  strokeWidth={1}
                  drawDuration={1.62}
                  startDelay={0.98}
                  fillDelay={0.09}
                  stagger={0.057}
                  ease="power2.out"
                  trigger="scroll"
                  fillMode="wipe"
                  fontSize={120}
                  letterSpacing={-4}
                  className="hero-stroke-component hero-word-line"
                />
              </motion.h1>

              <motion.div variants={motionItem} className="hero-actions">
                <button type="button" className="landing-button landing-button-primary" onClick={() => goTo('/reservar')}>
                  Reservar mi turno <FiArrowUpRight />
                </button>
              </motion.div>
      
            </motion.div>

            <motion.div
              className="hero-visual"
              initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
            
              <div className="hero-image-frame">
                <picture>
                  <source media="(max-width: 640px)" srcSet="/hero-mobile.jpeg" />
                  <img src="/hero.png" alt="Interior y ambiente de Barbería SA" />
                </picture>
                <div className="hero-image-shade" />
           
              </div>
              <div className="hero-info-card">
                <div className="hero-info-head">
                  <span className="hero-info-status">
                    <span className="hero-info-dot" aria-hidden="true" />
                    Horarios
                  </span>
                
                </div>

                <div className="hero-info-row">
                  <div className="hero-info-icon-wrap">
                    <FiClock className="hero-info-icon" />
                  </div>

                  <div className="hero-info-copy">
                    <strong>Lunes a sábado</strong>
                    <span>09:00 a 19:00</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

        </section>

        <section id="servicios" className="landing-section services-section">
          <div className="landing-container">
            <motion.div className="section-heading-split" variants={motionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}>
              <div className="section-heading">
                <span className="section-marker"><span className="section-marker-line" /> Lo que hacemos</span>
                <h2>Un buen<br />corte<br /><em>empieza acá.</em></h2>
              </div>
              <div className="section-heading-note services-heading-note">
                <div className="services-heading-media">
                  <img src="/hero-mobile-horizontal.jpeg" alt="Interior de Barbería SA" loading="lazy" />
                  <div className="services-heading-media-copy">
                    <span className="services-heading-media-kicker">Con cada<br />servicio...</span>
                    <strong>
                      <ShinyText
                        text="Bebida incluida"
                        className="services-heading-media-shiny"
                        color="#b5b5b5"
                        shineColor="#ffffff"
                        speed={2.8}
                        delay={1.2}
                      />
                      <FiCoffee className="services-heading-media-icon" aria-hidden="true" />
                    </strong>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="services-grid">
              {landingServices.map((service, index) => (
                <motion.article
                  className="service-card"
                  key={service.name}
                  variants={motionItem}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={reduceMotion ? { duration: 0 } : { delay: index * 0.08 }}
                >
                  <div className="service-card-media">
                    <img src={service.image} alt={service.name} style={{ objectPosition: service.position }} loading="lazy" />
                  </div>
                  <div className="service-card-content">
                    <div className="service-card-title-row"><h3>{service.name}</h3><span>{service.price}</span></div>
                    <p>{service.desc}</p>
                    <button type="button" className="landing-button landing-button-primary service-card-detail" onClick={() => goTo('/reservar')}>Reservar <FiCalendar aria-hidden="true" /></button>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="nosotros" className="landing-section about-section">
          <div className="landing-container about-grid">
            <motion.div className="about-visual" initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.7 }}>
              <div className="about-image-frame">
                <img src="/ChatGPT%20Image%2015%20ago%202026,%2020_48_25.png" alt="Fachada de Barbería SA" loading="lazy" />
                <div className="about-image-shade" />
              </div>
              <div className="about-info-card">
          
                <div className="about-info-row">
                  <div className="about-info-icon-wrap">
                    <FiMapPin className="about-info-icon" />
                  </div>
                  <div className="about-info-copy">
                    <strong>+10 años</strong>
                    <span>de oficio y dedicación</span>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div className="about-copy" variants={motionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}>
              <h2>Nosotros<br /><em>de verdad.</em></h2>
              <p>Somos una barbería de barrio donde el oficio importa y cada visita tiene su propio ritmo. Escuchamos lo que buscás, cuidamos el detalle y hacemos que volver sea fácil.</p>
              <p className="about-tagline"><span className="about-tagline-text">Vení por el corte, quedate por el ambiente.</span></p>
              <div className="about-stats" aria-label="Datos destacados de Barbería SA">
                {aboutStats.map((stat) => (
                  <div className="about-stat" key={stat.label}>
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section id="contacto" className="landing-contact">
          <div className="landing-container contact-grid">
            <motion.div className="contact-copy" variants={motionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}>
              <h2>Nos vemos<br /><em>en la silla.</em></h2>
              <div className="contact-body">
                <p className="contact-address"><FiMapPin aria-hidden="true" /><span>Avenida Artigas 397.</span></p>
                <div className="contact-detail-list">
                  <div className="contact-detail-item"><FiClock aria-hidden="true" /><strong>Lunes a sábados: 09:00 a 19:00</strong></div>
                  <div className="contact-detail-item"><FiPhone aria-hidden="true" /><strong>+598 92 757 877</strong></div>
                </div>
                <div className="contact-links">
                  <a href="https://wa.me/59892757877" target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp"><FaWhatsapp aria-hidden="true" /></a>
                  <a href="https://www.instagram.com/barberiasantiagoabbona/" target="_blank" rel="noopener noreferrer" aria-label="Visitar Instagram"><FiInstagram aria-hidden="true" /></a>
                  {!isMapOpen && (
                    <button
                      type="button"
                      className="map-trigger contact-map-trigger"
                      aria-label="Abrir mapa de Barbería SA"
                      aria-expanded="false"
                      onClick={() => setIsMapOpen(true)}
                    >
                      <span className="map-trigger-icon" aria-hidden="true"><FiMapPin /></span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
            <div className="contact-map-slot" aria-hidden={!isMapOpen}>
              <AnimatePresence initial={false} mode="wait">
                {isMapOpen && (
                  <motion.div
                    className="contact-map-card is-open"
                    initial={{ opacity: 0, y: 18, scale: 0.92, filter: 'blur(5px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: 14, scale: 0.94, filter: 'blur(4px)' }}
                    transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] as const }}
                    style={{ transformOrigin: 'right center' }}
                  >
                    <div className="contact-map-toolbar">
                      <span>Cómo llegar</span>
                      <button type="button" className="map-close" aria-label="Cerrar mapa" onClick={() => setIsMapOpen(false)}>
                        <FiX aria-hidden="true" />
                      </button>
                    </div>
                    <iframe
                      className="contact-map-frame"
                      title="Ubicación de Barbería SA en Avenida Artigas 397"
                      src="https://www.google.com/maps?q=Avenida+Artigas+397,+Montevideo,+Uruguay&output=embed"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        <section id="faqs" className="landing-section faq-section">
          <div className="landing-container faq-grid">
            <motion.div className="faq-heading" variants={motionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}>
              <span className="section-marker"><span className="section-marker-line" /> FAQs</span>
              <h2>Todo<br /><em>claro.</em></h2>
              <p>Las respuestas a lo que más nos preguntan. Si te queda alguna duda, escribinos.</p>
            </motion.div>
            <div className="faq-list">
              {faqItems.map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <div className={`faq-item ${isOpen ? 'is-open' : ''}`} key={item.q}>
                    <button type="button" aria-expanded={isOpen} aria-controls={`faq-answer-${index}`} onClick={() => setOpenFaq(isOpen ? null : index)}>
                      <span>{item.q}</span><span className="faq-toggle"><FiChevronDown /></span>
                    </button>
                    <div id={`faq-answer-${index}`} className="faq-answer" role="region" aria-hidden={!isOpen}>
                      <p>{item.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="tienda" className="landing-section shop-section">
          <div className="landing-container">
            <motion.div className="catalog-heading" variants={motionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}>
              <div>
                <h2>La tienda<br /><em>del barbero.</em></h2>
              </div>
              <p>Productos seleccionados para mantener el resultado en casa. Explorá el catálogo y, para comprar, iniciá sesión.</p>
            </motion.div>

            <div className="catalog-toolbar" aria-label="Filtros del catálogo">
              <div className="catalog-filter-group">
                <div className="catalog-filters" role="group" aria-label="Categorías">
                  <button type="button" aria-pressed={!selectedCategory} className={!selectedCategory ? 'is-selected' : ''} onClick={() => setSelectedCategory('')}>Todos</button>
                  {categories.map((category) => (
                    <button type="button" aria-pressed={selectedCategory === category} className={selectedCategory === category ? 'is-selected' : ''} key={category} onClick={() => setSelectedCategory(category)}>{category}</button>
                  ))}
                </div>
              </div>
            </div>

            {productsLoading ? (
              <div className="catalog-state">Cargando catálogo...</div>
            ) : products.length > 0 ? (
              <div className="catalog-grid">
                {products.map((product) => <LandingProductCard key={product.id} product={product} isAuthenticated={isAuthenticated} />)}
              </div>
            ) : (
              <div className="catalog-state">No hay productos disponibles en esta categoría.</div>
            )}
          </div>
        </section>

      </main>

      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-main">
            <div><Link to="/" className="landing-brand"><img src="/logo-barberia.PNG" alt="" className="landing-brand-mark" /><span><strong>Barbería SA</strong><small>Oficio de barrio</small></span></Link><p>Oficio de barbero, agenda de hoy. Reservá tu turno en menos de un minuto.</p></div>
            <div><h3>Navegar</h3><button type="button" onClick={() => scrollTo('servicios')}>Servicios</button><button type="button" onClick={() => scrollTo('tienda')}>Tienda</button><button type="button" onClick={() => scrollTo('nosotros')}>Nosotros</button><button type="button" onClick={() => scrollTo('contacto')}>Contacto</button></div>
            <div><h3>Seguinos</h3><a href="https://www.instagram.com/barberiasantiagoabbona/" target="_blank" rel="noopener noreferrer">Instagram <FiArrowUpRight /></a><a href="https://wa.me/59892757877" target="_blank" rel="noopener noreferrer">WhatsApp <FiArrowUpRight /></a></div>
          </div>
          <div className="landing-footer-bottom"><span>&copy; {new Date().getFullYear()} Barbería SA</span><span>Montevideo, Uruguay</span><span>Todos los derechos reservados</span></div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
