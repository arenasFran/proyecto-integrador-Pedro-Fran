import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
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
  FiHelpCircle,
  FiInstagram,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiPackage,
  FiPhone,
  FiPlus,
  FiShoppingBag,
  FiShoppingCart,
  FiScissors,
  FiTag,
  FiUser,
  FiUsers,
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
import { getTokenUser, isTokenValid } from '../../../utils/token';
import './landing-page.css';
import FoldText from './FoldText';
import ShinyText from './ShinyText';
import StrokeText from './StrokeText';

const services = [
  {
    number: '01',
    name: 'Corte clásico',
    desc: 'Tijera y máquina, lavado incluido y una terminación prolija.',
    price: '$ 490',
    image: '/service-hair.webp',
    position: '50% 25%',
  },
  {
    number: '02',
    name: 'Corte a máquina',
    desc: 'Rápido, parejo y bien definido para salir listo en poco tiempo.',
    price: '$ 350',
    image: '/service-machine.webp',
    position: '50% 50%',
  },
  {
    number: '03',
    name: 'Barba',
    desc: 'Navaja caliente, toallas y aceite. Salís con otra cara.',
    price: '$ 250',
    image: '/service-beard.webp',
    position: '35% 35%',
  },
];


const aboutStats = [
  { value: '+1200', label: 'clientes felices' },
  { value: '+10', label: 'años de oficio' },
  { value: '4.9', label: 'puntaje en Google' },
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

const landingNavigation = [
  { label: 'Servicios', id: 'servicios', icon: FiScissors },
  { label: 'Nosotros', id: 'nosotros', icon: FiUsers },
  { label: 'Tienda', id: 'tienda', icon: FiShoppingBag },
  { label: 'FAQs', id: 'faqs', icon: FiHelpCircle },
  { label: 'Contacto', id: 'contacto', icon: FiMapPin },
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

const popoverVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.97, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -5,
    scale: 0.98,
    filter: 'blur(3px)',
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as const },
  },
};

const mobileMenuVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: {
      height: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
      opacity: { duration: 0.22, delay: 0.06 },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      height: { duration: 0.3, ease: [0.4, 0, 1, 1] as const },
      opacity: { duration: 0.14 },
    },
  },
};

const LandingFoldLine: React.FC<{ text: string }> = ({ text }) => (
  <FoldText
    text={text}
    splitBy="word"
    hinge="top"
    duration={0.72}
    stagger={0.055}
    ease="power3.out"
    perspective={720}
    creaseShading={0.38}
    trigger="scroll"
    fontSize="inherit"
    fontWeight="inherit"
    color="currentColor"
    className="landing-fold-title-line"
  />
);

const LandingProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const gallery = [product.imageUrl, ...product.gallery].filter(Boolean).slice(0, 4);
  const reduceMotion = useReducedMotion();

  if (product.status !== 'active' || product.stock <= 0) return null;

  return (
  <motion.article
    className="catalog-card"
    initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.985 }}
    whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
    whileHover={reduceMotion ? undefined : { y: -4, scale: 1.005 }}
    whileTap={reduceMotion ? undefined : { scale: 0.995 }}
    viewport={{ once: true, amount: 0.12 }}
    transition={reduceMotion ? { duration: 0 } : { duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
  >
    <div className="catalog-card-media">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} width={640} height={475} loading="lazy" decoding="async" />
      ) : (
        <FiGrid aria-hidden="true" />
      )}
      <span className="catalog-card-category">
        <FiTag aria-hidden="true" />
        <span>{product.category || 'Cuidado personal'}</span>
      </span>
    </div>
    <div className="catalog-card-content">
      <div className="catalog-card-topline">
        <strong>{formatCurrency(product.price)}</strong>
      </div>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      {gallery.length > 1 && (
        <div className="catalog-card-gallery" aria-label={`Fotos de ${product.name}`}>
          {gallery.map((image, index) => <img key={`${image}-${index}`} src={image} alt="" width={160} height={119} loading="lazy" decoding="async" />)}
        </div>
      )}
      <div className="catalog-card-footer">
        <Link className="landing-button landing-button-primary catalog-buy-link" to="/tienda">
          <span>Comprar</span>
          <FiShoppingCart aria-hidden="true" />
        </Link>
      </div>
    </div>
  </motion.article>
  );
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const reduceMotion = useReducedMotion();
  const user = useAppSelector((state) => state.auth.user);
  const loginToken = useAppSelector((state) => state.auth.loginToken);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const landingRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const servicesSectionRef = useRef<HTMLElement>(null);
  const shopSectionRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sectionMenuRef = useRef<HTMLDivElement>(null);
  const contactInView = useInView(contactRef, { once: true, amount: 0.2 });
  const servicesInView = useInView(servicesSectionRef, { once: true, amount: 0.05 });
  const shopInView = useInView(shopSectionRef, { once: true, amount: 0.05 });

  const token = getAccessToken();
  const validToken = isTokenValid(token);
  const tokenUser = validToken ? getTokenUser(token) : null;
  const isAuthenticated = Boolean(validToken && (loginToken || tokenUser));
  const roleKind = tokenUser?.kind || user?.kind || 'Registrado';
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
      ],
    },
    {
      title: 'Tienda',
      items: [
        { label: 'Órdenes', to: '/admin/ordenes', icon: FiShoppingBag },
      ],
    },
    {
      title: 'Perfil',
      items: [
        { label: 'Perfil', to: '/admin/perfil', icon: FiUser },
      ],
    },
  ];
  const { data: productsData, isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useGetPublicCatalogQuery({
    category: selectedCategory || undefined,
    limit: 100,
  }, { skip: !shopInView });
  const { data: categoriesData } = useGetCategoriesQuery(undefined, { skip: !shopInView });
  const { data: servicesData } = useGetServicesQuery(undefined, { skip: !servicesInView });
  const products = (productsData?.products ?? []).filter((product) => product.status === 'active' && product.stock > 0);
  const categories = categoriesData?.categories ?? [];
  const landingServices = servicesData
    ? servicesData.map((service, index) => {
      const normalizedName = service.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const artworkIndex = normalizedName.includes('barba')
        ? 2
        : normalizedName.includes('maquina')
          ? 1
          : index;
      const artwork = services[artworkIndex] ?? services[0];

      return {
        number: '',
        name: service.name,
        desc: service.description,
        price: formatCurrency(service.price),
        image: artwork.image,
        position: artwork.position,
      };
    })
    : services;
  const motionReveal = reduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : revealVariants;
  const motionItem = reduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : itemVariants;

  useEffect(() => {
    let scrollFrame = 0;
    const handleScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        const viewportProgress = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1);
        const maxPageScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        const pageProgress = Math.min(window.scrollY / maxPageScroll, 1);
        landingRef.current?.style.setProperty('--landing-scroll', String(viewportProgress));
        landingRef.current?.style.setProperty('--landing-scroll-progress', String(pageProgress));
      const nextHeaderScrolled = window.scrollY > 24;
      setHeaderScrolled((current) => current === nextHeaderScrolled ? current : nextHeaderScrolled);
      });
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (sectionMenuRef.current && !sectionMenuRef.current.contains(event.target as Node)) {
        setSectionMenuOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
    };
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    setMobileMenuOpen(false);
    setSectionMenuOpen(false);
  };

  const goTo = (path: string) => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    setSectionMenuOpen(false);
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
    setMobileMenuOpen(false);
  };

  return (
    <div className="landing-page" ref={landingRef}>
      <header className={`landing-header ${headerScrolled ? 'is-scrolled' : ''}`}>
        <div className="landing-scroll-progress" aria-hidden="true" />
        <div className="landing-container landing-header-inner">
          <Link to="/" className="landing-brand" aria-label="Barbería SA, inicio">
            <img src="/logo-barberia-notittle.webp" alt="" width={50} height={50} className="landing-brand-mark" decoding="async" />
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

          <div className="landing-header-actions">
            {(!isAuthenticated || !isStaffUser) && (
              <button
                type="button"
                className="landing-button landing-button-primary landing-header-cta landing-header-booking"
                aria-label="Reservar turno"
                title="Reservar turno"
                onClick={() => goTo('/reservar')}
              >
                <span>RESERVAR</span>
                <FiCalendar aria-hidden="true" />
              </button>
            )}
            {isAuthenticated ? (
              <div className="landing-account" ref={dropdownRef}>
                <button
                  type="button"
                  className="landing-account-trigger"
                  aria-expanded={dropdownOpen}
                  onClick={() => {
                    setDropdownOpen((open) => !open);
                    setSectionMenuOpen(false);
                  }}
                >
                  <span className="landing-account-icon"><FiUser /></span>
                  <span className="landing-account-name">{displayName}</span>
                  <FiChevronDown className={dropdownOpen ? 'is-open' : ''} />
                </button>
                <AnimatePresence initial={false}>
                  {dropdownOpen && (
                  <motion.div
                    className="landing-account-menu"
                    variants={popoverVariants}
                    initial={reduceMotion ? false : 'hidden'}
                    animate={reduceMotion ? undefined : 'visible'}
                    exit={reduceMotion ? undefined : 'exit'}
                  >
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
                  </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : null}

            <div className="landing-section-menu" ref={sectionMenuRef}>
              <button
                type="button"
                className="landing-section-menu-trigger"
                aria-expanded={sectionMenuOpen}
                aria-haspopup="menu"
                aria-label={sectionMenuOpen ? 'Cerrar menú de secciones' : 'Abrir menú de secciones'}
                title={sectionMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                onClick={() => {
                  setSectionMenuOpen((open) => !open);
                  setDropdownOpen(false);
                }}
              >
                {sectionMenuOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
              </button>
              <AnimatePresence initial={false}>
                {sectionMenuOpen && (
                  <motion.div
                    className="landing-account-menu landing-section-menu-panel"
                    role="menu"
                    variants={popoverVariants}
                    initial={reduceMotion ? false : 'hidden'}
                    animate={reduceMotion ? undefined : 'visible'}
                    exit={reduceMotion ? undefined : 'exit'}
                  >
                    <div className="landing-account-section">
                      {landingNavigation.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="landing-section-menu-item"
                          role="menuitem"
                          onClick={() => scrollTo(item.id)}
                        >
                          {React.createElement(item.icon)}
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                    {!isAuthenticated && (
                      <div className="landing-account-section landing-access-section">
                        <span className="landing-account-section-title">Acceso</span>
                        <Link className="landing-access-link landing-access-link-login" to="/login" onClick={() => setSectionMenuOpen(false)}>
                          <FiUser aria-hidden="true" />
                          <span>Iniciar sesión</span>
                        </Link>
                        <Link className="landing-access-link landing-access-link-register" to="/register" onClick={() => setSectionMenuOpen(false)}>
                          <span className="landing-register-icon" aria-hidden="true"><FiUser /><FiPlus /></span>
                          <span>Crear cuenta</span>
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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

        <AnimatePresence initial={false}>
          {mobileMenuOpen && (
          <motion.div
            className="landing-mobile-menu"
            variants={mobileMenuVariants}
            initial={reduceMotion ? false : 'hidden'}
            animate={reduceMotion ? undefined : 'visible'}
            exit={reduceMotion ? undefined : 'exit'}
          >
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
                  <button type="button" onClick={() => goTo('/admin/ordenes')}>Órdenes</button>
                  <button type="button" onClick={() => goTo('/admin/perfil')}>Perfil</button>
                </>
              )}

              {isAuthenticated && !isStaffUser && (
                <>
                  <button type="button" onClick={() => goTo('/mis-turnos')}>Mis turnos</button>
                  <button type="button" onClick={() => goTo('/reservar')}>Reservar turno</button>
                  <button type="button" onClick={() => goTo('/tienda')}>Tienda</button>
                  <button type="button" onClick={() => goTo('/mis-ordenes')}>Mis órdenes</button>
                  <button type="button" onClick={() => goTo('/mi-membresia')}>Mi membresía</button>
                  <button type="button" onClick={() => goTo('/perfil')}>Perfil</button>
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
                <div className="landing-mobile-access">
                  <span>Acceso</span>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}><FiUser aria-hidden="true" /> Iniciar sesión</Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}><span className="landing-register-icon" aria-hidden="true"><FiUser /><FiPlus /></span> Crear cuenta</Link>
                </div>
              )}

              {isAuthenticated && (
                <button type="button" className="is-danger" onClick={handleLogout}>Cerrar sesión</button>
              )}

              {!isStaffUser && !isAuthenticated && (
                <button type="button" className="landing-button landing-button-primary" onClick={() => goTo('/reservar')}>Reservar turno <FiArrowUpRight /></button>
              )}
            </div>
          </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-container hero-layout">
            <motion.div
              className="hero-composition"
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
                  ease="power3.out"
                  trigger="mount"
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
                  drawDuration={1.08}
                  startDelay={0.12}
                  fillDelay={0.06}
                  stagger={0.06}
                  ease="power3.out"
                  trigger="mount"
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
                  drawDuration={1.32}
                  startDelay={0.24}
                  fillDelay={0.08}
                  stagger={0.055}
                  ease="power3.out"
                  trigger="mount"
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
                  drawDuration={1.02}
                  startDelay={0.42}
                  fillDelay={0.05}
                  stagger={0.058}
                  ease="power3.out"
                  trigger="mount"
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
                  drawDuration={1.2}
                  startDelay={0.54}
                  fillDelay={0.06}
                  stagger={0.057}
                  ease="power3.out"
                  trigger="mount"
                  fillMode="wipe"
                  fontSize={120}
                  letterSpacing={-4}
                  className="hero-stroke-component hero-word-line"
                />
              </motion.h1>

              <div
                className="hero-logo-draw"
                role="img"
                aria-label="Logo ilustrado de Barbería SA"
              />
            </motion.div>
          </div>

        </section>

        <section id="servicios" ref={servicesSectionRef} className="landing-section services-section">
          <div className="landing-container">
            <motion.div className="section-heading-split" variants={motionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}>
              <div className="section-heading">
                <span className="section-marker"><span className="section-marker-line" /> Lo que hacemos</span>
                 <h2><LandingFoldLine text="Un buen" /><br /><LandingFoldLine text="corte" /><br /><em><LandingFoldLine text="empieza acá." /></em></h2>
              </div>
              <div className="section-heading-note services-heading-note">
                <div className="services-heading-media">
                  <picture>
                    <source type="image/webp" srcSet="/hero-mobile-horizontal.webp" />
                    <img src="/hero-mobile-horizontal.jpeg" alt="Interior de Barbería SA" width={1536} height={1024} loading="lazy" decoding="async" />
                  </picture>
                  <div className="services-heading-media-copy">
                    <span className="services-heading-media-kicker">Con cada<br />servicio...</span>
                    <strong>
                      <ShinyText
                        text="Bebida incluida"
                        className="services-heading-media-shiny"
                        color="#b5b5b5"
                        shineColor="#ffffff"
                        disabled={Boolean(reduceMotion)}
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
                  key={`${service.name}-${index}`}
                  variants={motionItem}
                  initial="hidden"
                  whileInView="visible"
                  whileHover={reduceMotion ? undefined : { y: -5 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={reduceMotion ? { duration: 0 } : { delay: index * 0.08 }}
                >
                  <div className="service-card-media">
                    <img src={service.image} alt={service.name} width={760} height={1020} style={{ objectPosition: service.position }} loading="lazy" decoding="async" />
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
                <picture>
                  <source type="image/webp" srcSet="/barbershop-facade.webp" />
                  <img src="/ChatGPT%20Image%2015%20ago%202026,%2020_48_25.png" alt="Fachada de Barbería SA" width={941} height={1672} loading="lazy" decoding="async" />
                </picture>
                <div className="about-image-shade" />
              </div>
              <div className="about-info-card">
          
                <div className="about-info-row">
                  <div className="about-info-icon-wrap">
                    <FiClock className="about-info-icon" />
                  </div>
                  <div className="about-info-copy">
                    <strong>Lunes a sábados</strong>
                    <span>09:00 a 19:00</span>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div className="about-copy" variants={motionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}>
               <h2><LandingFoldLine text="Nosotros" /><br /><em><LandingFoldLine text="de verdad." /></em></h2>
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

        <section
          id="contacto"
          ref={contactRef}
          className={`landing-contact ${reduceMotion || contactInView ? 'is-in-view' : ''}`}
        >
          <div className="landing-container contact-grid">
            <motion.div className="contact-copy" variants={motionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}>
               <h2><LandingFoldLine text="Nos vemos" /><br /><em><LandingFoldLine text="en la silla." /></em></h2>
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
               <h2><LandingFoldLine text="Todo" /><br /><em><LandingFoldLine text="claro." /></em></h2>
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

        <section id="tienda" ref={shopSectionRef} className="landing-section shop-section">
          <div className="landing-container">
            <motion.div className="catalog-heading" variants={motionReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}>
              <div>
                 <h2><LandingFoldLine text="La tienda" /><br /><em><LandingFoldLine text="del barbero." /></em></h2>
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
            ) : productsError ? (
              <div className="catalog-state">
                <p>No pudimos cargar el catálogo.</p>
                <button type="button" className="landing-button landing-button-secondary" onClick={() => { void refetchProducts(); }}>
                  Reintentar
                </button>
              </div>
            ) : products.length > 0 ? (
              <div className="catalog-grid">
                {products.map((product) => <LandingProductCard key={product.id} product={product} />)}
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
            <div><Link to="/" className="landing-brand"><img src="/logo-barberia.webp" alt="" width={50} height={50} className="landing-brand-mark" decoding="async" /><span><strong>Barbería SA</strong><small>Oficio de barrio</small></span></Link><p>Oficio de barbero, agenda de hoy. Reservá tu turno en menos de un minuto.</p></div>
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
