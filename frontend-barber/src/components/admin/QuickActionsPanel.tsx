import { useNavigate } from 'react-router-dom';
import { FiPlusCircle, FiAlertTriangle, FiClock, FiArrowRight } from 'react-icons/fi';

interface QuickActionsPanelProps {
  onFilterPending?: () => void;
  onCreateOrder?: () => void;
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({ onFilterPending, onCreateOrder }) => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Crear orden manual',
      description: 'Armar un pedido para un cliente sin pasar por la tienda',
      icon: <FiPlusCircle size={18} />,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      hover: 'hover:bg-green-500/5',
      onClick: () => onCreateOrder?.(),
    },
    {
      label: 'Ver productos sin stock',
      description: 'Gestionar productos que necesitan reposicion',
      icon: <FiAlertTriangle size={18} />,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      hover: 'hover:bg-red-500/5',
      onClick: () => navigate('/admin/productos'),
    },
    {
      label: 'Ver ordenes pendientes',
      description: 'Filtrar ordenes que necesitan atencion',
      icon: <FiClock size={18} />,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      hover: 'hover:bg-yellow-500/5',
      onClick: () => onFilterPending?.(),
    },
  ];

  return (
    <div className="rounded-[16px] border border-[#282828] bg-[#121212] p-4 lg:sticky lg:top-4">
      <p className="text-[11px] text-[#6A6A6A] font-medium uppercase tracking-wider mb-3">Atajos rapidos</p>
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`w-full flex items-center gap-3 p-3 rounded-[10px] text-left transition-all cursor-pointer border border-[#282828] ${action.hover} bg-[#1A1A1A]`}
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] ${action.bg} ${action.color}`}>
              {action.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-white font-medium">{action.label}</p>
              <p className="text-[11px] text-[#6A6A6A] truncate">{action.description}</p>
            </div>
            <FiArrowRight size={14} className="text-[#555] shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsPanel;
