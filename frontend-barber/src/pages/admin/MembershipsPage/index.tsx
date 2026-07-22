import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { FiAward, FiPlus, FiSearch, FiUser, FiCheck, FiClock, FiAlertTriangle, FiDollarSign, FiList } from 'react-icons/fi';
import { AnimatedContainer, Button, Pagination, Select, Spinner, useToast } from '../../../components/common';
import {
  useGetAllMembershipsQuery,
  useGetPendingMembershipsQuery,
  useGetExpiringSoonQuery,
  useGetTransactionsQuery,
  useApprovePendingMembershipMutation,
  useAddCouponsMutation,
} from '../../../services/membershipApi';
import { getAccessToken } from '../../../services/api';
import { getTokenKind } from '../../../utils/token';
import { CreateMembershipModal } from './components/CreateMembershipModal';
import type { MembershipStatus, MembershipWithUser } from '../../../types/membership';
import { formatDate } from '../../../utils/formatDate';
import { formatCurrency } from '../../../utils/formatCurrency';

const STATUS_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'expired', label: 'Vencidas' },
];

const TRANSACTION_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'local', label: 'Local' },
];

const DATE_PRESETS = [
  { value: '', label: 'Todo' },
  { value: '1', label: 'Hoy' },
  { value: '2', label: 'Ayer' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

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
  const [tab, setTab] = useState<'memberships' | 'transactions'>('memberships');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expireDays, setExpireDays] = useState('5');

  const [txPage, setTxPage] = useState(1);
  const [txPaymentMethod, setTxPaymentMethod] = useState('');
  const [txDatePreset, setTxDatePreset] = useState('');

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

  const txDesde = txDatePreset ? new Date(Date.now() - Number(txDatePreset) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined;
  const { data: txData, isLoading: txLoading } = useGetTransactionsQuery({
    paymentMethod: txPaymentMethod || undefined,
    desde: txDesde,
    page: txPage,
    limit: 20,
  });

  const memberships = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;
  const pending = pendingData?.data ?? [];
  const expiring = expiringData?.data ?? [];
  const transactions = txData?.data ?? [];
  const txTotalPages = txData?.totalPages ?? 1;

  if (!token || (kind !== 'Admin' && kind !== 'Empleado')) return <Navigate to="/login" replace />;

  const handleApprove = async (id: string) => {
    try {
      await approvePending(id).unwrap();
      showToast('Membresía aprobada', 'success');
    } catch {
      showToast('Error al aprobar', 'error');
    }
  };

  const getDateRangeLabel = () => {
    if (!txDatePreset) return '';
    const d = new Date();
    d.setDate(d.getDate() - Number(txDatePreset));
    return `${formatDate(d.toISOString())} - ${formatDate(new Date().toISOString())}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <AnimatedContainer animation="fadeInDown">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FF5C00]/10">
              <FiAward className="text-[#FF5C00] text-lg" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-white">Membresías</h1>
              <p className="text-[13px] text-[#8A8A8A]">Gestioná las membresías de los clientes</p>
            </div>
          </div>
          <Button icon={FiPlus} onClick={() => setShowCreate(true)}>Nueva membresía</Button>
        </div>
      </AnimatedContainer>

      {/* ===== TABS ===== */}
      <div className="flex gap-1 rounded-[10px] bg-[#1A1A1A] p-1 w-fit">
        <button
          onClick={() => setTab('memberships')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
            tab === 'memberships' ? 'bg-[#FF5C00]/15 text-[#FF5C00]' : 'text-[#8A8A8A] hover:text-white'
          }`}
        >
          <FiAward size={14} /> Membresías
        </button>
        <button
          onClick={() => setTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
            tab === 'transactions' ? 'bg-[#FF5C00]/15 text-[#FF5C00]' : 'text-[#8A8A8A] hover:text-white'
          }`}
        >
          <FiList size={14} /> Historial de pagos
        </button>
      </div>

      {tab === 'memberships' ? (
        <>
          {/* ===== PENDING PANEL ===== */}
          <AnimatedContainer animation="fadeInUp" delay={0.05}>
            <div className="rounded-[16px] border border-[#FFB800]/20 bg-[#121212] p-5">
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
                    <div key={m.id} className="flex items-center justify-between rounded-[10px] bg-[#1A1A1A] border border-[#282828] px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FiUser className="text-[#FF5C00] text-sm shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[13px] text-white font-medium truncate">
                            {m.user?.name ?? '—'} {m.user?.lastname ?? ''}
                          </p>
                          <p className="text-[11px] text-[#8A8A8A]">
                            {m.paymentMethod === 'mercadopago' ? 'Iniciado por MercadoPago' : 'Solicitado por cliente'}
                          </p>
                        </div>
                      </div>
                      <Button icon={FiCheck} variant="primary" onClick={() => handleApprove(m.id)} loading={isApproving} size="sm">
                        Marcar pagada
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AnimatedContainer>

          {/* ===== EXPIRING SOON PANEL ===== */}
          <AnimatedContainer animation="fadeInUp" delay={0.05}>
            <div className="rounded-[16px] border border-[#FF5C00]/20 bg-[#121212] p-5">
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
                    <div key={m.id} className="flex items-center justify-between rounded-[10px] bg-[#1A1A1A] border border-[#282828] px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FiUser className="text-[#FF5C00] text-sm shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[13px] text-white font-medium truncate">
                            {m.user?.name ?? '—'} {m.user?.lastname ?? ''}
                          </p>
                          <p className="text-[11px] text-[#8A8A8A]">Vence {formatFullDate(m.endDate)}</p>
                        </div>
                      </div>
                      <span className={`text-[12px] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
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

          {/* ===== MAIN TABLE ===== */}
          <AnimatedContainer animation="fadeInUp" delay={0.1}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A6A]" size={16} />
                <input type="text" placeholder="Buscar cliente..." value={search} onChange={handleSearch}
                  className="w-full rounded-[10px] bg-[#1A1A1A] border border-[#282828] pl-10 pr-3 py-2 text-[13px] text-white placeholder-[#6A6A6A] focus:outline-none focus:border-[#FF5C00]/50" />
              </div>
              <Select options={STATUS_FILTERS.map(f => ({ value: f.value, label: f.label }))} value={statusFilter} onChange={handleStatusFilter} />
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
              <div className="hidden md:block overflow-x-auto rounded-[12px] border border-[#282828]">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[#121212] border-b border-[#282828]">
                      <th className="text-left px-4 py-3 text-[10px] text-[#6A6A6A] uppercase font-medium">Cliente</th>
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
                            <FiUser className="text-[#FF5C00] text-sm shrink-0" />
                            <span className="text-white font-medium truncate">{m.user?.name ?? '—'} {m.user?.lastname ?? ''}</span>
                          </div>
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
                            disabled={isAddingCoupons}
                            className="ml-2 text-[#22C55E] hover:text-[#16A34A] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#22C55E]/30 hover:border-[#22C55E] transition-colors"
                            title="Agregar cupones"
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
              {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
            </AnimatedContainer>
          )}
        </>
      ) : (
        <>
          {/* ===== TRANSACTION HISTORY ===== */}
          <AnimatedContainer animation="fadeInUp" delay={0.05}>
            <div className="flex flex-wrap gap-3 items-center">
              <Select options={DATE_PRESETS.map(o => ({ value: o.value, label: o.label }))} value={txDatePreset} onChange={(v) => { setTxDatePreset(v); setTxPage(1); }} />
              <Select options={TRANSACTION_FILTERS.map(o => ({ value: o.value, label: o.label }))} value={txPaymentMethod} onChange={(v) => { setTxPaymentMethod(v as string); setTxPage(1); }} />
              {txDatePreset && <span className="text-[11px] text-[#8A8A8A]">{getDateRangeLabel()}</span>}
            </div>
          </AnimatedContainer>

          {txLoading ? (
            <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          ) : transactions.length === 0 ? (
            <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-12 text-center">
              <FiDollarSign size={48} className="mx-auto text-[#282828] mb-3" />
              <p className="text-[#8A8A8A] text-sm">No hay transacciones registradas</p>
            </div>
          ) : (
            <AnimatedContainer animation="fadeInUp" delay={0.1}>
              <div className="hidden md:block overflow-x-auto rounded-[12px] border border-[#282828]">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[#121212] border-b border-[#282828]">
                      <th className="text-left px-4 py-3 text-[10px] text-[#6A6A6A] uppercase font-medium">Fecha</th>
                      <th className="text-left px-4 py-3 text-[10px] text-[#6A6A6A] uppercase font-medium">Membresía ID</th>
                      <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase font-medium">Monto</th>
                      <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase font-medium">Método</th>
                      <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase font-medium">Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-[#282828]/50 hover:bg-[#1A1A1A] transition-colors">
                        <td className="px-4 py-3 text-[#8A8A8A]">{formatDate(tx.createdAt)}</td>
                        <td className="px-4 py-3 text-white font-mono text-[11px]">{tx.membershipId.slice(-8)}</td>
                        <td className="px-4 py-3 text-center text-[#22C55E] font-semibold">{formatCurrency(tx.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[11px] rounded-full px-2 py-0.5 ${tx.paymentMethod === 'mercadopago' ? 'bg-[#009EE3]/10 text-[#009EE3]' : 'bg-[#22C55E]/10 text-[#22C55E]'}`}>
                            {tx.paymentMethod === 'mercadopago' ? 'MercadoPago' : 'Local'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-[#8A8A8A] text-[11px]">{tx.createdBy === 'admin' ? 'Admin' : 'Cliente'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {txTotalPages > 1 && <Pagination currentPage={txPage} totalPages={txTotalPages} onPageChange={setTxPage} />}
            </AnimatedContainer>
          )}
        </>
      )}

      <CreateMembershipModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
