import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiChevronDown, FiLogOut, FiMenu, FiPlus, FiUser } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { getTokenUser } from '../../utils/token';
import { getAccessToken } from '../../services/api';
import api from '../../services/api';

interface AppHeaderProps {
  onToggleSidebar?: () => void;
  onQuickCreate?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onToggleSidebar = () => {}, onQuickCreate }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = useAppSelector((state) => state.auth.user);
  const tokenUser = getTokenUser(getAccessToken());
  const tokenKind = tokenUser?.kind;

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
      await api.post('/auth/logout');
    } catch {
      // logout optimista
    }
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#282828] bg-[#121212]">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="text-[#8A8A8A] hover:text-white transition-colors lg:hidden"
          >
            <FiMenu size={22} />
          </button>
          <button
            onClick={() => {
              if (tokenKind === 'Admin') navigate('/admin/dashboard');
              else navigate('/reservar');
            }}
            className="flex items-center gap-2"
          >
            <img src="/logo-barberia.PNG" alt="Barbería SA" className="h-16 w-auto" />
            <span className="hidden sm:inline text-[15px] font-bold text-white">Barbería SA</span>
          </button>
        </div>

        {tokenKind === 'Admin' && onQuickCreate && (
          <button
            onClick={onQuickCreate}
            className="mr-2 flex items-center gap-1.5 rounded-[10px] border border-[#FF5C00]/30 px-3 py-1.5 text-[13px] text-[#FF5C00] hover:bg-[#FF5C00]/10 transition-colors"
          >
            <FiPlus className="text-sm" />
            <span className="hidden sm:inline">Nuevo turno</span>
          </button>
        )}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-[12px] border border-[#282828] bg-[#1A1A1A] px-3 py-1.5 text-[13px] text-white hover:border-[#FF5C00]/50 transition-colors"
          >
            <div className="rounded-full bg-[#FF5C00]/10 p-1">
              <FiUser className="text-[#FF5C00] text-sm" />
            </div>
            <span className="truncate max-w-[60px] sm:max-w-[120px] md:max-w-[200px]">
              {user?.name ? `${user.name} ${user.lastname}` : user?.email ?? tokenUser?.email ?? 'Admin'}
            </span>
            <FiChevronDown className={`text-[#8A8A8A] text-sm transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-[12px] border border-[#282828] bg-[#1A1A1A] py-1 shadow-lg">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate(tokenKind === 'Admin' ? '/admin/perfil' : '/perfil');
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
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
