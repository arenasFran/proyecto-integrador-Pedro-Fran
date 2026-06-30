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
}

const Card: React.FC<{ label: string; value: number; color: string; compact: boolean }> = ({ label, value, color, compact }) => (
  <div className={`rounded-[16px] border border-[#282828] bg-[#1A1A1A] ${compact ? 'p-3' : 'p-4'}`}>
    <p className="text-[12px] text-[#8A8A8A] truncate">{label}</p>
    <p className={`mt-1 ${compact ? 'text-[18px]' : 'text-[24px]'} font-bold ${color} truncate`}>{value}</p>
  </div>
);

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, compact }) => {
  const cols = compact ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4';
  return (
    <div className={`mt-6 grid gap-2 sm:gap-3 ${cols}`}>
      <Card label="Total" value={stats.total} color="text-white" compact={compact} />
      <Card label="Confirmados" value={stats.confirmed} color="text-blue-400" compact={compact} />
      <Card label="Completados" value={stats.completed} color="text-green-400" compact={compact} />
      <Card label="Cancelados" value={stats.cancelled} color="text-red-400" compact={compact} />
    </div>
  );
};
