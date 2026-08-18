import { useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiClock, FiPackage, FiPlus, FiRefreshCw, FiSearch, FiShoppingBag, FiTruck, FiX, FiXCircle } from 'react-icons/fi';
import type { OrderStatus } from '../../../types/order';
import { Button, Pagination, Spinner, useToast } from '../../../components/common';
import { CreateOrderModal } from '../../../components/admin/CreateOrderModal';
import { useGetAllOrdersQuery, useUpdateOrderStatusMutation, useDeleteOrderMutation } from '../../../services/orderApi';
import { useGetEcommerceOverviewQuery } from '../../../services/analyticsApi';
import { getAccessToken } from '../../../services/api';
import { getTokenKind } from '../../../utils/token';
import OrdersDateFilter from './components/OrdersDateFilter';
import OrdersOrderDetailPanel from './components/OrdersOrderDetailPanel';
import OrdersOrderRow from './components/OrdersOrderRow';
import { STATUS_FILTERS } from './components/ordersConfig';
import AdminPageHeader from '../components/AdminPageHeader';

const KPI_CONFIG: { key: string; label: string; icon: typeof FiPackage; tone: string }[] = [
  { key: 'totalOrders', label: 'Total', icon: FiPackage, tone: 'text-white' },
  { key: 'pending', label: 'Pendientes', icon: FiClock, tone: 'text-yellow-400' },
  { key: 'paid', label: 'Pagadas', icon: FiCheckCircle, tone: 'text-green-400' },
  { key: 'delivered', label: 'Entregadas', icon: FiTruck, tone: 'text-blue-400' },
  { key: 'cancelled', label: 'Canceladas', icon: FiXCircle, tone: 'text-red-400' },
];

type SortOption = 'recent' | 'amount-high' | 'amount-low';

function OrdersListSkeleton() {
  return (
    <div className="divide-y divide-[#202020]" aria-label="Cargando órdenes" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="grid animate-pulse grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 xl:grid-cols-[minmax(175px,1.3fr)_minmax(145px,1fr)_minmax(110px,.9fr)_minmax(120px,.85fr)_auto]">
          <div className="flex gap-2.5"><span className="h-8 w-8 rounded-[9px] bg-[#242424]" /><span className="space-y-2"><span className="block h-3 w-24 rounded bg-[#242424]" /><span className="block h-2.5 w-32 rounded bg-[#1D1D1D]" /></span></div>
          <span className="h-4 w-16 rounded bg-[#242424] xl:hidden" />
          <span className="hidden h-3 w-28 rounded bg-[#1D1D1D] xl:block" /><span className="hidden h-3 w-24 rounded bg-[#1D1D1D] xl:block" /><span className="hidden h-4 w-20 rounded bg-[#242424] xl:block" /><span className="hidden h-4 w-4 rounded bg-[#242424] xl:block" />
        </div>
      ))}
    </div>
  );
}

export const OrdersPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'' | OrderStatus>('');
  const [page, setPage] = useState(1);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('recent');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { showToast } = useToast();
  const canDeleteOrders = getTokenKind(getAccessToken()) === 'Admin';

  const { data, isLoading, isFetching, isError, refetch } = useGetAllOrdersQuery({
    status: statusFilter || undefined,
    page,
    limit: 20,
    desde: desde || undefined,
    hasta: hasta || undefined,
  });
  const { data: overview } = useGetEcommerceOverviewQuery({ desde, hasta }, { skip: !desde || !hasta });
  const [updateStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const [deleteOrder, { isLoading: isDeleting }] = useDeleteOrderMutation();

  const orders = data?.orders ?? [];
  const searchTerm = search.trim().toLocaleLowerCase();
  const visibleOrders = [...orders]
    .filter((order) => {
      if (!searchTerm) return true;
      return [order.id, order.userName, order.clientName, order.userEmail, order.clientEmail, order.paymentMethod]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(searchTerm);
    })
    .sort((a, b) => {
      if (sort === 'amount-high') return b.total - a.total;
      if (sort === 'amount-low') return a.total - b.total;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const hasRefinements = Boolean(searchTerm || statusFilter);

  const getKpiValue = (key: string) => {
    if (overview) return key === 'totalOrders' ? overview.totalOrders : overview.ordersByStatus?.[key] ?? 0;
    return key === 'totalOrders' && !statusFilter ? data?.total ?? null : null;
  };

  const handleDateChange = (nextDesde: string, nextHasta: string) => {
    setDesde(nextDesde);
    setHasta(nextHasta);
    setPage(1);
  };

  const handleStatusFilter = (value: '' | OrderStatus) => {
    setStatusFilter(value);
    setPage(1);
  };

  const clearRefinements = () => {
    setSearch('');
    setStatusFilter('');
    setPage(1);
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      await updateStatus({ id, status }).unwrap();
      const messages: Record<string, string> = { paid: 'marcada como pagada', delivered: 'marcada como entregada', cancelled: 'cancelada' };
      showToast(`Orden ${messages[status] || 'actualizada'} con éxito`);
    } catch {
      showToast('Error al actualizar estado', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteOrder(id).unwrap();
      showToast('Orden eliminada con éxito');
      setSelectedOrderId(null);
    } catch {
      showToast('Error al eliminar orden', 'error');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4">
      <AdminPageHeader
        icon={FiShoppingBag}
        title="Órdenes"
        description="Historial de compras de productos"
        action={<Button size="sm" icon={FiPlus} onClick={() => setCreateModalOpen(true)}>Crear orden</Button>}
      />

      <section className="flex flex-col gap-2.5" aria-label="Herramientas de órdenes">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
          <label className="relative min-w-0 flex-1 xl:max-w-[430px]">
            <span className="sr-only">Buscar por ID o cliente</span>
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6A6A6A]" size={15} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Buscar por ID, cliente o email"
              className="h-9 w-full rounded-[9px] border border-[#282828] bg-[#121212] pl-9 pr-9 text-[12px] text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#FF5C00]/70"
            />
            {search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[#6A6A6A] hover:bg-[#242424] hover:text-white" aria-label="Limpiar búsqueda"><FiX size={13} /></button>}
          </label>
          <div className="flex items-center gap-2">
            <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)} aria-label="Ordenar órdenes" className="h-9 min-w-0 flex-1 rounded-[9px] border border-[#282828] bg-[#121212] px-2.5 text-[11px] text-[#8A8A8A] outline-none transition-colors focus:border-[#FF5C00]/70 sm:flex-none">
              <option value="recent">Más recientes</option>
              <option value="amount-high">Mayor importe</option>
              <option value="amount-low">Menor importe</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-y border-[#202020] py-2 sm:flex-row sm:items-center sm:justify-between">
          <OrdersDateFilter onChange={handleDateChange} defaultPreset="mes" />
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto" role="group" aria-label="Filtrar por estado">
            {STATUS_FILTERS.map(({ value, label, icon: Icon }) => (
              <button key={value || 'all'} type="button" onClick={() => handleStatusFilter(value)} aria-pressed={statusFilter === value} className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 text-[11px] font-medium transition-colors ${statusFilter === value ? 'bg-[#FF5C00]/[0.12] text-[#FF8A4C]' : 'text-[#6A6A6A] hover:bg-[#1A1A1A] hover:text-[#D1D1D1]'}`}>
                <Icon size={12} aria-hidden="true" />{label}
              </button>
            ))}
          </div>
        </div>

        {hasRefinements && <div className="flex items-center gap-2 text-[11px]" aria-live="polite"><span className="text-[#6A6A6A]">Filtros activos</span>{statusFilter && <span className="inline-flex items-center gap-1 rounded-full bg-[#FF5C00]/10 px-2 py-1 text-[#FF8A4C]">{STATUS_FILTERS.find((filter) => filter.value === statusFilter)?.label}<button type="button" onClick={() => handleStatusFilter('')} aria-label="Quitar filtro de estado"><FiX size={11} /></button></span>}{searchTerm && <span className="inline-flex max-w-[210px] items-center gap-1 truncate rounded-full bg-[#242424] px-2 py-1 text-[#BDBDBD]">“{search}”<button type="button" onClick={() => setSearch('')} aria-label="Quitar búsqueda"><FiX size={11} /></button></span>}<button type="button" onClick={clearRefinements} className="ml-auto text-[#8A8A8A] underline-offset-2 hover:text-white hover:underline">Limpiar</button></div>}
      </section>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#202020] pb-2" aria-label="Resumen de órdenes">
        {KPI_CONFIG.map(({ key, label, icon: Icon, tone }) => {
          const value = getKpiValue(key);
          return <div key={key} className="flex min-w-[104px] flex-1 items-center gap-2 border-r border-[#202020] px-3 py-1.5 text-left last:border-r-0"><Icon className={tone} size={14} aria-hidden="true" /><span className="min-w-0"><span className="block text-[16px] font-semibold leading-5 text-white">{value ?? '—'}</span><span className="block truncate text-[10px] text-[#6A6A6A]">{label}</span></span></div>;
        })}
      </div>

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_350px]" aria-label="Listado y detalle de órdenes">
        <div className="min-w-0 overflow-hidden rounded-[14px] border border-[#282828] bg-[#101010]" aria-busy={isFetching}>
          <div className="flex items-center justify-between border-b border-[#282828] px-3 py-2.5 sm:px-4">
            <div><h2 className="text-[12px] font-semibold text-white">Órdenes {data && <span className="font-normal text-[#6A6A6A]">· página {data.page} de {data.totalPages || 1}</span>}</h2></div>
            {isFetching && !isLoading && <span className="flex items-center gap-1.5 text-[10px] text-[#8A8A8A]"><Spinner size="sm" />Actualizando</span>}
          </div>

          {isLoading ? <OrdersListSkeleton /> : isError ? <div className="flex min-h-[210px] flex-col items-center justify-center px-5 text-center"><FiAlertCircle className="mb-2 text-red-400" size={22} /><p className="text-[12px] font-medium text-white">No se pudieron cargar las órdenes</p><p className="mt-1 text-[11px] text-[#6A6A6A]">Revisa la conexión e inténtalo nuevamente.</p><Button size="sm" variant="outline" className="mt-3" onClick={() => void refetch()} icon={FiRefreshCw}>Reintentar</Button></div> : visibleOrders.length === 0 ? <div className="flex min-h-[210px] flex-col items-center justify-center px-5 text-center"><FiShoppingBag className="mb-2 text-[#444]" size={24} />{orders.length > 0 ? <><p className="text-[12px] font-medium text-white">No hay coincidencias en esta página</p><p className="mt-1 text-[11px] text-[#6A6A6A]">Prueba con otro término o limpia la búsqueda.</p><Button size="sm" variant="outline" className="mt-3" onClick={clearRefinements}>Limpiar filtros</Button></> : <><p className="text-[12px] font-medium text-white">{hasRefinements ? 'No hay órdenes con estos filtros' : 'Todavía no hay órdenes'}</p><p className="mt-1 text-[11px] text-[#6A6A6A]">{hasRefinements ? 'Ajusta el estado o el rango para ampliar los resultados.' : 'Las compras de productos aparecerán aquí.'}</p>{!hasRefinements && <Button size="sm" className="mt-3" icon={FiPlus} onClick={() => setCreateModalOpen(true)}>Crear primera orden</Button>}</>}</div> : <>
            <div className="hidden grid-cols-[minmax(175px,1.3fr)_minmax(145px,1fr)_minmax(110px,.9fr)_minmax(120px,.85fr)_auto] gap-x-3 border-b border-[#282828] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#555] xl:grid"><span>Orden</span><span>Cliente</span><span>Compra</span><span>Pago / importe</span><span /></div>
            <div role="listbox" aria-label="Órdenes disponibles">{visibleOrders.map((order) => <OrdersOrderRow key={order.id} order={order} selected={order.id === selectedOrderId} onSelect={setSelectedOrderId} />)}</div>
            {data && data.totalPages > 1 && <div className="border-t border-[#282828] px-3 py-2.5"><Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} /></div>}
          </>}
        </div>
        <OrdersOrderDetailPanel key={selectedOrderId ?? 'empty'} order={selectedOrder} onClose={() => setSelectedOrderId(null)} isUpdating={isUpdating} isDeleting={isDeleting} onStatusChange={handleStatus} onDelete={canDeleteOrders ? handleDelete : undefined} />
      </section>

      {createModalOpen && <CreateOrderModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />}
    </div>
  );
};

export default OrdersPage;
