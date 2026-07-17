import { FiShoppingCart, FiCalendar, FiDollarSign } from 'react-icons/fi';
import { useGetAllOrdersQuery } from '../../../../services/orderApi';
import { useGetAppointmentsQuery } from '../../../../services/appointmentApi';
import { Spinner } from '../../../../components/common/Spinner';

function formatCurrency(value: number): string {
  return '$' + value.toLocaleString('es-UY');
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `hace ${diffD}d`;
}

export default function RecentActivity() {
  const { data: ordersData, isLoading: ordersLoading } = useGetAllOrdersQuery({ limit: 5 });
  const { data: appointmentsData, isLoading: apptsLoading } = useGetAppointmentsQuery(
    { limit: 5 },
  );

  const isLoading = ordersLoading || apptsLoading;

  const orders = ordersData?.orders ?? [];
  const appointments = appointmentsData ?? [];

  if (isLoading) {
    return (
      <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5">
        <h3 className="text-white text-[15px] font-bold mb-4">Actividad reciente</h3>
        <div className="flex justify-center py-6"><Spinner size="md" /></div>
      </div>
    );
  }

  if (orders.length === 0 && appointments.length === 0) {
    return (
      <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5">
        <h3 className="text-white text-[15px] font-bold mb-4">Actividad reciente</h3>
        <p className="text-[#8A8A8A] text-[13px] text-center py-4">Sin actividad reciente</p>
      </div>
    );
  }

  const items: Array<{
    id: string;
    type: 'order' | 'appointment' | 'payment';
    title: string;
    subtitle: string;
    time: string;
    icon: typeof FiShoppingCart;
    color: string;
  }> = [];

  for (const order of orders) {
    items.push({
      id: `order-${order.id}`,
      type: 'order',
      title: `Orden #${order.id.slice(-6)}`,
      subtitle: `${order.items.length} producto(s) - ${formatCurrency(order.total)} - ${order.status}`,
      time: timeAgo(order.createdAt),
      icon: FiShoppingCart,
      color: '#FF5C00',
    });
  }

  for (const apt of appointments) {
    items.push({
      id: `apt-${apt.id}`,
      type: 'appointment',
      title: `${apt.clientName} ${apt.clientLastname ?? ''}`,
      subtitle: `${apt.serviceName} - ${apt.date} ${apt.startTime}`,
      time: timeAgo(apt.createdAt || apt.date),
      icon: FiCalendar,
      color: '#2196F3',
    });
  }

  items.sort((a, b) => {
    const aNum = parseInt(a.time.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.time.replace(/\D/g, '')) || 0;
    return aNum - bNum;
  });

  return (
    <div className="bg-[#121212] border border-[#282828] rounded-2xl p-5">
      <h3 className="text-white text-[15px] font-bold mb-4 flex items-center gap-2">
        <FiDollarSign className="text-[#FF5C00]" />
        Actividad reciente
      </h3>
      <div className="flex flex-col gap-2">
        {items.slice(0, 8).map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-[10px] bg-[#1A1A1A] px-3 py-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#121212] flex items-center justify-center" style={{ color: item.color }}>
              <item.icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-white font-medium truncate">{item.title}</p>
              <p className="text-[11px] text-[#8A8A8A] truncate">{item.subtitle}</p>
            </div>
            <span className="text-[10px] text-[#6A6A6A] shrink-0">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}