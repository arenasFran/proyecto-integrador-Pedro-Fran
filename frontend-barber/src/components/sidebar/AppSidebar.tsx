import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiAward, FiBarChart2, FiCalendar, FiList, FiLogOut, FiPlus, FiScissors, FiUser, FiUserCheck, FiUsers, FiX, FiPackage, FiShoppingBag } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { getAccessToken } from '../../services/api';
import { getTokenUser } from '../../utils/token';
import api from '../../services/api';

interface SidebarProps {
  onQuickCreate?: () => void;
}

const adminNavItems = [
  { to: '/admin/dashboard', icon: FiBarChart2, label: 'Métricas' },
  { to: '/admin/profesionales', icon: FiUsers, label: 'Profesionales' },
  { to: '/admin/turnos', icon: FiList, label: 'Turnos' },
  { to: '/admin/calendario', icon: FiCalendar, label: 'Calendario' },
  { to: '/admin/servicios', icon: FiScissors, label: 'Servicios' },
  { to: '/admin/productos', icon: FiPackage, label: 'Productos' },
  { to: '/admin/ordenes', icon: FiShoppingBag, label: 'Órdenes' },
  { to: '/admin/clientes', icon: FiUserCheck, label: 'Clientes' },
  { to: '/admin/membresias', icon: FiAward, label: 'Membresías' },
  { to: '/admin/perfil', icon: FiUser, label: 'Perfil' },
];

const employeeNavItems = [
  { to: '/admin/turnos', icon: FiList, label: 'Turnos' },
  { to: '/admin/calendario', icon: FiCalendar, label: 'Calendario' },
  { to: '/admin/servicios', icon: FiScissors, label: 'Servicios' },
  { to: '/admin/productos', icon: FiPackage, label: 'Productos' },
  { to: '/admin/ordenes', icon: FiShoppingBag, label: 'Órdenes' },
  { to: '/admin/clientes', icon: FiUserCheck, label: 'Clientes' },
  { to: '/admin/perfil', icon: FiUser, label: 'Perfil' },
];

const userNavItems = [
  { to: '/reservar', icon: FiScissors, label: 'Agendar' },
  { to: '/mis-turnos', icon: FiCalendar, label: 'Mis turnos' },
  { to: '/mis-ordenes', icon: FiShoppingBag, label: 'Mis órdenes' },
  { to: '/mi-membresia', icon: FiAward, label: 'Mi Membresía' },
  { to: '/tienda', icon: FiPackage, label: 'Tienda' },
  { to: '/perfil', icon: FiUser, label: 'Perfil' },
];

export const AppSidebar: React.FC<SidebarProps> = ({ onQuickCreate }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const token = getAccessToken();
  const tokenUser = token ? getTokenUser(token) : null;
  const user = useAppSelector((state) => state.auth.user);
  const kind = tokenUser?.kind;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    dispatch(logout());
    navigate('/login');
  };

  const navItems = kind === 'Admin' ? adminNavItems : kind === 'Empleado' ? employeeNavItems : userNavItems;
  const isStaff = kind === 'Admin' || kind === 'Empleado';
  const sidebarWidth = 'w-52';

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full flex flex-col
          border-r border-[#282828] bg-[#121212]
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 ${sidebarWidth}
        `}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#282828] px-4">
          <button
            onClick={() => navigate(isStaff ? '/admin/dashboard' : '/reservar')}
            className="flex items-center gap-2"
          >
            <img src="/logo-barberia.PNG" alt="Barbería SA" className="h-12 w-auto" />
            <span className="text-[15px] font-bold text-white">Barbería SA</span>
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-[#8A8A8A] hover:text-white lg:hidden"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14px] font-[400] transition-colors ${
                    isActive
                      ? 'border-l-2 border-[#FF5C00] bg-[rgba(255,92,0,0.1)] text-[#FF5C00]'
                      : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
                  }`
                }
              >
                <item.icon size={20} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="shrink-0 border-t border-[#282828] px-3 py-3">
          {isStaff && onQuickCreate && (
            <button
              onClick={onQuickCreate}
              className="mb-2 flex w-full items-center gap-2 rounded-[10px] border border-[#FF5C00]/30 px-3 py-2 text-[13px] text-[#FF5C00] hover:bg-[#FF5C00]/10 transition-colors"
            >
              <FiPlus className="text-sm" />
              <span>Nuevo turno</span>
            </button>
          )}

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-[13px] text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
            >
              <div className="rounded-full bg-[#FF5C00]/10 p-1.5">
                <FiUser className="text-[#FF5C00] text-sm" />
              </div>
              <span className="truncate flex-1 text-left">
                {user?.name ? `${user.name} ${user.lastname ?? ''}` : user?.email ?? tokenUser?.email ?? 'Usuario'}
              </span>
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 rounded-[12px] border border-[#282828] bg-[#1A1A1A] py-1 shadow-lg">
                <button
                  onClick={() => { setUserMenuOpen(false); navigate(isStaff ? '/admin/perfil' : '/perfil'); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-white hover:bg-[#242424] transition-colors"
                >
                  <FiUser className="text-[#FF5C00]" />
                  Mi perfil
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
        </div>
      </aside>
    </>
  );
};
