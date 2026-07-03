import React from 'react';

export type Stats = {
  total: number;
  confirmed: number;
  completed: number;
  cancelled: number;
};

interface StatsCardsProps {
  stats: Stats;
  compact?: boolean;
  onStatusClick?: (status: string) => void;
}

const Card: React.FC<{ label: string; value: number; color: string; compact: boolean; onClick?: () => void }> = ({ label, value, color, compact, onClick }) => {
  const content = (
    <>
      <p className="text-[12px] text-[#8A8A8A] truncate">{label}</p>
      <p className={`mt-1 ${compact ? 'text-[18px]' : 'text-[24px]'} font-bold ${color} truncate`}>{value}</p>
    </>
  );
  if (onClick) {
    return (
      <button onClick={onClick} className={`rounded-[16px] border border-[#282828] bg-[#1A1A1A] ${compact ? 'p-3' : 'p-4'} text-left w-full hover:border-[#FF5C00]/50 transition-colors cursor-pointer`}>
        {content}
      </button>
    );
  }
  return (
    <div className={`rounded-[16px] border border-[#282828] bg-[#1A1A1A] ${compact ? 'p-3' : 'p-4'}`}>
      {content}
    </div>
  );
};

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, compact, onStatusClick }) => {
  const cols = compact ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4';
  return (
    <div className={`mt-6 grid gap-2 sm:gap-3 ${cols}`}>
      <Card label="Total" value={stats.total} color="text-white" compact={compact} onClick={onStatusClick ? () => onStatusClick('') : undefined} />
      <Card label="Confirmados" value={stats.confirmed} color="text-blue-400" compact={compact} onClick={onStatusClick ? () => onStatusClick('Confirmado') : undefined} />
      <Card label="Completados" value={stats.completed} color="text-green-400" compact={compact} onClick={onStatusClick ? () => onStatusClick('Completado') : undefined} />
      <Card label="Cancelados" value={stats.cancelled} color="text-red-400" compact={compact} onClick={onStatusClick ? () => onStatusClick('Cancelado') : undefined} />
    </div>
  );
};
