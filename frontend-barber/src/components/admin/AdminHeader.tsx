import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiChevronDown, FiLogOut, FiScissors, FiUser } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { getTokenUser } from '../../utils/token';
import { getAccessToken } from '../../services/api';
import api from '../../services/api';

export const AdminHeader: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = useAppSelector((state) => state.auth.user);
  const tokenUser = getTokenUser(getAccessToken());

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
    <header className="sticky top-0 z-50 border-b border-[#282828] bg-[#121212]">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/admin/profesionales')}
          className="flex items-center gap-2 text-[14px] font-semibold text-white hover:text-[#FF5C00] transition-colors"
        >
          <FiScissors className="text-[#FF5C00]" />
          Barbería SA
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-[12px] border border-[#282828] bg-[#1A1A1A] px-3 py-1.5 text-[13px] text-white hover:border-[#FF5C00]/50 transition-colors"
          >
            <div className="rounded-full bg-[#FF5C00]/10 p-1">
              <FiUser className="text-[#FF5C00] text-sm" />
            </div>
            <span>
              {user?.name ? `${user.name} ${user.lastname}` : user?.email ?? tokenUser?.email ?? 'Admin'}
            </span>
            <FiChevronDown className={`text-[#8A8A8A] text-sm transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-[12px] border border-[#282828] bg-[#1A1A1A] py-1 shadow-lg">
                <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/admin/perfil');
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-white hover:bg-[#242424] transition-colors"
                  >
                    <FiUser className="text-[#FF5C00]" />
                    Mi perfil
                  </button>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/admin/turnos');
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-[13px] text-white hover:bg-[#242424] transition-colors"
                  >
                    <FiCalendar className="text-[#FF5C00]" />
                    Turnos
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
