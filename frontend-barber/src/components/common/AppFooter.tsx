import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { getTokenUser } from '../../utils/token';
import { getAccessToken } from '../../services/api';

export const AppFooter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useAppSelector((state) => state.auth.user);
  const token = getAccessToken();
  const tokenUser = getTokenUser(token);
  const isAuthenticated = Boolean(token && tokenUser);

  const handleServicios = () => {
    if (location.pathname === '/') {
      document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  return (
    <footer className="bg-[#1A1A1A] border-t border-[#282828] px-[5vw] pt-14 pb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr] gap-10 pb-11 border-b border-white/10">
        <div>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-3">
            <img src="/logo-barberia.PNG" alt="Barbería SA" className="h-12 w-auto" />
            <span className="text-[15px] font-bold text-white">Barbería SA</span>
          </button>
          <p className="text-[#8A8A8A] text-sm leading-relaxed max-w-[280px]">
            Oficio de barbero, agenda de hoy. Reservá tu turno en menos de un minuto.
          </p>
        </div>
        <div>
          <h4 className="text-[11px] uppercase tracking-wide text-[#8A8A8A] mb-4">Navegar</h4>
          <button onClick={handleServicios} className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">
            Servicios
          </button>
          <button onClick={() => navigate('/reservar')} className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">
            Reservar
          </button>
        </div>
        <div>
          <h4 className="text-[11px] uppercase tracking-wide text-[#8A8A8A] mb-4">Cuenta</h4>
          {isAuthenticated ? (
            <button onClick={() => navigate('/mis-turnos')} className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">
              Mis turnos
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">
                Iniciar sesión
              </button>
              <button onClick={() => navigate('/register')} className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">
                Registrarse
              </button>
            </>
          )}
        </div>
        <div>
          <h4 className="text-[11px] uppercase tracking-wide text-[#8A8A8A] mb-4">Seguinos</h4>
          <a href="https://www.instagram.com/barberiasantiagoabbona/" target="_blank" rel="noopener noreferrer" className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">Instagram</a>
          <a href="#" className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">WhatsApp</a>
          <a href="#" className="block text-sm mb-3 text-white/85 hover:text-[#FF5C00] transition">Facebook</a>
        </div>
      </div>
      <div className="flex justify-between items-center pt-6 text-xs text-[#8A8A8A] flex-wrap gap-3">
        <span>&copy; {new Date().getFullYear()} Barbería SA. Todos los derechos reservados.</span>
        <span>Montevideo, Uruguay</span>
      </div>
    </footer>
  );
};
