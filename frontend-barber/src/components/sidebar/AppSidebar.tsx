import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiBarChart2, FiCalendar, FiChevronLeft, FiChevronRight, FiList, FiScissors, FiUser, FiUsers, FiX } from 'react-icons/fi';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onCloseMobile: () => void;
  mobileOpen: boolean;
  kind: string | null;
}

const adminNavItems = [
  { to: '/admin/dashboard', icon: FiBarChart2, label: 'Métricas' },
  { to: '/admin/profesionales', icon: FiUsers, label: 'Profesionales' },
  { to: '/admin/turnos',     icon: FiList, label: 'Turnos' },
  { to: '/admin/calendario', icon: FiCalendar, label: 'Calendario' },
  { to: '/admin/servicios', icon: FiScissors, label: 'Servicios' },
  { to: '/admin/perfil', icon: FiUser, label: 'Perfil' },
];

const employeeNavItems = [
  { to: '/admin/turnos', icon: FiList, label: 'Turnos' },
  { to: '/admin/calendario', icon: FiCalendar, label: 'Calendario' },
  { to: '/admin/perfil', icon: FiUser, label: 'Perfil' },
];

const userNavItems = [
  { to: '/reservar', icon: FiScissors, label: 'Agendar' },
  { to: '/mis-turnos', icon: FiCalendar, label: 'Mis turnos' },
  { to: '/perfil', icon: FiUser, label: 'Perfil' },
];

export const AppSidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, onCloseMobile, mobileOpen, kind }) => {
  const navItems = kind === 'Admin' ? adminNavItems : kind === 'Empleado' ? employeeNavItems : userNavItems;
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full flex flex-col
          border-r border-[#282828] bg-[#121212]
          transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${collapsed ? 'w-16' : 'w-60'}
        `}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#282828] px-4">
          {!collapsed && (
            <span className="text-sm font-semibold text-white">Barbería SA</span>
          )}
          <button
            onClick={onCloseMobile}
            className="ml-auto text-[#8A8A8A] hover:text-white lg:hidden"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center px-3">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-[12px] py-2.5 text-[14px] font-[400] transition-colors group relative ${
                    collapsed
                      ? 'justify-center px-0'
                      : 'px-3'
                  } ${
                    isActive
                      ? 'border-l-2 border-[#FF5C00] bg-[rgba(255,92,0,0.1)] text-[#FF5C00]'
                      : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
                  }`
                }
              >
                <item.icon size={20} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {collapsed && (
                  <div className="invisible absolute left-full ml-2 z-50 whitespace-nowrap rounded-md border border-[#282828] bg-[#1A1A1A] px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100">
                    {item.label}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 justify-center pb-4">
          <button
            onClick={onToggle}
            className="hidden text-[#8A8A8A] hover:text-white transition-colors lg:block"
          >
            {collapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
          </button>
        </div>
      </aside>
    </>
  );
};
