import { FiAward, FiCalendar, FiCheckCircle, FiClock, FiTrendingUp, FiXCircle, FiScissors, FiShoppingBag } from 'react-icons/fi';
import { Navigate } from 'react-router-dom';
import { AnimatedContainer, Spinner, Button } from '../../../components/common';
import { useGetMyMembershipQuery, useCreateMembershipMutation } from '../../../services/membershipApi';
import { getAccessToken } from '../../../services/api';
import { getTokenKind } from '../../../utils/token';

export default function MembershipPage() {
  const token = getAccessToken();
  const kind = getTokenKind(token);

  const { data, isLoading } = useGetMyMembershipQuery();
  const [createMembership, { isLoading: isCreating }] = useCreateMembershipMutation();

  if (!token) return <Navigate to="/login" replace />;
  if (kind === 'Admin' || kind === 'Empleado') return <Navigate to="/admin/membresias" replace />;

  const active = data?.active;
  const history = data?.history ?? [];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const remainingCoupons = active ? active.couponsTotal - active.couponsUsed : 0;
  const daysLeft = active
    ? Math.max(0, Math.ceil((new Date(active.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handlePurchase = async () => {
    try {
      const user = JSON.parse(atob(token.split('.')[1]));
      await createMembership({ userId: user.id }).unwrap();
    } catch {
      // handled by RTK
    }
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <AnimatedContainer animation="fadeInDown">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FF5C00]/10">
              <FiAward className="text-[#FF5C00] text-lg" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-white">Mi Membresía</h1>
              <p className="text-[13px] text-[#8A8A8A]">Gestioná tu membresía y cupones</p>
            </div>
          </div>
        </AnimatedContainer>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : active ? (
          <>
            <AnimatedContainer animation="fadeInUp" delay={0.1}>
              <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-6 mb-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
                      <span className="text-[13px] font-medium text-[#22C55E]">Activa</span>
                    </div>
                    <h2 className="text-[24px] font-bold text-white">Membresía Mensual</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-[#8A8A8A]">Vence el</p>
                    <p className="text-[14px] font-semibold text-white flex items-center gap-1">
                      <FiCalendar className="text-[#FF5C00] text-sm" />
                      {formatDate(active.endDate)}
                    </p>
                  </div>
                </div>

                <div className="rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-5 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] text-[#8A8A8A]">Cupones de corte disponibles</span>
                    <span className="text-[22px] font-bold text-white">
                        {remainingCoupons}
                      <span className="text-[14px] text-[#8A8A8A]"> / {active.couponsTotal}</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#282828] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#FF5C00] transition-all duration-500"
                      style={{ width: `${(active.couponsUsed / active.couponsTotal) * 100}%` }}
                    />
                  </div>
                  <p className="text-[12px] text-[#8A8A8A] mt-2">
                    {remainingCoupons > 0
                      ? `Te ${remainingCoupons === 1 ? 'queda' : 'quedan'} ${remainingCoupons} corte${remainingCoupons === 1 ? '' : 's'} este mes`
                      : 'Ya usaste todos tus cupones este mes'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FiCheckCircle className="text-[#22C55E] text-sm" />
                      <span className="text-[11px] text-[#8A8A8A]">Usados</span>
                    </div>
                    <span className="text-[18px] font-bold text-white">{active.couponsUsed}</span>
                  </div>
                  <div className="rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FiClock className="text-[#FF5C00] text-sm" />
                      <span className="text-[11px] text-[#8A8A8A]">Días restantes</span>
                    </div>
                    <span className="text-[18px] font-bold text-white">{daysLeft}</span>
                  </div>
                </div>

                <div className="mt-4 rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FiShoppingBag className="text-[#FF5C00] text-sm" />
                    <span className="text-[11px] text-[#8A8A8A]">Descuento en productos</span>
                  </div>
                  <span className="text-[18px] font-bold text-white">{active.productDiscount}% OFF</span>
                  <p className="text-[11px] text-[#555] mt-1">Próximamente disponible</p>
                </div>
              </div>
            </AnimatedContainer>

            {history.length > 1 && (
              <AnimatedContainer animation="fadeInUp" delay={0.2}>
                <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-6">
                  <h3 className="text-[15px] font-semibold text-white mb-4">Historial</h3>
                  <div className="space-y-3">
                    {history.slice(1).map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-[12px] bg-[#1A1A1A] border border-[#282828] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-[8px] ${
                            m.status === 'expired' ? 'bg-[#8A8A8A]/10' : 'bg-red-500/10'
                          }`}>
                            {m.status === 'expired'
                              ? <FiCheckCircle className="text-[#8A8A8A] text-sm" />
                              : <FiXCircle className="text-red-400 text-sm" />}
                          </div>
                          <div>
                            <p className="text-[13px] text-white font-medium">
                              {m.status === 'expired' ? 'Vencida' : 'Cancelada'}
                            </p>
                            <p className="text-[11px] text-[#8A8A8A]">{formatDate(m.startDate)} - {formatDate(m.endDate)}</p>
                          </div>
                        </div>
                        <span className="text-[12px] text-[#8A8A8A]">
                          {m.couponsUsed}/{m.couponsTotal} usados
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedContainer>
            )}
          </>
        ) : (
          <AnimatedContainer animation="fadeInUp" delay={0.1}>
            <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-[#FF5C00]/10">
                  <FiAward className="text-[#FF5C00] text-4xl" />
                </div>
              </div>
              <h2 className="text-[22px] font-bold text-white mb-2">Membresía Mensual</h2>
              <p className="text-[14px] text-[#8A8A8A] max-w-md mx-auto mb-8">
                Adquirí tu membresía y obtené 4 cortes por mes más un 10% de descuento en productos.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
                <div className="rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-4 text-left">
                  <FiScissors className="text-[#FF5C00] text-lg mb-2" />
                  <p className="text-[14px] font-semibold text-white">4 Cortes por mes</p>
                  <p className="text-[12px] text-[#8A8A8A]">Canjeá uno por cada visita</p>
                </div>
                <div className="rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-4 text-left">
                  <FiTrendingUp className="text-[#FF5C00] text-lg mb-2" />
                  <p className="text-[14px] font-semibold text-white">10% OFF en productos</p>
                  <p className="text-[12px] text-[#8A8A8A]">Descuento en productos de barbería</p>
                </div>
              </div>

              <Button loading={isCreating} onClick={handlePurchase}>
                Adquirir membresía
              </Button>
            </div>
          </AnimatedContainer>
        )}

        {history.length > 0 && !active && (
          <AnimatedContainer animation="fadeInUp" delay={0.2}>
            <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-6 mt-6">
              <h3 className="text-[15px] font-semibold text-white mb-4">Membresías anteriores</h3>
              <div className="space-y-3">
                {history.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-[12px] bg-[#1A1A1A] border border-[#282828] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#8A8A8A]/10">
                        <FiCalendar className="text-[#8A8A8A] text-sm" />
                      </div>
                      <div>
                        <p className="text-[13px] text-white font-medium">
                          {formatDate(m.startDate)} - {formatDate(m.endDate)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[12px] text-[#8A8A8A]">
                      {m.couponsUsed}/{m.couponsTotal} usados
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedContainer>
        )}
      </div>
    </div>
  );
}
