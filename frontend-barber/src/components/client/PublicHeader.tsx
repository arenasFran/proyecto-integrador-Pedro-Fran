import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiCalendar, FiChevronDown, FiLogOut, FiUser, FiPackage, FiShoppingBag, FiAward, FiGrid } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { getAccessToken } from '../../services/api';
import { getTokenKind, getTokenUser } from '../../utils/token';
import { getStaffHome } from '../../utils/rbac';
import { Button } from '../common';

export const PublicHeader: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = useAppSelector((state) => state.auth.user);
  const isInitializing = useAppSelector((state) => state.auth.isInitializing);
  const token = getAccessToken();
  const tokenUser = getTokenUser(token);
  const role = getTokenKind(token);
  const isStaff = role === 'Admin' || role === 'Empleado';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    setDropdownOpen(false);
    navigate('/');
  };

  const isAuthenticated = Boolean(token);

  return (
    <header className="sticky top-0 z-50 border-b border-[#282828] bg-[#121212]">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
           <img src="/logo-barberia.PNG" alt="Barbería SA" className="h-10 w-auto sm:h-16" />
          <span className="hidden sm:inline text-[15px] font-bold text-white">Barbería SA</span>
        </Link>

        <div className="flex items-center gap-3">
          {isInitializing ? (
            <div className="h-9 w-24 rounded-[12px] bg-[#1A1A1A] animate-pulse" />
          ) : isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-[12px] border border-[#282828] bg-[#1A1A1A] px-3 py-1.5 text-[13px] text-white hover:border-[#FF5C00]/50 transition-colors"
              >
                <div className="rounded-full bg-[#FF5C00]/10 p-1">
                  <FiUser className="text-[#FF5C00] text-sm" />
                </div>
                <span className="hidden sm:inline">
                  {user?.name ? `${user.name}` : user?.email ?? tokenUser?.email ?? 'Usuario'}
                </span>
                <FiChevronDown
                  className={`text-[#8A8A8A] text-sm transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-[12px] border border-[#282828] bg-[#1A1A1A] py-1 shadow-lg">
                  {isStaff ? (
                    <>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate(getStaffHome(role));
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-white hover:bg-[#242424] transition-colors"
                      >
                        <FiGrid className="text-[#FF5C00]" />
                        Panel
                      </button>
                      <div className="border-t border-[#282828]" />
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-red-400 hover:bg-[#242424] transition-colors"
                      >
                        <FiLogOut />
                        Cerrar sesión
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/mis-turnos');
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-white hover:bg-[#242424] transition-colors"
                      >
                        <FiCalendar className="text-[#FF5C00]" />
                        Mis turnos
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/tienda');
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-white hover:bg-[#242424] transition-colors"
                      >
                        <FiPackage className="text-[#FF5C00]" />
                        Tienda
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/mis-ordenes');
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-white hover:bg-[#242424] transition-colors"
                      >
                        <FiShoppingBag className="text-[#FF5C00]" />
                        Mis órdenes
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/mi-membresia');
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-white hover:bg-[#242424] transition-colors"
                      >
                        <FiAward className="text-[#FF5C00]" />
                        Mi membresía
                      </button>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/perfil');
                        }}
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
                    </>
                  )}
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
    </header>
  );
};
