import { useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiDollarSign, FiTrendingUp, FiXCircle, FiCheckCircle, FiClock, FiBarChart2, FiAlertTriangle } from 'react-icons/fi';
import { useGetEcommerceOverviewQuery, useGetProductPerformanceQuery } from '../../../../services/analyticsApi';
import { AnimatedContainer } from '../../../../components/common';
import { Spinner } from '../../../../components/common/Spinner';
import { useGetProductsQuery } from '../../../../services/productApi';
import type { ProductPerformanceEntry } from '../../../../services/analyticsApi';

interface EcommerceTabProps {
  desde: string;
  hasta: string;
}

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('es-UY');
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  disputed: 'En disputa',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#FFC107',
  paid: '#4CAF50',
  delivered: '#2196F3',
  cancelled: '#F44336',
  refunded: '#9C27B0',
  disputed: '#FF9800',
};

function StatusDonut({ ordersByStatus, desde, hasta }: { ordersByStatus: Record<string, number>; desde: string; hasta: string }) {
  const navigate = useNavigate();
  const total = Object.values(ordersByStatus).reduce((s, v) => s + v, 0);
  if (total === 0) return <div className="text-[#8A8A8A] text-[13px] text-center py-8">Sin datos</div>;

  return (
    <div className="flex flex-col gap-2">
      {Object.entries(ordersByStatus).map(([status, count]) => {
        const pct = Math.round((count / total) * 100);
        return (
          <button
            key={status}
            onClick={() => navigate(`/admin/ordenes?dateFrom=${desde}&dateTo=${hasta}&status=${status}`)}
            className="flex items-center gap-3 hover:bg-[#1A1A1A] rounded-lg px-2 py-1.5 -mx-2 transition-colors cursor-pointer text-left"
          >
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[status] || '#888' }} />
            <span className="text-[12px] text-[#8A8A8A] flex-1">{STATUS_LABELS[status] || status}</span>
            <span className="text-[12px] text-white font-medium">{count}</span>
            <div className="w-24 h-2 bg-[#282828] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[status] || '#888' }} />
            </div>
            <span className="text-[11px] text-[#6A6A6A] w-8 text-right">{pct}%</span>
          </button>
        );
      })}
    </div>
  );
}

function ProductBarChart({ products }: { products: ProductPerformanceEntry[] }) {
  if (!products || products.length === 0) return <div className="text-[#8A8A8A] text-[13px] text-center py-8">Sin ventas en este período</div>;

  const maxRevenue = Math.max(...products.map((p) => p.totalRevenue), 1);
  const top = products.slice(0, 10);

  return (
    <div className="flex flex-col gap-2">
      {top.map((p, i) => (
        <div key={p.productId} className="flex items-center gap-3">
          <span className="text-[11px] text-[#6A6A6A] w-5 text-right">{i + 1}</span>
          <span className="text-[12px] text-white flex-1 truncate">{p.name}</span>
          <span className="text-[11px] text-[#8A8A8A] w-8 text-right">{p.totalSold}</span>
          <div className="w-24 h-2 bg-[#282828] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#FF5C00]"
              style={{ width: `${Math.max((p.totalRevenue / maxRevenue) * 100, 2)}%` }}
            />
          </div>
          <span className="text-[11px] text-green-400 font-medium w-16 text-right">{formatCurrency(p.totalRevenue)}</span>
        </div>
      ))}
    </div>
  );
}

export default function EcommerceTab({ desde, hasta }: EcommerceTabProps) {
  const { data: productsData } = useGetProductsQuery({});

  const { data: overview, isLoading: overviewLoading } = useGetEcommerceOverviewQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );
  const { data: products = [], isLoading: productsLoading } = useGetProductPerformanceQuery(
    { desde, hasta },
    { skip: !desde || !hasta },
  );

  const allProducts = productsData?.products ?? [];
  const lowStockProducts = allProducts.filter((p) => p.stock > 0 && p.stock <= (p.minStock || 5));

  if (!desde || !hasta) {
    return <div className="text-[#8A8A8A] text-[14px] text-center py-12">Seleccioná un período para ver las métricas de ecommerce</div>;
  }

  if (overviewLoading || productsLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  const pendingCount = overview?.ordersByStatus?.pending ?? 0;

  const ecomKpis = [
    { label: 'Órdenes totales', value: String(overview?.totalOrders ?? 0), icon: FiShoppingCart, color: '#FF5C00' },
    { label: 'Ingresos', value: formatCurrency(overview?.totalRevenue ?? 0), icon: FiDollarSign, color: '#4CAF50' },
    { label: 'Pagadas', value: String(overview?.paidOrders ?? 0), icon: FiCheckCircle, color: '#4CAF50' },
    { label: 'Canceladas', value: String(overview?.cancelledOrders ?? 0), icon: FiXCircle, color: '#F44336' },
    { label: 'Productos vendidos', value: String(products.reduce((s, p) => s + p.totalSold, 0)), icon: FiTrendingUp, color: '#FF9800' },
    { label: 'Pendientes', value: String(pendingCount), icon: FiClock, color: '#FFC107' },
  ];

  const ordersByStatus = overview?.ordersByStatus ?? {};

  return (
    <div className="flex flex-col gap-5">
      {lowStockProducts.length > 0 && (
        <div className="bg-[#1A1A1A] border border-yellow-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <FiAlertTriangle className="text-yellow-400" size={18} />
            <h3 className="text-white text-[14px] font-bold">Productos con stock bajo</h3>
            <span className="text-[11px] text-[#8A8A8A]">({lowStockProducts.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.slice(0, 10).map((p) => (
              <div key={p.id} className="rounded-[8px] bg-[#121212] px-3 py-1.5 text-[12px] flex items-center gap-2">
                <span className="text-white">{p.name}</span>
                <span className="text-yellow-400 font-medium">{p.stock}/{p.minStock || 5}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {ecomKpis.map((kpi) => (
          <div key={kpi.label} className="bg-[#121212] border border-[#282828] rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[#8A8A8A] text-sm font-medium">{kpi.label}</span>
              <kpi.icon className="text-xl" style={{ color: kpi.color }} />
            </div>
            <span className="text-white text-2xl font-bold">{kpi.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AnimatedContainer animation="fadeInUp" delay={0.1}>
          <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5">
            <h3 className="text-white text-[15px] font-bold mb-4 flex items-center gap-2">
              <FiBarChart2 className="text-[#FF5C00]" />
              Órdenes por estado
            </h3>
            <StatusDonut ordersByStatus={ordersByStatus} desde={desde} hasta={hasta} />
          </div>
        </AnimatedContainer>

        <AnimatedContainer animation="fadeInUp" delay={0.2}>
          <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5">
            <h3 className="text-white text-[15px] font-bold mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-[#FF5C00]" />
              Productos más vendidos
            </h3>
            <ProductBarChart products={products} />
          </div>
        </AnimatedContainer>
      </div>
    </div>
  );
}