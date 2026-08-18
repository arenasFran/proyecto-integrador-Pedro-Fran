import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { FiAward, FiPlus, FiSearch, FiCheck, FiClock, FiAlertTriangle, FiFilter, FiXCircle } from 'react-icons/fi';
import { AnimatedContainer, BarberAvatar, Button, Pagination, Select, Spinner, useToast, type SelectOption } from '../../../components/common';
import {
  useGetAllMembershipsQuery,
  useGetPendingMembershipsQuery,
  useGetExpiringSoonQuery,
  useApprovePendingMembershipMutation,
  useAddCouponsMutation,
} from '../../../services/membershipApi';
import { getAccessToken } from '../../../services/api';
import { getTokenKind } from '../../../utils/token';
import { CreateMembershipModal } from './components/CreateMembershipModal';
import type { MembershipStatus, MembershipWithUser } from '../../../types/membership';
import { formatDate } from '../../../utils/formatDate';
import AdminPageHeader from '../components/AdminPageHeader';

type FilterOption = SelectOption & { icon: React.ReactNode };

const STATUS_FILTERS: FilterOption[] = [
  { value: '', label: 'Todas', icon: <FiFilter size={14} /> },
  { value: 'active', label: 'Activas', icon: <FiAward size={14} /> },
  { value: 'pending', label: 'Pendientes', icon: <FiClock size={14} /> },
  { value: 'expired', label: 'Vencidas', icon: <FiXCircle size={14} /> },
];

const renderFilterOption = (option: SelectOption, isSelected: boolean) => {
  const opt = option as FilterOption;
  return (
    <span className={`flex items-center gap-2 ${isSelected ? 'text-[#FF5C00]' : 'text-white'}`}>
      <span className={isSelected ? 'text-[#FF5C00]' : 'text-[#8A8A8A]'}>{opt.icon}</span>
      <span>{opt.label}</span>
    </span>
  );
};

const EXPIRE_DAYS_OPTIONS = [
  { value: '3', label: '3 días' },
  { value: '5', label: '5 días' },
  { value: '7', label: '7 días' },
  { value: '10', label: '10 días' },
];

const statusBadge = (status: MembershipStatus) => {
  const styles: Record<MembershipStatus, string> = {
    active: 'bg-[#22C55E]/10 text-[#22C55E]',
    pending: 'bg-[#FFB800]/10 text-[#FFB800]',
    expired: 'bg-[#8A8A8A]/10 text-[#8A8A8A]',
  };
  const labels: Record<MembershipStatus, string> = { active: 'Activa', pending: 'Pendiente', expired: 'Vencida' };
  return (
    <span className={`text-[11px] font-medium rounded-full px-2.5 py-0.5 ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const formatFullDate = (d: string) => new Date(d).toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' });

export default function MembershipsPage() {
  const token = getAccessToken();
  const kind = getTokenKind(token);
  const { showToast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expireDays, setExpireDays] = useState('5');

  const [approvePending, { isLoading: isApproving }] = useApprovePendingMembershipMutation();
  const [addCoupons, { isLoading: isAddingCoupons }] = useAddCouponsMutation();

  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); };

  const { data: result, isLoading } = useGetAllMembershipsQuery({
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    limit: 20,
  });
  const { data: pendingData } = useGetPendingMembershipsQuery();
  const { data: expiringData } = useGetExpiringSoonQuery({ days: Number(expireDays) });

  const memberships = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;
  const pending = pendingData?.data ?? [];
  const expiring = expiringData?.data ?? [];

  if (!token || (kind !== 'Admin' && kind !== 'Empleado')) return <Navigate to="/login" replace />;

  const handleApprove = async (id: string) => {
    try {
      await approvePending(id).unwrap();
      showToast('Membresía aprobada', 'success');
    } catch {
      showToast('Error al aprobar', 'error');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5">
<AnimatedContainer animation="fadeInDown">
        <AdminPageHeader icon={FiAward} title="Membresías" description="Gestioná las membresías de los clientes" action={<Button icon={FiPlus} onClick={() => setShowCreate(true)}>Nueva membresía</Button>} />
      </AnimatedContainer>

{/* ===== MAIN TABLE ===== */}
          <AnimatedContainer animation="fadeInUp" delay={0.1}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A6A]" size={16} />
                <input type="text" placeholder="Buscar cliente..." value={search} onChange={handleSearch}
                  className="w-full rounded-[10px] bg-[#1A1A1A] border border-[#282828] pl-10 pr-3 py-2 text-[13px] text-white placeholder-[#6A6A6A] focus:outline-none focus:border-[#FF5C00]/50" />
              </div>
              <Select options={STATUS_FILTERS.map(f => ({ value: f.value, label: f.label }))} value={statusFilter} onChange={handleStatusFilter} renderOption={renderFilterOption} />
            </div>
          </AnimatedContainer>

          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : memberships.length === 0 ? (
            <AnimatedContainer animation="fadeInUp" delay={0.1}>
              <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-12 text-center">
                <FiAward size={48} className="mx-auto text-[#282828] mb-3" />
                <p className="text-[#8A8A8A] text-sm mb-1">No hay membresías{statusFilter ? ' con ese filtro' : ''}</p>
                <p className="text-[12px] text-[#555]">{statusFilter ? 'Probá con otro filtro' : 'Creá la primera membresía'}</p>
              </div>
            </AnimatedContainer>
          ) : (
            <AnimatedContainer animation="fadeInUp" delay={0.1}>
              <div className="hidden lg:block overflow-x-auto rounded-[12px] border border-[#282828]">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[#121212] border-b border-[#282828]">
                      <th className="text-left px-4 py-3 text-[10px] text-[#6A6A6A] uppercase font-medium">Cliente</th>
                      <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase font-medium">Tipo</th>
                      <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase font-medium">Estado</th>
                      <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase font-medium">Cupones</th>
                      <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase font-medium">Vigencia</th>
                      <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase font-medium">Vence</th>
                      <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase font-medium">Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberships.map((m: MembershipWithUser) => (
                      <tr key={m.id} className="border-b border-[#282828]/50 hover:bg-[#1A1A1A] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <BarberAvatar name={m.user?.name ?? ''} lastname={m.user?.lastname ?? ''} photoUrl={m.user?.photoUrl ?? null} size="sm" />
                            <span className="text-white font-medium truncate">{m.user?.name ?? '—'} {m.user?.lastname ?? ''}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[11px] text-[#8A8A8A]">
                            {m.paymentMethod === 'mercadopago' ? 'Pago único' : m.paymentMethod === 'local' ? 'Local' : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{statusBadge(m.status)}</td>
                        <td className="px-4 py-3 text-center text-white">
                          {m.couponsTotal - m.couponsUsed}
                          <span className="text-[#8A8A8A]">/{m.couponsTotal}</span>
                          <button
                            onClick={async () => {
                              const count = prompt('Cantidad de cupones a agregar:');
                              if (count && !isNaN(Number(count)) && Number(count) > 0) {
                                try {
                                  await addCoupons({ id: m.id, count: Number(count) }).unwrap();
                                  showToast('Cupones agregados correctamente', 'success');
                                } catch {
                                  showToast('Error al agregar cupones', 'error');
                                }
                              }
                            }}
                            disabled={isAddingCoupons || m.status === 'expired'}
                            className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                              m.status === 'expired'
                                ? 'cursor-not-allowed text-[#444] border-[#282828]'
                                : 'text-[#22C55E] hover:text-[#16A34A] border-[#22C55E]/30 hover:border-[#22C55E]'
                            }`}
                            title={m.status === 'expired' ? 'Membresía vencida: no se pueden agregar cupones' : 'Agregar cupones'}
                          >+</button>
                        </td>
                        <td className="px-4 py-3 text-center text-[#8A8A8A]">{m.durationDays} días</td>
                        <td className="px-4 py-3 text-center text-[#8A8A8A] text-[12px]">{formatDate(m.endDate)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[11px] text-[#6A6A6A]">{m.paymentMethod === 'mercadopago' ? 'MP' : m.paymentMethod === 'local' ? 'Local' : '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 lg:hidden">
                 {memberships.map((m: MembershipWithUser) => (
                   <div key={m.id} className="rounded-[14px] border border-[#282828] bg-[#1A1A1A] p-4">
                     <div className="flex items-start justify-between gap-3">
                       <div className="flex min-w-0 items-center gap-3">
                         <BarberAvatar name={m.user?.name ?? ''} lastname={m.user?.lastname ?? ''} photoUrl={m.user?.photoUrl ?? null} size="sm" />
                         <div className="min-w-0">
                           <p className="break-words text-[14px] font-semibold text-white">{m.user?.name ?? '—'} {m.user?.lastname ?? ''}</p>
                           <p className="text-[11px] text-[#8A8A8A]">{m.paymentMethod === 'mercadopago' ? 'Pago único' : m.paymentMethod === 'local' ? 'Pago local' : 'Sin método'}</p>
                         </div>
                       </div>
                       {statusBadge(m.status)}
                     </div>
                     <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                       <span className="text-[#6A6A6A]">Cupones</span>
                       <span className="text-right text-white">
                         {m.couponsTotal - m.couponsUsed}/{m.couponsTotal}
                         <button
                           onClick={async () => {
                             const count = prompt('Cantidad de cupones a agregar:');
                             if (count && !isNaN(Number(count)) && Number(count) > 0) {
                               try {
                                 await addCoupons({ id: m.id, count: Number(count) }).unwrap();
                                 showToast('Cupones agregados correctamente', 'success');
                               } catch {
                                 showToast('Error al agregar cupones', 'error');
                               }
                             }
                           }}
                           disabled={isAddingCoupons || m.status === 'expired'}
                           className={`ml-2 rounded border px-1.5 py-0.5 text-[10px] font-bold transition-colors ${m.status === 'expired' ? 'cursor-not-allowed border-[#282828] text-[#444]' : 'border-[#22C55E]/30 text-[#22C55E] hover:border-[#22C55E] hover:text-[#16A34A]'}`}
                           aria-label="Agregar cupones"
                         >+</button>
                       </span>
                       <span className="text-[#6A6A6A]">Vigencia</span>
                       <span className="text-right text-[#8A8A8A]">{m.durationDays} días</span>
                       <span className="text-[#6A6A6A]">Vence</span>
                       <span className="text-right text-[#8A8A8A]">{formatDate(m.endDate)}</span>
                     </div>
                   </div>
                 ))}
               </div>
              {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
            </AnimatedContainer>
          )}

      {/* ===== PENDING + EXPIRING PANELS ===== */}
          <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-stretch">
            <AnimatedContainer animation="fadeInUp" delay={0.05} className="w-full lg:w-1/3">
              <div className="h-full rounded-[16px] border border-[#FFB800]/20 bg-[#121212] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FiClock className="text-[#FFB800]" size={16} />
                  <h2 className="text-[14px] font-semibold text-white">Membresías pendientes</h2>
                  {pending.length > 0 && (
                    <span className="text-[11px] bg-[#FFB800]/15 text-[#FFB800] rounded-full px-2 py-0.5">{pending.length}</span>
                  )}
                </div>
                {pending.length === 0 ? (
                  <div className="text-center py-6">
                    <FiCheck size={28} className="mx-auto text-[#282828] mb-2" />
                    <p className="text-[13px] text-[#8A8A8A]">No hay membresías pendientes de aprobación</p>
                    <p className="text-[11px] text-[#555] mt-1">Las membresías iniciadas por clientes aparecerán aquí</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {pending.map((m: MembershipWithUser) => (
                      <div key={m.id} className="flex flex-col gap-3 rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <BarberAvatar name={m.user?.name ?? ''} lastname={m.user?.lastname ?? ''} photoUrl={m.user?.photoUrl ?? null} size="sm" />
                          <div className="min-w-0">
                            <p className="text-[13px] text-white font-medium truncate">
                              {m.user?.name ?? '—'} {m.user?.lastname ?? ''}
                            </p>
                            <p className="text-[11px] text-[#8A8A8A]">
                              {m.paymentMethod === 'mercadopago' ? 'Iniciado por MercadoPago' : 'Solicitado por cliente'}
                            </p>
                          </div>
                        </div>
                        <Button icon={FiCheck} variant="primary" onClick={() => handleApprove(m.id)} loading={isApproving} size="sm" className="w-full sm:w-auto">
                          Marcar pagada
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AnimatedContainer>

            <AnimatedContainer animation="fadeInUp" delay={0.05} className="w-full lg:w-1/3">
              <div className="h-full rounded-[16px] border border-[#FF5C00]/20 bg-[#121212] p-5">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <FiAlertTriangle className="text-[#FF5C00]" size={16} />
                  <h2 className="text-[14px] font-semibold text-white">Por vencer</h2>
                  <Select
                    options={EXPIRE_DAYS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                    value={expireDays}
                    onChange={setExpireDays}
                  />
                  {expiring.length > 0 && (
                    <span className="text-[11px] bg-[#FF5C00]/15 text-[#FF5C00] rounded-full px-2 py-0.5">{expiring.length}</span>
                  )}
                </div>
                {expiring.length === 0 ? (
                  <div className="text-center py-6">
                    <FiCheck size={28} className="mx-auto text-[#282828] mb-2" />
                    <p className="text-[13px] text-[#8A8A8A]">Ninguna membresía vence en los próximos {expireDays} días</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {expiring.map((m: MembershipWithUser & { daysLeft: number }) => (
                      <div key={m.id} className="flex flex-col gap-3 rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <BarberAvatar name={m.user?.name ?? ''} lastname={m.user?.lastname ?? ''} photoUrl={m.user?.photoUrl ?? null} size="sm" />
                          <div className="min-w-0">
                            <p className="text-[13px] text-white font-medium truncate">
                              {m.user?.name ?? '—'} {m.user?.lastname ?? ''}
                            </p>
                            <p className="text-[11px] text-[#8A8A8A]">Vence {formatFullDate(m.endDate)}</p>
                          </div>
                        </div>
                        <span className={`self-end text-[12px] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-full sm:self-auto ${
                          m.daysLeft <= 2 ? 'bg-red-500/10 text-red-400' : 'bg-[#FF5C00]/10 text-[#FF5C00]'
                        }`}>
                          <FiClock size={12} />
                          {m.daysLeft === 0 ? 'Hoy' : m.daysLeft === 1 ? 'Mañana' : `${m.daysLeft} días`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AnimatedContainer>
          </div>

      {kind === 'Admin' && <CreateMembershipModal isOpen={showCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
