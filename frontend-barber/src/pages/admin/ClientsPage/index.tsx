import { useMemo, useState } from 'react';
import { FiAward, FiCalendar, FiChevronLeft, FiChevronRight, FiDollarSign, FiInfo, FiSearch, FiTrendingUp, FiUser, FiUserCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { AnimatedContainer } from '../../../components/common';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import { Spinner } from '../../../components/common/Spinner';
import { useGetClientesListQuery } from '../../../services/analyticsApi';
import { formatCurrency } from '../../../utils/formatCurrency';

const PAGE_SIZE = 20;

const kindBadge = (kind: string) => {
  if (kind === 'Registrado') return <span className="text-[11px] font-medium bg-purple-500/10 text-purple-400 rounded-full px-2 py-0.5">Registrado</span>;
  return <span className="text-[11px] font-medium bg-gray-500/10 text-gray-400 rounded-full px-2 py-0.5">Anónimo</span>;
};

export default function ClientsPage() {
  const navigate = useNavigate();
  const [desde, setDesde] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: clientes = [], isLoading, isFetching } = useGetClientesListQuery({ desde, hasta });

  const filtered = useMemo(() => {
    if (!search) return clientes;
    const q = search.toLowerCase();
    return clientes.filter(c =>
      c.clientName.toLowerCase().includes(q) ||
      c.clientLastname.toLowerCase().includes(q) ||
      (c.clientPhone ?? '').includes(q) ||
      (c.clientEmail ?? '').toLowerCase().includes(q)
    );
  }, [clientes, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const stats = useMemo(() => {
    const total = clientes.length;
    const reg = clientes.filter(c => c.kind === 'Registrado').length;
    const anon = total - reg;
    const totalVisits = clientes.reduce((s, c) => s + c.totalVisits, 0);
    const totalSpent = clientes.reduce((s, c) => s + c.totalSpent, 0);
    return { total, reg, anon, totalVisits, totalSpent };
  }, [clientes]);

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FiUserCheck className="text-[#FF5C00]" />
          Clientes
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-[12px] bg-[#121212] border border-[#282828] p-4 flex flex-col gap-1">
          <span className="text-[10px] text-[#6A6A6A] uppercase tracking-wider flex items-center gap-1"><FiUser size={12} /> Total</span>
          <span className="text-2xl font-bold text-white">{stats.total}</span>
        </div>
        <div className="rounded-[12px] bg-[#121212] border border-[#282828] p-4 flex flex-col gap-1">
          <span className="text-[10px] text-[#6A6A6A] uppercase tracking-wider flex items-center gap-1"><FiUserCheck size={12} /> Registrados</span>
          <span className="text-2xl font-bold text-purple-400">{stats.reg}</span>
        </div>
        <div className="rounded-[12px] bg-[#121212] border border-[#282828] p-4 flex flex-col gap-1">
          <span className="text-[10px] text-[#6A6A6A] uppercase tracking-wider flex items-center gap-1"><FiCalendar size={12} /> Reservas</span>
          <span className="text-2xl font-bold text-blue-400">{stats.totalVisits}</span>
        </div>
        <div className="rounded-[12px] bg-[#121212] border border-[#282828] p-4 flex flex-col gap-1">
          <span className="text-[10px] text-[#6A6A6A] uppercase tracking-wider flex items-center gap-1"><FiDollarSign size={12} /> Gastado</span>
          <span className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalSpent)}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1.5">
          <DateRangeFilter onChange={(d, h) => { setDesde(d); setHasta(h); setPage(1); }} skipMountEffect />
          <span
            title="Este rango afecta las estadísticas de reservas y gastado por cliente, no cuáles clientes aparecen en la lista."
            className="text-[#6A6A6A] hover:text-[#8A8A8A] cursor-help shrink-0"
          >
            <FiInfo size={14} />
          </span>
        </div>
        <div className="relative flex-1 max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A6A]" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-[10px] bg-[#1A1A1A] border border-[#282828] pl-10 pr-3 py-2 text-[13px] text-white placeholder-[#6A6A6A] focus:outline-none focus:border-[#FF5C00]/50"
          />
        </div>
        {isFetching && <Spinner size="sm" />}
      </div>

      {isLoading ? (
        <AnimatedContainer animation="fadeInUp" className="rounded-[12px] border border-[#282828] bg-[#121212] p-6">
          <div className="flex flex-col gap-3">
            {[1,2,3,4].map((i) => (
              <div key={i} className="rounded-[10px] border border-[#282828] bg-[#1A1A1A] p-4 animate-pulse" />
            ))}
          </div>
        </AnimatedContainer>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FiUserCheck size={48} className="mx-auto text-[#282828] mb-3" />
          <p className="text-[#8A8A8A] text-sm">{search ? 'No se encontraron clientes con ese criterio.' : 'Todavía no hay clientes dados de alta.'}</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {paged.map((c) => (
              <div
                key={c.key}
                onClick={() => navigate(`/admin/clientes/${c.key}`, { state: { client: c } })}
                className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] font-semibold break-words ${c.membershipStatus === 'active' ? 'text-[#FF5C00]' : 'text-white'}`}>
                      {c.clientName} {c.clientLastname}
                      {c.membershipStatus === 'active' && (
                        <FiAward size={14} className="inline ml-1.5 text-[#FF5C00] align-middle" />
                      )}
                    </p>
                    {c.clientPhone && (
                      <p className="text-[12px] text-[#8A8A8A]">{c.clientPhone}</p>
                    )}
                  </div>
                  {kindBadge(c.kind)}
                </div>
                <div className="flex flex-col gap-1.5 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-[#8A8A8A]">Email</span>
                    <span className="text-white text-right max-w-[60%] truncate">{c.clientEmail ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8A8A]">Alta</span>
                    <span className="text-white">{c.registeredAt.slice(0, 10)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8A8A]">Reservas</span>
                    <span className="flex items-center gap-1">
                      <FiTrendingUp size={12} className={c.totalVisits >= 2 ? 'text-green-400' : 'text-[#8A8A8A]'} />
                      <span className={c.totalVisits >= 2 ? 'text-white font-medium' : 'text-[#8A8A8A]'}>{c.totalVisits}</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8A8A]">Gastado</span>
                    <span className="text-green-400 font-medium">{formatCurrency(c.totalSpent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8A8A]">Primera reserva</span>
                    <span className="text-white">{c.firstVisit ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8A8A]">Última reserva</span>
                    <span className="text-white">{c.lastVisit ?? '—'}</span>
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
                  <th className="text-left px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Teléfono</th>
                  <th className="text-left px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Email</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Tipo</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Alta</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Reservas</th>
                  <th className="text-right px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Gastado</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Primera reserva</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Última reserva</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => (
                  <tr
                    key={c.key}
                    onClick={() => navigate(`/admin/clientes/${c.key}`, { state: { client: c } })}
                    className="border-b border-[#282828]/50 hover:bg-[#1A1A1A] cursor-pointer transition-colors last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <span className={`font-medium ${c.membershipStatus === 'active' ? 'text-[#FF5C00]' : 'text-white'}`}>
                        {c.clientName} {c.clientLastname}
                        {c.membershipStatus === 'active' && (
                          <FiAward size={14} className="inline ml-1.5 text-[#FF5C00] align-middle" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#8A8A8A]">{c.clientPhone ?? '—'}</td>
                    <td className="px-4 py-3 text-[#8A8A8A] max-w-[180px] truncate">{c.clientEmail ?? '—'}</td>
                    <td className="px-4 py-3 text-center">{kindBadge(c.kind)}</td>
                    <td className="px-4 py-3 text-center text-[#8A8A8A] text-[12px]">{c.registeredAt.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="flex items-center justify-center gap-1">
                        <FiTrendingUp size={12} className={c.totalVisits >= 2 ? 'text-green-400' : 'text-[#8A8A8A]'} />
                        <span className={c.totalVisits >= 2 ? 'text-white font-medium' : 'text-[#8A8A8A]'}>{c.totalVisits}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-green-400 font-medium">{formatCurrency(c.totalSpent)}</td>
                    <td className="px-4 py-3 text-center text-[#8A8A8A] text-[12px]">{c.firstVisit ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-[#8A8A8A] text-[12px]">{c.lastVisit ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-[10px] bg-[#1A1A1A] border border-[#282828] px-3 py-2 text-[13px] text-white hover:border-[#FF5C00]/50 transition-colors disabled:opacity-40 disabled:hover:border-[#282828] disabled:cursor-not-allowed"
              >
                <FiChevronLeft size={14} />
                Anterior
              </button>
              <span className="text-[12px] text-[#8A8A8A]">
                Página {page} de {pageCount} · {filtered.length} clientes
              </span>
              <button
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
                className="flex items-center gap-1 rounded-[10px] bg-[#1A1A1A] border border-[#282828] px-3 py-2 text-[13px] text-white hover:border-[#FF5C00]/50 transition-colors disabled:opacity-40 disabled:hover:border-[#282828] disabled:cursor-not-allowed"
              >
                Siguiente
                <FiChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
