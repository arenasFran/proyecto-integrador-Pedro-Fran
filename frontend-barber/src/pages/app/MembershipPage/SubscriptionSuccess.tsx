import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheckCircle } from 'react-icons/fi';
import { AnimatedContainer, Button } from '../../../components/common';

export default function SubscriptionSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/mi-membresia');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <AnimatedContainer animation="fadeIn" className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-8 text-center">
        <div className="flex justify-center mb-6">
          <FiCheckCircle className="text-[#22C55E] text-5xl" />
        </div>
        <h1 className="text-[22px] font-bold text-white mb-2">¡Suscripción creada!</h1>
        <p className="text-[14px] text-[#8A8A8A] mb-8">
          Tu suscripción mensual está activa. El primer cargo se procesará en los próximos minutos.
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate('/mi-membresia')}>
            Ir a mi membresía
          </Button>
          <p className="text-[12px] text-[#555]">
            Serás redirigido automáticamente en 5 segundos...
          </p>
        </div>
      </AnimatedContainer>
    </div>
  );
}
