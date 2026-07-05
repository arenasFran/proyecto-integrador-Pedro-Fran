import { useState, useMemo } from 'react';
import { FiSearch, FiUserCheck, FiUser, FiCalendar, FiDollarSign, FiTrendingUp } from 'react-icons/fi';
import { Spinner } from '../../../components/common/Spinner';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import { useGetClientesListQuery } from '../../../services/analyticsApi';
import { ClientHistoryModal } from '../DashboardPage/components/ClientHistoryModal';
import type { ClienteData } from '../../../types/analytics';

const kindBadge = (kind: string) => {
  if (kind === 'Registrado') return <span className="text-[11px] font-medium bg-purple-500/10 text-purple-400 rounded-full px-2 py-0.5">Registrado</span>;
  return <span className="text-[11px] font-medium bg-gray-500/10 text-gray-400 rounded-full px-2 py-0.5">Anónimo</span>;
};

export default function ClientsPage() {
  const [desde, setDesde] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [historyClient, setHistoryClient] = useState<ClienteData | null>(null);

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
          <span className="text-[10px] text-[#6A6A6A] uppercase tracking-wider flex items-center gap-1"><FiCalendar size={12} /> Visitas</span>
          <span className="text-2xl font-bold text-blue-400">{stats.totalVisits}</span>
        </div>
        <div className="rounded-[12px] bg-[#121212] border border-[#282828] p-4 flex flex-col gap-1">
          <span className="text-[10px] text-[#6A6A6A] uppercase tracking-wider flex items-center gap-1"><FiDollarSign size={12} /> Gastado</span>
          <span className="text-2xl font-bold text-green-400">${stats.totalSpent.toLocaleString('es-UY')}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <DateRangeFilter onChange={(d, h) => { setDesde(d); setHasta(h); }} skipMountEffect />
        <div className="relative flex-1 max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A6A]" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[10px] bg-[#1A1A1A] border border-[#282828] pl-10 pr-3 py-2 text-[13px] text-white placeholder-[#6A6A6A] focus:outline-none focus:border-[#FF5C00]/50"
          />
        </div>
        {isFetching && <Spinner size="sm" />}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FiUserCheck size={48} className="mx-auto text-[#282828] mb-3" />
          <p className="text-[#8A8A8A] text-sm">{search ? 'No se encontraron clientes con ese criterio.' : 'No hay clientes en este período.'}</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((c) => (
              <div
                key={c.key}
                onClick={() => setHistoryClient(c)}
                className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white break-words">
                      {c.clientName} {c.clientLastname}
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
                    <span className="text-[#8A8A8A]">Visitas</span>
                    <span className="flex items-center gap-1">
                      <FiTrendingUp size={12} className={c.totalVisits >= 2 ? 'text-green-400' : 'text-[#8A8A8A]'} />
                      <span className={c.totalVisits >= 2 ? 'text-white font-medium' : 'text-[#8A8A8A]'}>{c.totalVisits}</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8A8A]">Gastado</span>
                    <span className="text-green-400 font-medium">${c.totalSpent.toLocaleString('es-UY')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8A8A]">Primera visita</span>
                    <span className="text-white">{c.firstVisit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A8A8A]">Última visita</span>
                    <span className="text-white">{c.lastVisit}</span>
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
                  <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Visitas</th>
                  <th className="text-right px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Gastado</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Primera visita</th>
                  <th className="text-center px-4 py-3 text-[10px] text-[#6A6A6A] uppercase tracking-wider font-medium">Última visita</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.key}
                    onClick={() => setHistoryClient(c)}
                    className="border-b border-[#282828]/50 hover:bg-[#1A1A1A] cursor-pointer transition-colors last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">{c.clientName} {c.clientLastname}</span>
                    </td>
                    <td className="px-4 py-3 text-[#8A8A8A]">{c.clientPhone ?? '—'}</td>
                    <td className="px-4 py-3 text-[#8A8A8A] max-w-[180px] truncate">{c.clientEmail ?? '—'}</td>
                    <td className="px-4 py-3 text-center">{kindBadge(c.kind)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="flex items-center justify-center gap-1">
                        <FiTrendingUp size={12} className={c.totalVisits >= 2 ? 'text-green-400' : 'text-[#8A8A8A]'} />
                        <span className={c.totalVisits >= 2 ? 'text-white font-medium' : 'text-[#8A8A8A]'}>{c.totalVisits}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-green-400 font-medium">${c.totalSpent.toLocaleString('es-UY')}</td>
                    <td className="px-4 py-3 text-center text-[#8A8A8A] text-[12px]">{c.firstVisit}</td>
                    <td className="px-4 py-3 text-center text-[#8A8A8A] text-[12px]">{c.lastVisit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {historyClient && <ClientHistoryModal isOpen={!!historyClient} onClose={() => setHistoryClient(null)} client={historyClient} />}
    </div>
  );
}
