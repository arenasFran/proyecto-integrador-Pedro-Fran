import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { FiAward, FiPlus, FiSearch, FiCalendar, FiUser } from 'react-icons/fi';
import { AnimatedContainer, Button, Select, Spinner } from '../../../components/common';
import { useGetAllMembershipsQuery } from '../../../services/membershipApi';
import { getAccessToken } from '../../../services/api';
import { getTokenKind } from '../../../utils/token';
import { CreateMembershipModal } from './components/CreateMembershipModal';
import type { MembershipStatus } from '../../../types/membership';

const STATUS_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'active', label: 'Activas' },
  { value: 'expired', label: 'Vencidas' },
  { value: 'cancelled', label: 'Canceladas' },
];

const statusBadge = (status: MembershipStatus) => {
  const styles: Record<MembershipStatus, string> = {
    active: 'bg-[#22C55E]/10 text-[#22C55E]',
    expired: 'bg-[#8A8A8A]/10 text-[#8A8A8A]',
    cancelled: 'bg-red-500/10 text-red-400',
  };
  const labels: Record<MembershipStatus, string> = {
    active: 'Activa',
    expired: 'Vencida',
    cancelled: 'Cancelada',
  };
  return (
    <span className={`text-[11px] font-medium rounded-full px-2.5 py-0.5 ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export default function MembershipsPage() {
  const token = getAccessToken();
  const kind = getTokenKind(token);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: memberships = [], isLoading } = useGetAllMembershipsQuery({
    status: statusFilter || undefined,
    search: search || undefined,
  });

  if (!token || (kind !== 'Admin' && kind !== 'Empleado')) {
    return <Navigate to="/login" replace />;
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
          <Button icon={FiPlus} onClick={() => setShowCreate(true)}>
            Nueva membresía
          </Button>
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="fadeInUp" delay={0.05}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A6A]" size={16} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-[10px] bg-[#1A1A1A] border border-[#282828] pl-10 pr-3 py-2 text-[13px] text-white placeholder-[#6A6A6A] focus:outline-none focus:border-[#FF5C00]/50"
            />
          </div>
          <div className="w-full sm:w-40">
            <Select
              label="Estado"
              options={STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
            />
          </div>
        </div>
      </AnimatedContainer>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : memberships.length === 0 ? (
        <AnimatedContainer animation="fadeInUp" delay={0.1}>
          <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-12 text-center">
            <FiAward size={48} className="mx-auto text-[#282828] mb-3" />
            <p className="text-[#8A8A8A] text-sm mb-1">No hay membresías{statusFilter ? ' con ese filtro' : ''}</p>
            <p className="text-[12px] text-[#555]">
              {statusFilter ? 'Probá con otro filtro' : 'Creá la primera membresía para un cliente'}
            </p>
          </div>
        </AnimatedContainer>
      ) : (
        <AnimatedContainer animation="fadeInUp" delay={0.1}>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {memberships.map((m) => (
              <div key={m.id} className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FiUser className="text-[#FF5C00] text-sm shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-white truncate">
                        {m.user?.name ?? '—'} {m.user?.lastname ?? ''}
                      </p>
                      {m.user?.email && (
                        <p className="text-[11px] text-[#8A8A8A] truncate">{m.user.email}</p>
                      )}
                    </div>
                  </div>
                  {statusBadge(m.status)}
                </div>
                <div className="flex flex-col gap-1.5 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-[#8A8A8A]">Cupones</span>
                    <span className="text-white font-medium">{m.couponsUsed}<span className="text-[#8A8A8A]"> / {m.couponsTotal}</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8A8A]">Vigencia</span>
                    <span className="text-white flex items-center gap-1">
                      <FiCalendar size={12} className="text-[#FF5C00]" />
                      {formatDate(m.startDate)} - {formatDate(m.endDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8A8A]">Creada</span>
                    <span className="text-white">{formatDate(m.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-[12px] border border-[#282828]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#121212] border-b border-[#282828]">
                  <th className="text-left px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Cliente</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Estado</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Cupones</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Vigencia</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Creada</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => (
                  <tr key={m.id} className="border-b border-[#282828]/50 hover:bg-[#1A1A1A] transition-colors last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FiUser className="text-[#FF5C00] text-sm shrink-0" />
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">
                            {m.user?.name ?? '—'} {m.user?.lastname ?? ''}
                          </p>
                          {m.user?.email && (
                            <p className="text-[11px] text-[#8A8A8A] truncate">{m.user.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{statusBadge(m.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-white font-medium">{m.couponsUsed}</span>
                      <span className="text-[#8A8A8A]"> / {m.couponsTotal}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-[#8A8A8A]">
                        <FiCalendar size={12} />
                        <span>{formatDate(m.startDate)} - {formatDate(m.endDate)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-[#8A8A8A] text-[12px]">
                      {formatDate(m.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedContainer>
      )}

      <CreateMembershipModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
